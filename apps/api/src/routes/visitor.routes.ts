import { Router } from 'express';
import { VisitorController } from '../controllers/VisitorController';

const visitorRoutes = Router();
const visitorController = new VisitorController();

// Dedicated registration flow for "Primeiro Pulso"
visitorRoutes.post('/register', visitorController.register);

// Identification for returning visitors
visitorRoutes.post('/identify', visitorController.identify);

export { visitorRoutes };
