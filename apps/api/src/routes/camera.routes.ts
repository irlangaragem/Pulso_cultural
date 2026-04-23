// =============================================================
// camera.routes.ts — Endpoints para contagens de câmera
// POST /camera/counts   — módulo Python envia contagens
// GET  /camera/counts/live — dashboard consulta totais
// Autenticação via X-Camera-Key (campo apiKey na tabela Camera)
// LGPD: aceita apenas números agregados, nunca frames/imagens
// =============================================================

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// ── Middleware: autentica câmera pelo header X-Camera-Key ─────
async function cameraAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-camera-key'] as string | undefined;
  if (!key) return res.status(401).json({ error: 'X-Camera-Key obrigatório' });

  const camera = await prisma.camera.findFirst({ where: { apiKey: key, active: true } });
  if (!camera)  return res.status(403).json({ error: 'Câmera não autorizada ou inativa' });

  (req as any).camera = camera;
  next();
}

// ── Schema ────────────────────────────────────────────────────
const CountBody = z.object({
  exhibitionId: z.string().optional().nullable(),
  entries:      z.number().int().min(0),
  exits:        z.number().int().min(0),
  timestamp:    z.string().datetime().optional(),
});

// ── POST /camera/counts ───────────────────────────────────────
router.post('/counts', cameraAuth, async (req: Request, res: Response) => {
  const parse = CountBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { entries, exits, exhibitionId, timestamp } = parse.data;
  const camera = (req as any).camera;
  const ts     = timestamp ? new Date(timestamp) : new Date();

  try {
    // Insere dois registros de lote: um ENTRADA, um SAIDA
    await prisma.$transaction([
      ...(entries > 0
        ? [prisma.cameraCount.create({
            data: { cameraId: camera.id, exhibitionId: exhibitionId ?? null,
                    type: 'ENTRADA', count: entries, timestamp: ts }
          })]
        : []),
      ...(exits > 0
        ? [prisma.cameraCount.create({
            data: { cameraId: camera.id, exhibitionId: exhibitionId ?? null,
                    type: 'SAIDA', count: exits, timestamp: ts }
          })]
        : []),
    ]);

    console.log(`[camera] ✅ ${camera.name}: +${entries} entradas, -${exits} saídas`);
    return res.json({ ok: true, entries, exits, timestamp: ts.toISOString() });
  } catch (err: any) {
    console.error('[camera/counts]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /camera/counts/live?museumId=...&hours=8 ──────────────
// Usado pelo dashboard para mostrar o total do dia via câmera.
router.get('/counts/live', async (req: Request, res: Response) => {
  const museumId    = req.query.museumId    as string | undefined;
  const exhibitionId = req.query.exhibitionId as string | undefined;
  const hours       = parseInt(req.query.hours as string || '8', 10);

  if (!museumId) return res.status(400).json({ error: 'museumId obrigatório' });

  const since = new Date(Date.now() - hours * 3600_000);

  try {
    const rows = await prisma.cameraCount.groupBy({
      by: ['type'],
      where: {
        timestamp:   { gte: since },
        camera:      { museumId },
        ...(exhibitionId ? { exhibitionId } : {}),
      },
      _sum: { count: true },
    });

    const result: Record<string, number> = { entries: 0, exits: 0 };
    for (const row of rows) {
      if (row.type === 'ENTRADA') result.entries = row._sum.count ?? 0;
      if (row.type === 'SAIDA')   result.exits   = row._sum.count ?? 0;
    }

    return res.json({ ...result, since: since.toISOString(), hours });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export { router as cameraRoutes };
