import { Router } from 'express';
import { EvaluationController } from '../controllers/EvaluationController';
import { authMiddleware } from '../middlewares/auth.middleware';

const evaluationRoutes = Router();
const evaluationController = new EvaluationController();

// Public: submit evaluation (visitor-facing)
evaluationRoutes.post('/', evaluationController.submit);

// Protected: aggregate summary for manager dashboard
evaluationRoutes.get('/:exhibitionId/summary', authMiddleware, evaluationController.getSummary);

export { evaluationRoutes };
