import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const dashboardRoutes = Router();

dashboardRoutes.get('/resumo/hoje', DashboardController.getResumoHoje);
dashboardRoutes.get('/resumo/historico', DashboardController.getResumoHistorico);
dashboardRoutes.get('/historico', DashboardController.getHistorico);
dashboardRoutes.get('/stream', DashboardController.getStream);

export { dashboardRoutes };
