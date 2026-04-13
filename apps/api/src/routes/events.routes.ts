import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';

const eventRoutes = Router();

/**
 * POST /events/track
 * Frontend event tracking endpoint.
 * Receives behavioral events from the visitor-facing app.
 * No PII stored — sessionId is anonymous.
 */
eventRoutes.post('/track', async (req: Request, res: Response) => {
  const { sessionId, event, exhibitionId, museumSlug, properties } = req.body;

  if (!event || !sessionId) {
    return res.status(400).json({ error: 'event and sessionId are required' });
  }

  // Allowed events — whitelist to prevent abuse
  const ALLOWED_EVENTS = [
    'session_started',
    'rating_submitted',
    'share_clicked',
    'share_completed',
    'audio_played',
    'work_expanded',
    'guide_viewed'
  ];

  if (!ALLOWED_EVENTS.includes(event)) {
    return res.status(400).json({ error: `Unknown event: ${event}` });
  }

  await AnalyticsService.track({ sessionId, event, exhibitionId, museumSlug, properties });

  return res.status(204).send();
});

export { eventRoutes };
