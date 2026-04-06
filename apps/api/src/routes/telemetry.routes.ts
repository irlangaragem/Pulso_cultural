import { Router } from 'express';

const router = Router();

// Endpoint para receber eventos de telemetria do frontend
router.post('/', (req, res) => {
  const payload = req.body;
  
  // Como optamos por Console estruturado por enquanto:
  if (payload.type === 'error') {
    console.error('[TELEMETRY ERROR]', JSON.stringify(payload, null, 2));
  } else {
    console.info('[TELEMETRY INFO]', JSON.stringify(payload, null, 2));
  }
  
  return res.status(200).json({ ok: true });
});

export { router as telemetryRoutes };
