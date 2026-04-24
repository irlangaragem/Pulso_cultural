import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';

// ── Allowlist de domínios permitidos para QR ──────────────────────────────
const ALLOWED_DOMAINS = [
  'pulso-web-production.up.railway.app',
  'pulso-web.railway.app',
  'localhost',
  '127.0.0.1',
];

export interface GenerateQRInput {
  museumId: string;
  exhibitionId?: string;
  destinationUrl: string;
  label?: string;
  generatedBy: string;
  expiresAt?: Date;
}

export const QRCodeService = {

  // ── Validação de URL ────────────────────────────────────────────────────
  validateDestination(url: string): { valid: boolean; reason?: string } {
    if (!url || url.trim() === '') {
      return { valid: false, reason: 'URL não pode ser vazia' };
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return { valid: false, reason: 'URL malformada' };
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return { valid: false, reason: `Protocolo '${parsed.protocol}' não permitido` };
    }

    const allowed = ALLOWED_DOMAINS.some(
      d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    );
    if (!allowed) {
      return {
        valid: false,
        reason: `Domínio '${parsed.hostname}' não está na allowlist autorizada`,
      };
    }

    return { valid: true };
  },

  // ── Gerar imagem PNG do QR em buffer ───────────────────────────────────
  async generateImage(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',  // sempre preto para impressão
        light: '#FFFFFF', // sempre branco
      },
      errorCorrectionLevel: 'H',
    });
  },

  // ── Gerar Data URL (base64) para preview inline ────────────────────────
  async generateDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });
  },

  // ── Criar novo QR (revoga anteriores em transação atômica) ────────────
  async create(input: GenerateQRInput) {
    const validation = QRCodeService.validateDestination(input.destinationUrl);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    return prisma.$transaction(async (tx) => {
      // Revogar todos os QRs ativos deste museu
      const previousActive = await tx.qRCode.findMany({
        where: { museumId: input.museumId, isActive: true },
        select: { id: true },
      });

      if (previousActive.length > 0) {
        await tx.qRCode.updateMany({
          where: { museumId: input.museumId, isActive: true },
          data: { isActive: false, revokedAt: new Date() },
        });

        await tx.qRCodeEvent.createMany({
          data: previousActive.map(qr => ({
            qrcodeId: qr.id,
            type: 'REVOKED' as const,
            metadata: { reason: 'superseded_by_new_generation', by: input.generatedBy },
          })),
        });
      }

      // Criar novo QR
      const qr = await tx.qRCode.create({
        data: {
          museumId: input.museumId,
          exhibitionId: input.exhibitionId ?? null,
          destinationUrl: input.destinationUrl.trim(),
          label: input.label ?? null,
          generatedBy: input.generatedBy,
          isActive: true,
          isDraft: false,
          expiresAt: input.expiresAt ?? null,
        },
        include: { user: { select: { name: true, email: true } } },
      });

      await tx.qRCodeEvent.create({
        data: {
          qrcodeId: qr.id,
          type: 'GENERATED',
          metadata: { userId: input.generatedBy, url: encodeURIComponent(input.destinationUrl) },
        },
      });

      return qr;
    });
  },

  // ── Buscar QR ativo do museu ───────────────────────────────────────────
  async getActive(museumId: string) {
    return prisma.qRCode.findFirst({
      where: { museumId, isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  // ── Histórico paginado ─────────────────────────────────────────────────
  async getHistory(museumId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      prisma.qRCode.findMany({
        where: { museumId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.qRCode.count({ where: { museumId } }),
    ]);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  },

  // ── Revogar ────────────────────────────────────────────────────────────
  async revoke(id: string, museumId: string, byUserId: string) {
    const qr = await prisma.qRCode.findFirst({ where: { id, museumId } });
    if (!qr) throw new Error('QR Code não encontrado');

    const updated = await prisma.qRCode.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });

    await prisma.qRCodeEvent.create({
      data: {
        qrcodeId: id,
        type: 'REVOKED',
        metadata: { by: byUserId },
      },
    });

    return updated;
  },

  // ── Reativar ───────────────────────────────────────────────────────────
  async reactivate(id: string, museumId: string, byUserId: string) {
    const qr = await prisma.qRCode.findFirst({ where: { id, museumId } });
    if (!qr) throw new Error('QR Code não encontrado');

    // Revogar outros ativos primeiro
    await prisma.qRCode.updateMany({
      where: { museumId, isActive: true, id: { not: id } },
      data: { isActive: false, revokedAt: new Date() },
    });

    const updated = await prisma.qRCode.update({
      where: { id },
      data: { isActive: true, revokedAt: null },
    });

    await prisma.qRCodeEvent.create({
      data: {
        qrcodeId: id,
        type: 'REACTIVATED',
        metadata: { by: byUserId },
      },
    });

    return updated;
  },

  // ── Auto-revogação ao encerrar exposição ───────────────────────────────
  async revokeByExhibition(exhibitionId: string, reason = 'exhibition_ended') {
    const active = await prisma.qRCode.findMany({
      where: { exhibitionId, isActive: true },
      select: { id: true },
    });

    if (active.length === 0) return;

    await prisma.qRCode.updateMany({
      where: { exhibitionId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    await prisma.qRCodeEvent.createMany({
      data: active.map(qr => ({
        qrcodeId: qr.id,
        type: 'EXPIRED' as const,
        metadata: { reason, exhibitionId },
      })),
    });
  },
};
