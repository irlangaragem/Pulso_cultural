import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const authRoutes = Router();

authRoutes.post('/signin', AuthController.signIn);

export { authRoutes };
