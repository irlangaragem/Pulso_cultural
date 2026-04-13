import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

import { authMiddleware } from '../middlewares/auth.middleware';

const authRoutes = Router();

authRoutes.post('/signin', AuthController.signIn);
authRoutes.post('/change-password', authMiddleware, AuthController.changePassword);

export { authRoutes };
