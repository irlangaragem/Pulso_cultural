import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const dashboardRoutes = Router();

dashboardRoutes.get('/resumo/hoje', DashboardController.getResumoHoje);
dashboardRoutes.get('/resumo/historico', DashboardController.getResumoHistorico);
dashboardRoutes.get('/resumo/comparacao', DashboardController.getComparacao);
dashboardRoutes.get('/resumo/comparacao-mensal', DashboardController.getComparacaoMensal);
dashboardRoutes.get('/resumo/recorrencia', DashboardController.getRecorrencia);
dashboardRoutes.get('/historico', DashboardController.getHistorico);
dashboardRoutes.get('/stream', DashboardController.getStream);

export { dashboardRoutes };
