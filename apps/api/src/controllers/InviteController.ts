import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { InviteService } from '../services/InviteService';
import { env } from '../config/env';

/**
 * Public invite endpoints — no JWT required.
 * Pair with /users/:id/resend-invite (auth) on the admin side.
 */
export const InviteController = {
  /**
   * GET /invites/info?token=xxx
   * Returns metadata needed to render the accept page (recipient name, email,
   * museum name, expiry). Returns 404 if token is invalid/expired.
   */
  async info(req: Request, res: Response) {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ error: 'token ausente' });

    const rec = InviteService.resolve(token);
    if (!rec) return res.status(404).json({ error: 'Convite inválido ou expirado' });

    try {
      const user = await prisma.user.findUnique({
        where: { id: rec.userId },
        select: {
          id: true, email: true, name: true,
          museum: { select: { name: true, slug: true } },
        },
      });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      return res.json({
        email: user.email,
        name: user.name,
        museumName: user.museum?.name,
        museumSlug: user.museum?.slug,
        expiresAt: rec.expiresAt,
      });
    } catch (err) {
      console.error('[InviteController.info] error:', err);
      return res.status(500).json({ error: 'Erro ao validar convite' });
    }
  },

  /**
   * POST /invites/accept
   * Body: { token, password }
   * Sets the password, marks user as active, returns a fresh login token so
   * the user lands authenticated on the dashboard.
   */
  async accept(req: Request, res: Response) {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'token e password são obrigatórios' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Senha precisa ter ao menos 8 caracteres' });
    }
    if (!/[a-zA-Z]/.test(password) || !/[\d!@#$%^&*()_+\-=[\]{};:'",.<>?\/\\|`~]/.test(password)) {
      return res.status(400).json({ error: 'Senha precisa ter ao menos uma letra e um número (ou símbolo)' });
    }

    const rec = InviteService.resolve(token);
    if (!rec) return res.status(404).json({ error: 'Convite inválido ou expirado' });

    try {
      const user = await prisma.user.findUnique({ where: { id: rec.userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      const passwordHash = await bcrypt.hash(password, 12);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, active: true },
        select: { id: true, email: true, name: true, role: true, museumId: true },
      });

      InviteService.consume(token);

      const jwtToken = jwt.sign(
        { id: updated.id, role: updated.role, email: updated.email, museumId: updated.museumId },
        env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      return res.json({ user: updated, token: jwtToken });
    } catch (err) {
      console.error('[InviteController.accept] error:', err);
      return res.status(500).json({ error: 'Erro ao aceitar convite' });
    }
  },
};
