import { prisma } from '../lib/prisma';

interface TrackPayload {
  sessionId: string;
  event: string;
  exhibitionId?: string;
  museumSlug?: string;
  properties?: Record<string, unknown>;
}

/**
 * Analytics Service — Behavioral Event Tracking
 * Events: rating_submitted, share_clicked, share_completed, session_started
 * All events are anonymous (no PII stored here — only sessionId).
 */
export class AnalyticsService {
  static async track(payload: TrackPayload): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          sessionId: payload.sessionId,
          event: payload.event,
          exhibitionId: payload.exhibitionId || null,
          museumSlug: payload.museumSlug || null,
          properties: payload.properties || {}
        }
      });
    } catch (error) {
      // Analytics should never block the main flow
      console.error('[AnalyticsService] track error (non-fatal):', error);
    }
  }

  /**
   * Get event counts for a given exhibition over a time range.
   * Returns aggregate data only — LGPD compliant.
   */
  static async getExhibitionEvents(
    exhibitionId: string,
    from?: Date,
    to?: Date
  ): Promise<Record<string, number>> {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        exhibitionId,
        createdAt: {
          gte: from,
          lte: to
        }
      },
      select: { event: true }
    });

    return events.reduce((acc, ev) => {
      acc[ev.event] = (acc[ev.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get share channel distribution for a museum (multi-tenant).
   */
  static async getShareChannels(museumSlug: string): Promise<Record<string, number>> {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        museumSlug,
        event: 'share_completed'
      },
      select: { properties: true }
    });

    return events.reduce((acc, ev) => {
      const props = ev.properties as Record<string, unknown> | null;
      const channel = props?.channel as string | undefined;
      if (channel) acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
