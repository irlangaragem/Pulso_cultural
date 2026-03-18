import { Router } from 'express';
import { museumRoutes } from './museum.routes';
import { exhibitionRoutes } from './exhibition.routes';
import { checkinRoutes } from './checkin.routes';
import { authRoutes } from './auth.routes';
import { analyticsRoutes } from './analytics.routes';
import { dashboardRoutes } from './dashboard.routes';

const routes = Router();

routes.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
routes.use('/auth', authRoutes);
routes.use('/analytics', analyticsRoutes);

routes.use('/museums', museumRoutes);
routes.use('/exhibitions', exhibitionRoutes);
routes.use('/checkins', checkinRoutes);
routes.use('/', dashboardRoutes);

export { routes };
