import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

const analyticsRoutes = Router();

analyticsRoutes.get('/trends/:exhibitionId', AnalyticsController.getTrends);
analyticsRoutes.get('/demographics/:exhibitionId', AnalyticsController.getDemographics);

export { analyticsRoutes };
