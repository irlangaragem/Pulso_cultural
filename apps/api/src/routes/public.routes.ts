import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

/**
 * Public routes consumed by the visitor-facing app (no JWT).
 * Returns only data the museum has published.
 */
export const publicRoutes = Router();

/**
 * GET /api/v1/public/exhibitions/:id
 * Returns a specific exhibition by id (public, no JWT). Used by the dashboard's
 * preview iframe to show whichever exhibition the manager has selected, even
 * when it isn't the ACTIVE one yet.
 */
publicRoutes.get('/exhibitions/by-id/:id', async (req, res) => {
  try {
    const exhibition = await prisma.exhibition.findUnique({
      where: { id: req.params.id },
      include: { works: { orderBy: { order: 'asc' } } },
    });
    if (!exhibition) return res.status(404).json({ error: 'Exhibition not found' });
    return res.json({
      id: exhibition.id,
      name: exhibition.name,
      subtitle: exhibition.subtitle,
      description: exhibition.description,
      startDate: exhibition.startDate,
      endDate: exhibition.endDate,
      coverImage: exhibition.coverImage,
      audioUrl: exhibition.audioUrl,
      works: exhibition.works.map(w => ({
        id: w.id,
        title: w.title,
        artist: w.artist,
        year: w.year,
        room: w.room,
        description: w.description,
        audioUrl: w.audioUrl,
        order: w.order,
      })),
    });
  } catch (err) {
    console.error('[public.exhibitions.byId] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/public/exhibitions/active?museumSlug=mam-bahia
 * Returns the active exhibition for the given museum, including its works.
 * Falls back to env.PILOT_MUSEUM_SLUG when no slug is provided.
 */
publicRoutes.get('/exhibitions/active', async (req, res) => {
  const slug = (req.query.museumSlug as string | undefined) || env.PILOT_MUSEUM_SLUG;
  try {
    const museum = await prisma.museum.findUnique({ where: { slug } });
    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }
    // Prefer ACTIVE; fall back to the most recently updated exhibition so the
    // visitor app keeps working during piloto when the manager hasn't flipped
    // the status to ACTIVE yet.
    const exhibition =
      (await prisma.exhibition.findFirst({
        where: { museumId: museum.id, status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
        include: { works: { orderBy: { order: 'asc' } } },
      }))
      ?? (await prisma.exhibition.findFirst({
        where: { museumId: museum.id },
        orderBy: { updatedAt: 'desc' },
        include: { works: { orderBy: { order: 'asc' } } },
      }));
    if (!exhibition) {
      return res.status(404).json({ error: 'No exhibition for this museum' });
    }
    return res.json({
      id: exhibition.id,
      name: exhibition.name,
      subtitle: exhibition.subtitle,
      description: exhibition.description,
      startDate: exhibition.startDate,
      endDate: exhibition.endDate,
      coverImage: exhibition.coverImage,
      audioUrl: exhibition.audioUrl,
      works: exhibition.works.map(w => ({
        id: w.id,
        title: w.title,
        artist: w.artist,
        year: w.year,
        room: w.room,
        description: w.description,
        audioUrl: w.audioUrl,
        order: w.order,
      })),
    });
  } catch (err) {
    console.error('[public.exhibitions.active] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
