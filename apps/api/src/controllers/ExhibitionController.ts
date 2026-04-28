import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { cache } from '../utils/cache';

const EXHIBITIONS_CACHE_KEY = 'exhibitions:list';
const EXHIBITIONS_TTL = 30_000;

export function invalidateExhibitionsCache(): void {
  (cache as any).cache?.delete?.(EXHIBITIONS_CACHE_KEY);
}

export const ExhibitionController = {
  // GET /exhibitions
  // Returns the full record including works, so the dashboard's Exposição tab
  // can render the form from the list response without a second round-trip
  // to GET /exhibitions/:id. For piloto (1–2 exhibitions × ~6 works each)
  // payload size is negligible (<10KB) and saves a full round-trip of latency.
  // 30s in-memory cache; create/update/delete invalidate immediately.
  async index(_req: Request, res: Response) {
    try {
      const exhibitions = await cache.getOrFetch(EXHIBITIONS_CACHE_KEY, async () => {
        return prisma.exhibition.findMany({
          include: { museum: true, works: { orderBy: { order: 'asc' } } },
          orderBy: { updatedAt: 'desc' },
        });
      }, EXHIBITIONS_TTL);
      return res.json(exhibitions);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // GET /exhibitions/:id
  async show(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const exhibition = await prisma.exhibition.findUnique({
        where: { id },
        include: { 
          museum: true,
          works: true 
        },
      });

      if (!exhibition) {
        return res.status(404).json({ error: 'Exhibition not found' });
      }

      return res.json(exhibition);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // POST /exhibitions
  async create(req: Request, res: Response) {
    const {
      museumId,
      name,
      subtitle,
      description,
      startDate,
      endDate,
      sponsor,
      coverImage,
      audioUrl,
      status,
      otherExhibitions,
    } = req.body;

    try {
      const exhibition = await prisma.exhibition.create({
        data: {
          museumId,
          name,
          subtitle,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          sponsor,
          coverImage,
          audioUrl,
          status,
          otherExhibitions: otherExhibitions ?? undefined,
        },
      });

      invalidateExhibitionsCache();
      return res.status(201).json(exhibition);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // PUT /exhibitions/:id
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const {
      museumId,
      name,
      subtitle,
      description,
      startDate,
      endDate,
      sponsor,
      coverImage,
      audioUrl,
      status,
      otherExhibitions,
    } = req.body;

    try {
      const exhibition = await prisma.exhibition.update({
        where: { id },
        data: {
          museumId,
          name,
          subtitle,
          description,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          sponsor,
          coverImage,
          audioUrl,
          status,
          otherExhibitions: otherExhibitions !== undefined ? otherExhibitions : undefined,
          works: req.body.works ? {
            deleteMany: {},
            create: req.body.works.map((w: any) => ({
              artist: w.artist || w.artista,
              title: w.title || w.titulo,
              year: w.year || w.ano,
              room: w.room || w.sala,
              description: w.description || w.desc,
              audioUrl: w.audioUrl ?? null,
              order: w.order || 0,
            }))
          } : undefined,
        },
      });

      invalidateExhibitionsCache();
      return res.json(exhibition);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // DELETE /exhibitions/:id — cascades through dependent rows manually because
  // the schema doesn't declare ON DELETE CASCADE for these relations.
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    try {
      await prisma.$transaction([
        prisma.work.deleteMany({ where: { exhibitionId: id } }),
        prisma.evaluation.deleteMany({ where: { exhibitionId: id } }),
        prisma.checkin.deleteMany({ where: { exhibitionId: id } }),
        prisma.cameraCount.deleteMany({ where: { exhibitionId: id } }),
        prisma.exhibition.delete({ where: { id } }),
      ]);
      invalidateExhibitionsCache();
      return res.status(204).send();
    } catch (error: any) {
      console.error('[ExhibitionController.delete] error:', error);
      const msg = error?.code === 'P2003'
        ? 'Esta exposição tem registros vinculados que não puderam ser removidos.'
        : (error?.message || 'Erro ao apagar exposição');
      return res.status(500).json({ error: msg });
    }
  },
};
