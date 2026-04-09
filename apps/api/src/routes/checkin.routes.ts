import { Router } from 'express';
import { CheckinController } from '../controllers/CheckinController';
import { authMiddleware } from '../middlewares/auth.middleware';

const checkinRoutes = Router();
const checkinController = new CheckinController();

// Public routes for visitors
checkinRoutes.post('/', checkinController.create);
checkinRoutes.post('/verify', checkinController.verify);

// Protected routes for management
checkinRoutes.get('/stats/:exhibitionId', authMiddleware, checkinController.getStats);
checkinRoutes.post('/simulate-count', authMiddleware, checkinController.simulateCount);

export { checkinRoutes };
