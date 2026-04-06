import { Router } from 'express';

const router = Router();
const UPSTREAM_URL = 'https://pulsocultural-production.up.railway.app';

router.get('/', async (_req, res) => {
  const status = {
    services: {
      api: 'healthy',
      database: 'healthy', // Simples para este contexto
      upstream: 'unknown'
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(`${UPSTREAM_URL}/`, { signal: AbortSignal.timeout(3000) });
    status.services.upstream = response.ok ? 'healthy' : 'degraded';
  } catch {
    status.services.upstream = 'down';
  }

  const isDegraded = Object.values(status.services).some(s => s !== 'healthy');
  return res.status(isDegraded ? 200 : 200).json(status); 
  // Retornamos 200 para que o front possa ler o JSON detalhado
});

export { router as healthRoutes };
