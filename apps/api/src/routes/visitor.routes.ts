import { Router } from 'express';
import { VisitorController } from '../controllers/VisitorController';
import { visitorLimiter } from '../server';

const visitorRoutes = Router();
const visitorController = new VisitorController();

// Dedicated registration flow for "Primeiro Pulso"
visitorRoutes.post('/register', visitorLimiter, visitorController.register);

// Identification for returning visitors
visitorRoutes.post('/identify', visitorLimiter, visitorController.identify);

export { visitorRoutes };
