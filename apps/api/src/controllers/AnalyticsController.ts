import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { subHours, startOfHour } from 'date-fns';
import { CSVService } from '../services/CSVService';

/**
 * Pull museumId from the JWT (set by authMiddleware on protected routes).
 * Returns undefined when missing — callers must decide whether to require it.
 */
function museumIdFromReq(req: Request): string | undefined {
  return (req as any).user?.museumId;
}

export const AnalyticsController = {
  async getTrends(req: Request, res: Response) {
    const { exhibitionId } = req.params;

    try {
      const now = new Date();
      const twelveHoursAgo = subHours(now, 12);

      // Aggregate counts grouped by hour bucket and type — sums the `count` field (LOG-01).
      const counts = await prisma.cameraCount.findMany({
        where: { exhibitionId, timestamp: { gte: twelveHoursAgo } },
        orderBy: { timestamp: 'asc' },
      });

      const checkins = await prisma.checkin.findMany({
        where: { exhibitionId, createdAt: { gte: twelveHoursAgo } },
        orderBy: { createdAt: 'asc' },
      });

      const trends = Array.from({ length: 13 }).map((_, i) => {
        const hourDate = startOfHour(subHours(now, 12 - i));
        const hourStr = hourDate.getHours().toString().padStart(2, '0') + ':00';

        const hourEntries = counts
          .filter(c => startOfHour(c.timestamp).getTime() === hourDate.getTime() && c.type === 'ENTRADA')
          .reduce((sum, c) => sum + (c.count ?? 1), 0);

        const hourExits = counts
          .filter(c => startOfHour(c.timestamp).getTime() === hourDate.getTime() && c.type === 'SAIDA')
          .reduce((sum, c) => sum + (c.count ?? 1), 0);

        const hourCheckins = checkins.filter(
          c => startOfHour(c.createdAt).getTime() === hourDate.getTime()
        ).length;

        return { hour: hourStr, entries: hourEntries, exits: hourExits, checkins: hourCheckins };
      });

      return res.json(trends);
    } catch (error) {
      console.error('[Analytics.getTrends] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Demographics scoped to the current manager's museum (LOG-04).
   * Visitors here are those whose checkins land in this museum's exhibitions.
   */
  async getDemographics(req: Request, res: Response) {
    const museumId = museumIdFromReq(req);
    if (!museumId) {
      return res.status(403).json({ error: 'Manager has no associated museum' });
    }

    try {
      const checkins = await prisma.checkin.findMany({
        where: { exhibition: { museumId } },
        select: { visitorId: true },
      });
      const visitorIds = Array.from(new Set(checkins.map(c => c.visitorId)));

      const visitors = visitorIds.length
        ? await prisma.visitor.findMany({ where: { id: { in: visitorIds } } })
        : [];

      const total = visitors.length;
      if (total === 0) {
        return res.json({ gender: [], ages: [], origin: [] });
      }

      const genderMap = visitors.reduce((acc: Record<string, number>, v) => {
        acc[v.gender] = (acc[v.gender] || 0) + 1;
        return acc;
      }, {});
      const gender = Object.entries(genderMap).map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100),
      }));

      const originMap = visitors.reduce((acc: Record<string, number>, v) => {
        acc[v.origin] = (acc[v.origin] || 0) + 1;
        return acc;
      }, {});
      const origin = Object.entries(originMap).map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100),
      }));

      const currentYear = new Date().getFullYear();
      const ageGroups: Record<string, number> = {
        '< 18': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-59': 0, '60+': 0,
      };
      visitors.forEach(v => {
        const age = currentYear - v.birthYear;
        if (age < 18) ageGroups['< 18']++;
        else if (age <= 24) ageGroups['18-24']++;
        else if (age <= 34) ageGroups['25-34']++;
        else if (age <= 44) ageGroups['35-44']++;
        else if (age <= 59) ageGroups['45-59']++;
        else ageGroups['60+']++;
      });
      const ages = Object.entries(ageGroups).map(([faixa, count]) => ({
        faixa,
        v: Math.round((count / total) * 100),
      }));

      return res.json({ gender, origin, ages });
    } catch (error) {
      console.error('[Analytics.getDemographics] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Channel distribution ("Como soube da exposição") for the manager dashboard.
   * Returns a percentage breakdown by channel for the given exhibition.
   */
  async getChannels(req: Request, res: Response) {
    const { exhibitionId } = req.params;
    try {
      const grouped = await prisma.checkin.groupBy({
        by: ['channel'],
        where: { exhibitionId },
        _count: { channel: true },
      });
      const total = grouped.reduce((sum, g) => sum + g._count.channel, 0);
      const data = grouped.map(g => ({
        channel: g.channel,
        count: g._count.channel,
        pct: total > 0 ? Math.round((g._count.channel / total) * 100) : 0,
      })).sort((a, b) => b.count - a.count);
      return res.json({ total, items: data });
    } catch (error) {
      console.error('[Analytics.getChannels] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Median age of visitors checked in to this exhibition (for the Público hero stat).
   */
  async getMedianAge(req: Request, res: Response) {
    const { exhibitionId } = req.params;
    try {
      const visitorIds = await prisma.checkin.findMany({
        where: { exhibitionId },
        select: { visitorId: true },
        distinct: ['visitorId'],
      });
      if (visitorIds.length === 0) return res.json({ median: null, total: 0 });

      const visitors = await prisma.visitor.findMany({
        where: { id: { in: visitorIds.map(v => v.visitorId) } },
        select: { birthYear: true },
      });
      const currentYear = new Date().getFullYear();
      const ages = visitors.map(v => currentYear - v.birthYear).sort((a, b) => a - b);
      const m = ages.length;
      const median = m === 0
        ? null
        : m % 2 === 1
          ? ages[(m - 1) / 2]
          : Math.round((ages[m / 2 - 1] + ages[m / 2]) / 2);
      return res.json({ median, total: m });
    } catch (error) {
      console.error('[Analytics.getMedianAge] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Aggregated CSV. Granular fields (full birth year, originDetail, last name)
   * are stripped to reduce reidentification risk (LGPD-02).
   * Cells with count<5 are suppressed (k-anonymity).
   */
  async exportCheckins(req: Request, res: Response) {
    const { exhibitionId } = req.params;
    const museumId = museumIdFromReq(req);
    if (!museumId) {
      return res.status(403).json({ error: 'Manager has no associated museum' });
    }

    try {
      const exhibition = await prisma.exhibition.findUnique({ where: { id: exhibitionId } });
      if (!exhibition || exhibition.museumId !== museumId) {
        return res.status(404).json({ error: 'Exhibition not found in this museum' });
      }

      const checkins = await prisma.checkin.findMany({
        where: { exhibitionId },
        include: { visitor: true },
      });

      const currentYear = new Date().getFullYear();
      function bracket(age: number): string {
        if (age < 18) return '< 18';
        if (age <= 24) return '18-24';
        if (age <= 34) return '25-34';
        if (age <= 44) return '35-44';
        if (age <= 59) return '45-59';
        return '60+';
      }

      // Group: (date, age bracket, gender, origin, channel)
      const buckets = new Map<string, { row: Record<string, unknown>; count: number }>();
      for (const c of checkins) {
        const day = c.createdAt.toISOString().split('T')[0];
        const ageBracket = bracket(currentYear - c.visitor.birthYear);
        const key = `${day}|${ageBracket}|${c.visitor.gender}|${c.visitor.origin}|${c.channel}`;
        const existing = buckets.get(key);
        if (existing) existing.count++;
        else
          buckets.set(key, {
            row: {
              data: day,
              faixa_etaria: ageBracket,
              genero: c.visitor.gender,
              origem: c.visitor.origin,
              canal_adesao: c.channel,
            },
            count: 1,
          });
      }

      const data = Array.from(buckets.values())
        .filter(b => b.count >= 5) // k-anonymity ≥ 5
        .map(b => ({ ...b.row, count: b.count }));

      const csv = CSVService.jsonToCSV(data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${exhibitionId}.csv`);
      return res.send(csv);
    } catch (error) {
      console.error('[Analytics.exportCheckins] error:', error);
      return res.status(500).json({ error: 'Erro ao gerar exportação' });
    }
  },
};
