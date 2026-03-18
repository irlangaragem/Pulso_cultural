import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const MuseumController = {
  // GET /museums
  async index(req: Request, res: Response) {
    try {
      const museums = await prisma.museum.findMany();
      return res.json(museums);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // GET /museums/:id
  async show(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const museum = await prisma.museum.findUnique({
        where: { id },
      });

      if (!museum) {
        return res.status(404).json({ error: 'Museum not found' });
      }

      return res.json(museum);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // POST /museums
  async create(req: Request, res: Response) {
    const { name, slug, address, city, state, openingHours } = req.body;

    try {
      const museum = await prisma.museum.create({
        data: {
          name,
          slug,
          address,
          city,
          state,
          openingHours,
        },
      });

      return res.status(201).json(museum);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // PUT /museums/:id
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, slug, address, city, state, openingHours } = req.body;

    try {
      const museum = await prisma.museum.update({
        where: { id },
        data: {
          name,
          slug,
          address,
          city,
          state,
          openingHours,
        },
      });

      return res.json(museum);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // DELETE /museums/:id
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    try {
      await prisma.museum.delete({
        where: { id },
      });

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
