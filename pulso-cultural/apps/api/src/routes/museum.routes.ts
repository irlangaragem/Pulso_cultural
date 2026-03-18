import { Router } from 'express';
import { MuseumController } from '../controllers/MuseumController';

const museumRoutes = Router();

museumRoutes.get('/', MuseumController.index);
museumRoutes.get('/:id', MuseumController.show);
museumRoutes.post('/', MuseumController.create);
museumRoutes.put('/:id', MuseumController.update);
museumRoutes.delete('/:id', MuseumController.delete);

export { museumRoutes };
