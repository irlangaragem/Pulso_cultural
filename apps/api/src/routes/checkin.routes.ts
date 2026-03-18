import { Router } from 'express';
import { CheckinController } from '../controllers/CheckinController';

const checkinRoutes = Router();
const checkinController = new CheckinController();

checkinRoutes.post('/', checkinController.create);
checkinRoutes.get('/stats/:exhibitionId', checkinController.getStats);
checkinRoutes.post('/simulate-count', checkinController.simulateCount);

export { checkinRoutes };
