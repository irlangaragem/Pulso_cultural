import { Router } from 'express';
import { ExhibitionController } from '../controllers/ExhibitionController';

const exhibitionRoutes = Router();

exhibitionRoutes.get('/', ExhibitionController.index);
exhibitionRoutes.get('/:id', ExhibitionController.show);
exhibitionRoutes.post('/', ExhibitionController.create);
exhibitionRoutes.put('/:id', ExhibitionController.update);
exhibitionRoutes.delete('/:id', ExhibitionController.delete);

export { exhibitionRoutes };
