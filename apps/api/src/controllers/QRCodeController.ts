import { Request, Response } from 'express';
import { QRCodeService } from '../services/QRCodeService';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

// Simple in-memory token store (use Redis in production)
const downloadTokens = new Map<string, { qrcodeId: string; expiresAt: number }>();

export const QRCodeController = {

  // POST /qrcode/generate
  async generate(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.museumId) {
        return res.status(401).json({ error: 'Usuário sem museu associado' });
      }

      const { destinationUrl, exhibitionId, label, expiresAt } = req.body;

      const validation = QRCodeService.validateDestination(destinationUrl);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.reason });
      }

      const qr = await QRCodeService.create({
        museumId: user.museumId,
        exhibitionId: exhibitionId || undefined,
        destinationUrl,
        label,
        generatedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      // Generate preview data URL for immediate client response
      const previewDataUrl = await QRCodeService.generateDataUrl(qr.destinationUrl);

      return res.status(201).json({ ...qr, previewDataUrl });
    } catch (err: any) {
      console.error('[QRCode] generate error:', err.message);
      return res.status(500).json({ error: err.message || 'Erro ao gerar QR Code' });
    }
  },

  // GET /qrcode/active
  async getActive(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.museumId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const qr = await QRCodeService.getActive(user.museumId);
      if (!qr) {
        return res.status(404).json({ error: 'Nenhum QR Code ativo encontrado' });
      }

      const previewDataUrl = await QRCodeService.generateDataUrl(qr.destinationUrl);
      return res.json({ ...qr, previewDataUrl });
    } catch (err: any) {
      console.error('[QRCode] getActive error:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar QR Code ativo' });
    }
  },

  // GET /qrcode/history?page=1&perPage=20
  async getHistory(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.museumId) return res.status(401).json({ error: 'Não autorizado' });

      const page = parseInt(req.query.page as string) || 1;
      const perPage = Math.min(parseInt(req.query.perPage as string) || 20, 100);

      const result = await QRCodeService.getHistory(user.museumId, page, perPage);
      return res.json(result);
    } catch (err: any) {
      console.error('[QRCode] getHistory error:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  },

  // GET /qrcode/:id/token  → gera token efêmero (24h) para download
  async getDownloadToken(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const qr = await prisma.qRCode.findFirst({
        where: { id, museumId: user?.museumId },
      });
      if (!qr) return res.status(404).json({ error: 'QR Code não encontrado' });

      const token = crypto.randomBytes(24).toString('hex');
      downloadTokens.set(token, {
        qrcodeId: id,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      // Log download event
      await prisma.qRCodeEvent.create({
        data: { qrcodeId: id, type: 'DOWNLOADED', metadata: { by: user?.id } },
      });

      return res.json({ token, expiresIn: '24h' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // GET /qrcode/:id/image.png?token=xxx
  async getImage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const token = req.query.token as string;

      // Validate ephemeral token
      if (token) {
        const entry = downloadTokens.get(token);
        if (!entry || entry.qrcodeId !== id || entry.expiresAt < Date.now()) {
          downloadTokens.delete(token);
          return res.status(403).json({ error: 'Token inválido ou expirado' });
        }
        downloadTokens.delete(token); // one-time use
      }

      const qr = await prisma.qRCode.findUnique({ where: { id } });
      if (!qr) return res.status(404).json({ error: 'QR Code não encontrado' });

      const buffer = await QRCodeService.generateImage(qr.destinationUrl);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="qrcode-${id.slice(0, 8)}.png"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(buffer);
    } catch (err: any) {
      console.error('[QRCode] getImage error:', err.message);
      return res.status(500).json({ error: 'Erro ao gerar imagem' });
    }
  },

  // PATCH /qrcode/:id/revoke
  async revoke(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const qr = await QRCodeService.revoke(id, user.museumId, user.id);
      return res.json(qr);
    } catch (err: any) {
      console.error('[QRCode] revoke error:', err.message);
      return res.status(500).json({ error: err.message || 'Erro ao revogar QR Code' });
    }
  },

  // PATCH /qrcode/:id/reactivate
  async reactivate(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const qr = await QRCodeService.reactivate(id, user.museumId, user.id);
      const previewDataUrl = await QRCodeService.generateDataUrl(qr.destinationUrl);
      return res.json({ ...qr, previewDataUrl });
    } catch (err: any) {
      console.error('[QRCode] reactivate error:', err.message);
      return res.status(500).json({ error: err.message || 'Erro ao reativar QR Code' });
    }
  },
};
