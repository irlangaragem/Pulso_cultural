import { Router } from 'express';
import { museumRoutes } from './museum.routes';
import { exhibitionRoutes } from './exhibition.routes';
import { checkinRoutes } from './checkin.routes';
import { authRoutes } from './auth.routes';
import { prisma } from '../lib/prisma';
import { analyticsRoutes } from './analytics.routes';
import { dashboardRoutes } from './dashboard.routes';
import { healthRoutes } from './health.routes';
import { telemetryRoutes } from './telemetry.routes';
import { visitorRoutes } from './visitor.routes';
import { evaluationRoutes } from './evaluation.routes';
import { eventRoutes } from './events.routes';
import { recommendationRoutes } from './recommendation.routes';
import { cameraRoutes } from './camera.routes';

import { authMiddleware } from '../middlewares/auth.middleware';

const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/telemetry', telemetryRoutes);
routes.use('/auth', authRoutes);

// Dedicated visitor registration (v1)
routes.use('/api/v1/users', visitorRoutes);

// Public: Evaluation Service + Analytics Event Tracking + Recommendations
routes.use('/evaluations', evaluationRoutes);
routes.use('/events', eventRoutes);
routes.use('/recommendations', recommendationRoutes);
routes.use('/camera', cameraRoutes);  // contagens de visão computacional

// ── Emergency admin reseed (public but secret-protected) ─────────────────
// POST /admin/reseed { secret: "..." }
// Requires SEED_SECRET env var — no hardcoded fallback for security.
routes.post('/admin/reseed', async (req, res) => {
  const provided = (req.body as any)?.secret || req.query.secret;
  const expected = process.env.SEED_SECRET;

  if (!expected || !provided || provided !== expected) {
    return res.status(403).json({
      error: 'Forbidden'
    });
  }

  try {
    const bcrypt = (await import('bcryptjs')).default;
    const rawPassword = process.env.ADMIN_PASSWORD || 'PUL_$0=CL';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // Try update first (user exists)
    let user;
    try {
      user = await prisma.user.update({
        where: { email: 'admin@mam.ba.gov.br' },
        data: { passwordHash, active: true }
      });
    } catch (updateErr) {
      // User doesn't exist — upsert with museum
      console.warn('[reseed] User update failed, creating new:', (updateErr as Error).message);
      const museum = await prisma.museum.upsert({
        where: { slug: 'mam-bahia' },
        update: {},
        create: {
          name: 'Museu de Arte Moderna da Bahia', slug: 'mam-bahia',
          address: 'Av. Lafayete Coutinho, s/n', city: 'Salvador', state: 'BA',
          openingHours: { tue_sun: '10:00-18:00', mon: 'Closed' }
        }
      });
      user = await prisma.user.create({
        data: {
          email: 'admin@mam.ba.gov.br', passwordHash,
          name: 'Administrador MAM', role: 'GESTOR', museumId: museum.id
        }
      });
    }

    console.log('[reseed] ✅', user.email);
    return res.json({ ok: true, email: user.email });
  } catch (err: any) {
    console.error('[reseed] ❌', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Public / Visitor routes — MUST be registered BEFORE the catch-all '/' route
routes.use('/checkins', checkinRoutes);

// Protected routes (require auth)
routes.use('/analytics', authMiddleware, analyticsRoutes);
routes.use('/museums', authMiddleware, museumRoutes);
routes.use('/exhibitions', authMiddleware, exhibitionRoutes);
// IMPORTANT: '/' catch-all MUST be the LAST route — it matches everything
routes.use('/', authMiddleware, dashboardRoutes);

// TEMP: one-time DB setup — creates pg_stat_statements extension
routes.get('/admin/setup-db', authMiddleware, async (req, res) => {
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`;
    res.json({ ok: true, message: 'Extension pg_stat_statements created (or already exists).' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


export { routes };

