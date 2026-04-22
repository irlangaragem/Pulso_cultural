import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authLimiter } from '../server';

const authRoutes = Router();

authRoutes.post('/signin', authLimiter, AuthController.signIn);
authRoutes.post('/change-password', authMiddleware, AuthController.changePassword);

export { authRoutes };
