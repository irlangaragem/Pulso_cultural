import { Router } from 'express';
import { museumRoutes } from './museum.routes';
import { exhibitionRoutes } from './exhibition.routes';
import { checkinRoutes } from './checkin.routes';
import { authRoutes } from './auth.routes';
import { analyticsRoutes } from './analytics.routes';
import { dashboardRoutes } from './dashboard.routes';
import { healthRoutes } from './health.routes';
import { telemetryRoutes } from './telemetry.routes';
import { visitorRoutes } from './visitor.routes';
import { evaluationRoutes } from './evaluation.routes';
import { eventRoutes } from './events.routes';
import { recommendationRoutes } from './recommendation.routes';
import { cameraRoutes } from './camera.routes';
import { publicRoutes } from './public.routes';
import { usersRoutes } from './users.routes';
import { uploadRoutes, uploadPublicRoutes } from './upload.routes';
import { inviteRoutes } from './invite.routes';

import { authMiddleware } from '../middlewares/auth.middleware';

const routes = Router();

// ── Public ────────────────────────────────────────────────────────────────
routes.use('/health', healthRoutes);
routes.use('/telemetry', telemetryRoutes);
routes.use('/auth', authRoutes);
routes.use('/api/v1/users', visitorRoutes);
routes.use('/api/v1/public', publicRoutes); // LOG-11: visitor-facing exhibitions
routes.use('/uploads', uploadPublicRoutes); // GET only — public for cover images
routes.use('/invites', inviteRoutes); // public — accept invite + token info

// Public ingest / write endpoints kept open for the visitor flow.
// They are protected by request-shape validation and rate limits, not auth.
routes.use('/evaluations', evaluationRoutes);
routes.use('/events', eventRoutes);
routes.use('/recommendations', recommendationRoutes);
routes.use('/camera', cameraRoutes);
routes.use('/checkins', checkinRoutes);

// ── Protected (manager dashboard) ─────────────────────────────────────────
routes.use('/analytics', authMiddleware, analyticsRoutes);
routes.use('/museums', authMiddleware, museumRoutes);
routes.use('/exhibitions', authMiddleware, exhibitionRoutes);
routes.use('/users', authMiddleware, usersRoutes);
routes.use('/uploads', authMiddleware, uploadRoutes);
routes.use('/', authMiddleware, dashboardRoutes);

export { routes };
