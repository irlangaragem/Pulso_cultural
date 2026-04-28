import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { InviteService } from '../services/InviteService';
import { EmailService } from '../services/EmailService';

/**
 * Manage users (gestores) inside the same museum as the authenticated user.
 * Multi-tenant: list/create/update/delete are scoped by `req.user.museumId`.
 *
 * New flow: user creation does NOT take a password. The user gets an invite
 * email with a link; the recipient sets the password via /aceitar-convite.
 */

const INVITE_TTL_DAYS = 7;

function museumIdFromReq(req: Request): string | undefined {
  return (req as any).user?.museumId;
}

function authedUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}

function buildInviteUrl(token: string): string {
  const base = process.env.WEB_URL || 'http://localhost:5174';
  return `${base.replace(/\/$/, '')}/aceitar-convite?token=${token}`;
}

function inviteStatusFor(userId: string, hasPassword: boolean): {
  status: 'ATIVO' | 'INATIVO' | 'CONVITE_PENDENTE' | 'CONVITE_EXPIRADO';
  invite?: { expiresAt: string; expiresInDays: number };
} {
  if (hasPassword) return { status: 'ATIVO' };
  const inv = InviteService.getForUser(userId);
  if (!inv) return { status: 'CONVITE_EXPIRADO' };
  const ms = inv.expiresAt.getTime() - Date.now();
  return {
    status: 'CONVITE_PENDENTE',
    invite: {
      expiresAt: inv.expiresAt.toISOString(),
      expiresInDays: Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000))),
    },
  };
}

