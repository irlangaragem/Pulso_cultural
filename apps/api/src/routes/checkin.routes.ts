import { Router } from 'express';
import { CheckinController } from '../controllers/CheckinController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { checkinLimiter } from '../server';

const checkinRoutes = Router();
const checkinController = new CheckinController();

// Public routes for visitors — rate limited, body validated inside controller
checkinRoutes.post('/', checkinLimiter, checkinController.create);
checkinRoutes.post('/batch', checkinLimiter, checkinController.batchCreate);
checkinRoutes.post('/verify', checkinLimiter, checkinController.verify);
checkinRoutes.post('/ingest', checkinController.ingestCameraData); // uses internal secret

// Protected routes for management
checkinRoutes.get('/stats/:exhibitionId', authMiddleware, checkinController.getStats);
checkinRoutes.post('/simulate-count', authMiddleware, checkinController.simulateCount);

export { checkinRoutes };
