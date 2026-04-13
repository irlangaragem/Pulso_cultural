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

import { authMiddleware } from '../middlewares/auth.middleware';

const routes = Router();


routes.use('/health', healthRoutes);
routes.use('/telemetry', telemetryRoutes);
routes.use('/auth', authRoutes);

// Dedicated visitor registration (v1)
routes.use('/api/v1/users', visitorRoutes);

// Protected routes
routes.use('/analytics', authMiddleware, analyticsRoutes);
routes.use('/museums', authMiddleware, museumRoutes);
routes.use('/exhibitions', authMiddleware, exhibitionRoutes);
routes.use('/', authMiddleware, dashboardRoutes);

// Public / Visitor routes
routes.use('/checkins', checkinRoutes);


export { routes };
