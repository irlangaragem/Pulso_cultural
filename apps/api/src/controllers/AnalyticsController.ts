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
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
