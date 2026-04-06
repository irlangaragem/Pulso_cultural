import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { subHours, startOfHour } from 'date-fns';

export const AnalyticsController = {
  async getTrends(req: Request, res: Response) {
    const { exhibitionId } = req.params;

    try {
      const now = new Date();
      const twelveHoursAgo = subHours(now, 12);

      const counts = await prisma.cameraCount.findMany({
        where: {
          exhibitionId,
          timestamp: {
            gte: twelveHoursAgo
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      const checkins = await prisma.checkin.findMany({
        where: {
          exhibitionId,
          createdAt: {
            gte: twelveHoursAgo
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const trends = Array.from({ length: 13 }).map((_, i) => {
        const hourDate = startOfHour(subHours(now, 12 - i));
        const hourStr = hourDate.getHours().toString().padStart(2, '0') + ':00';
        
        const hourEntries = counts.filter(c => 
          startOfHour(c.timestamp).getTime() === hourDate.getTime() && c.type === 'ENTRADA'
        ).length;

        const hourExits = counts.filter(c => 
          startOfHour(c.timestamp).getTime() === hourDate.getTime() && c.type === 'SAIDA'
        ).length;

        const hourCheckins = checkins.filter(c => 
          startOfHour(c.createdAt).getTime() === hourDate.getTime()
        ).length;

        return {
          hour: hourStr,
          entries: hourEntries,
          exits: hourExits,
          checkins: hourCheckins
        };
      });

      return res.json(trends);
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getDemographics(req: Request, res: Response) {
    try {
      const visitors = await prisma.visitor.findMany();
      const total = visitors.length;

      if (total === 0) {
        return res.json({ gender: [], ages: [], origin: [], recurrence: [] });
      }

      // Gender
      const genderMap = visitors.reduce((acc: Record<string, number>, v) => {
        acc[v.gender] = (acc[v.gender] || 0) + 1;
        return acc;
      }, {});
      const gender = Object.entries(genderMap).map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100)
      }));

      // Origin
      const originMap = visitors.reduce((acc: Record<string, number>, v) => {
        acc[v.origin] = (acc[v.origin] || 0) + 1;
        return acc;
      }, {});
      const origin = Object.entries(originMap).map(([name, count]) => ({
        name,
        value: Math.round((count / total) * 100)
      }));

      // Ages
      const currentYear = new Date().getFullYear();
      const ageGroups = {
        '< 18': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-59': 0, '60+': 0
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
        v: Math.round((count / total) * 100)
      }));

      return res.json({ gender, origin, ages });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