export const UserController = {
  async list(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });
    try {
      const users = await prisma.user.findMany({
        where: { museumId },
        select: {
          id: true, email: true, name: true, role: true, active: true,
          passwordHash: true, // needed to compute pending vs active status (not returned)
          createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      // Strip passwordHash before returning, but use it to compute status.
      const enriched = users.map(u => {
        const isPending = InviteService.isPendingHash(u.passwordHash);
        const { passwordHash: _, ...rest } = u;
        return {
          ...rest,
          ...inviteStatusFor(u.id, !isPending && u.active),
        };
      });
      return res.json(enriched);
    } catch (err) {
      console.error('[UserController.list] error:', err);
      return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  },

  /**
   * Create a new gestor with PENDING status. Sends invite email or returns the
   * link in the response when SMTP is not configured.
   *
   * Body: { email, name, role? }
   */
  async create(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });

    const { email, name, role } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: 'email e name são obrigatórios' });
    }
    const allowedRoles = ['ADMIN', 'GESTOR'] as const;
    const safeRole: 'ADMIN' | 'GESTOR' = allowedRoles.includes(role) ? role : 'GESTOR';

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

      const placeholder = InviteService.pendingHashPlaceholder();
      const user = await prisma.user.create({
        data: {
          email, name,
          passwordHash: placeholder,
          role: safeRole,
          museumId,
          active: true, // active=true so login can flip it on accept; pending state is inferred from placeholder hash
        },
        select: { id: true, email: true, name: true, role: true, museumId: true },
      });

      const { token, expiresAt } = InviteService.create(user.id, user.email);
      const inviteUrl = buildInviteUrl(token);

      const inviter = await prisma.user.findUnique({
        where: { id: authedUserId(req) },
        select: { name: true },
      });
      const museum = await prisma.museum.findUnique({
        where: { id: museumId },
        select: { name: true },
      });

      const sent = await EmailService.sendInvite({
        to: user.email,
        toName: user.name,
        inviteUrl,
        museumName: museum?.name || 'Pulso Cultural',
        inviterName: inviter?.name,
        expiresInDays: INVITE_TTL_DAYS,
      });

      return res.status(201).json({
        ...user,
        status: 'CONVITE_PENDENTE',
        invite: {
          expiresAt: expiresAt.toISOString(),
          expiresInDays: INVITE_TTL_DAYS,
          // Always return URL so the admin can copy it as a fallback (or share it manually).
          url: inviteUrl,
          emailSent: sent,
        },
      });
    } catch (err) {
      console.error('[UserController.create] error:', err);
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  },

  /** PUT /users/:id — update name, role, active flag. Cannot change email or password. */
  async update(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });

    const { id } = req.params;
    const { name, role, active } = req.body || {};

    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.museumId !== museumId) {
        return res.status(404).json({ error: 'Usuário não encontrado neste museu' });
      }

      const allowedRoles = ['ADMIN', 'GESTOR'] as const;
      const data: any = {};
      if (typeof name === 'string' && name.trim()) data.name = name.trim();
      if (allowedRoles.includes(role)) data.role = role;
      if (typeof active === 'boolean') data.active = active;

      const updated = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, email: true, name: true, role: true, active: true, updatedAt: true },
      });
      return res.json(updated);
    } catch (err) {
      console.error('[UserController.update] error:', err);
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  },

  /**
   * POST /users/:id/resend-invite — generate a fresh token and resend email.
   * Only works for users in PENDING state (placeholder hash).
   */
  async resendInvite(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });

    const { id } = req.params;
    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.museumId !== museumId) {
        return res.status(404).json({ error: 'Usuário não encontrado neste museu' });
      }
      if (!InviteService.isPendingHash(target.passwordHash)) {
        return res.status(400).json({ error: 'Usuário já ativou a conta. Use redefinir senha em vez disso.' });
      }

      const { token, expiresAt } = InviteService.create(target.id, target.email);
      const inviteUrl = buildInviteUrl(token);

      const inviter = await prisma.user.findUnique({
        where: { id: authedUserId(req) },
        select: { name: true },
      });
      const museum = await prisma.museum.findUnique({
        where: { id: museumId },
        select: { name: true },
      });

      const sent = await EmailService.sendInvite({
        to: target.email,
        toName: target.name,
        inviteUrl,
        museumName: museum?.name || 'Pulso Cultural',
        inviterName: inviter?.name,
        expiresInDays: INVITE_TTL_DAYS,
      });

      return res.json({
        ok: true,
        invite: {
          expiresAt: expiresAt.toISOString(),
          expiresInDays: INVITE_TTL_DAYS,
          url: inviteUrl,
          emailSent: sent,
        },
      });
    } catch (err) {
      console.error('[UserController.resendInvite] error:', err);
      return res.status(500).json({ error: 'Erro ao reenviar convite' });
    }
  },

  /**
   * POST /users/:id/revoke-invite — invalidate the pending token.
   * The user remains in pending state; admin can resend later.
   */
  async revokeInvite(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });

    const { id } = req.params;
    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.museumId !== museumId) {
        return res.status(404).json({ error: 'Usuário não encontrado neste museu' });
      }
      InviteService.revoke(target.id);
      return res.json({ ok: true });
    } catch (err) {
      console.error('[UserController.revokeInvite] error:', err);
      return res.status(500).json({ error: 'Erro ao revogar convite' });
    }
  },

  /** Reset password for an already-active user (not pending). */
  async resetPassword(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    const me = authedUserId(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });

    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (id === me) {
      return res.status(400).json({ error: 'Use /auth/change-password para mudar sua própria senha' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword precisa ter ao menos 8 caracteres' });
    }

    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.museumId !== museumId) {
        return res.status(404).json({ error: 'Usuário não encontrado neste museu' });
      }
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id }, data: { passwordHash } });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[UserController.resetPassword] error:', err);
      return res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  },

  async deactivate(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    const me = authedUserId(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });

    const { id } = req.params;
    if (id === me) {
      return res.status(400).json({ error: 'Você não pode desativar o próprio usuário' });
    }

    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.museumId !== museumId) {
        return res.status(404).json({ error: 'Usuário não encontrado neste museu' });
      }
      const remaining = await prisma.user.count({
        where: { museumId, active: true, id: { not: id } },
      });
      if (remaining < 1) {
        return res.status(400).json({ error: 'Não é possível desativar o último gestor ativo do museu' });
      }
      const updated = await prisma.user.update({
        where: { id },
        data: { active: false },
        select: { id: true, email: true, active: true },
      });
      InviteService.revoke(id);
      return res.json(updated);
    } catch (err) {
      console.error('[UserController.deactivate] error:', err);
      return res.status(500).json({ error: 'Erro ao desativar usuário' });
    }
  },

  /**
   * DELETE /users/:id/permanent — hard delete: removes the user row entirely.
   * Same multi-tenant guards apply. Refuses to delete the only active gestor
   * (locking guard) and refuses self-delete.
   */
  async hardDelete(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    const me = authedUserId(req);
    if (!museumId) return res.status(403).json({ error: 'Sem museu associado' });

    const { id } = req.params;
    if (id === me) {
      return res.status(400).json({ error: 'Você não pode excluir o próprio usuário' });
    }

    try {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target || target.museumId !== museumId) {
        return res.status(404).json({ error: 'Usuário não encontrado neste museu' });
      }
      const remaining = await prisma.user.count({
        where: { museumId, active: true, id: { not: id } },
      });
      if (target.active && remaining < 1) {
        return res.status(400).json({ error: 'Não é possível excluir o último gestor ativo do museu' });
      }
      InviteService.revoke(id);
      await prisma.user.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[UserController.hardDelete] error:', err);
      return res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  },
};
