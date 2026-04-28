import { api } from './api';
import { MUSEUM_SLUG } from '../config/museum';

// Anonymous session ID — generated once per browser session
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('pulso:session_id');
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('pulso:session_id', sessionId);
  }
  return sessionId;
};

type EventName =
  | 'session_started'
  | 'rating_submitted'
  | 'share_clicked'
  | 'share_completed'
  | 'audio_played'
  | 'work_expanded'
  | 'guide_viewed';

interface TrackOptions {
  exhibitionId?: string;
  museumSlug?: string;
  properties?: Record<string, unknown>;
}

/**
 * Front-end Analytics Client
 * Sends behavioral events to the Analytics Service.
 * Never contains PII — only session IDs and exhibition refs.
 */
export const analytics = {
  track(event: EventName, options: TrackOptions = {}): void {
    const sessionId = getSessionId();

    // Fire & forget — never block the UI
    api.post('/events/track', {
      sessionId,
      event,
      exhibitionId: options.exhibitionId,
      museumSlug: options.museumSlug || MUSEUM_SLUG,
      properties: options.properties
    }).catch(() => {
      // Analytics failures are silent — never affect UX
    });
  }
};
