import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const PII_KEYS = new Set(['cpf', 'cpfHash', 'email', 'emailHash', 'name', 'firstName', 'lastName', 'nome']);

function redactPII(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactPII);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_KEYS.has(k)) out[k] = '[REDACTED]';
    else out[k] = typeof v === 'object' ? redactPII(v) : v;
  }
  return out;
}

const TelemetryBody = z.object({
  type: z.enum(['info', 'error', 'event']).default('info'),
  message: z.string().max(500).optional(),
  event: z.string().max(120).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

router.post('/', (req, res) => {
  const parsed = TelemetryBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }
  const safe = redactPII(parsed.data);
  if (parsed.data.type === 'error') {
    console.error('[telemetry] error', safe);
  } else {
    console.info('[telemetry]', safe);
  }
  return res.status(200).json({ ok: true });
});

export { router as telemetryRoutes };
