import { Router } from 'express';
import { InviteController } from '../controllers/InviteController';

export const inviteRoutes = Router();

inviteRoutes.get('/info', InviteController.info);
inviteRoutes.post('/accept', InviteController.accept);
