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

// ── Emergency admin reseed (public but SEED_SECRET protected) ───────────
// POST /admin/reseed { secret: "<SEED_SECRET env var>" }
// Resets admin@mam.ba.gov.br password to ADMIN_PASSWORD (or default).
// Remove SEED_SECRET from Railway env vars after use to disable.
routes.post('/admin/reseed', async (req, res) => {
  const expectedSecret = process.env.SEED_SECRET;
  if (!expectedSecret || (req.body as any)?.secret !== expectedSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const rawPassword = process.env.ADMIN_PASSWORD || 'PUL_$0=CL';
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const user = await prisma.user.update({
      where: { email: 'admin@mam.ba.gov.br' },
      data: { passwordHash, active: true }
    });
    console.log('[reseed] ✅ Admin password reset —', user.email);
    return res.json({ ok: true, email: user.email, message: 'Password reset successfully.' });
  } catch (err: any) {
    console.error('[reseed] ❌', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Protected routes
routes.use('/analytics', authMiddleware, analyticsRoutes);
routes.use('/museums', authMiddleware, museumRoutes);
routes.use('/exhibitions', authMiddleware, exhibitionRoutes);
routes.use('/', authMiddleware, dashboardRoutes);

// Public / Visitor routes
routes.use('/checkins', checkinRoutes);

// TEMP: one-time DB setup — creates pg_stat_statements extension
routes.get('/admin/setup-db', authMiddleware, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
    res.json({ ok: true, message: 'Extension pg_stat_statements created (or already exists).' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


export { routes };

