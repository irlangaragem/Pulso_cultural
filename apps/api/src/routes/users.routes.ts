import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const usersRoutes = Router();

usersRoutes.get('/', UserController.list);
usersRoutes.post('/', UserController.create);
usersRoutes.put('/:id', UserController.update);
usersRoutes.post('/:id/resend-invite', UserController.resendInvite);
usersRoutes.post('/:id/revoke-invite', UserController.revokeInvite);
usersRoutes.post('/:id/reset-password', UserController.resetPassword);
usersRoutes.delete('/:id', UserController.deactivate);
usersRoutes.delete('/:id/permanent', UserController.hardDelete);

export { usersRoutes };
