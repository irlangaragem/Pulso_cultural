import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const status = {
    services: {
      api: 'healthy',
      database: 'checking'
    },
    timestamp: new Date().toISOString()
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.services.database = 'healthy';
  } catch (err) {
    console.error('Database health check failed:', err);
    status.services.database = 'unhealthy';
  }

  const isHealthy = status.services.api === 'healthy' && status.services.database === 'healthy';
  return res.status(isHealthy ? 200 : 503).json(status);
});

export { router as healthRoutes };
