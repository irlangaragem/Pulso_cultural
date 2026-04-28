import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const ExhibitionController = {
  // GET /exhibitions
  async index(req: Request, res: Response) {
    try {
      const exhibitions = await prisma.exhibition.findMany({
        include: { museum: true },
      });
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
          status,
          otherExhibitions: otherExhibitions ?? undefined,
        },
      });

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
