import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export const DashboardController = {
  async getResumoHoje(req: Request, res: Response) {
    try {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);

      const [entries, exits, checkins] = await Promise.all([
        prisma.cameraCount.count({ where: { type: 'ENTRADA', timestamp: { gte: start, lte: end } } }),
        prisma.cameraCount.count({ where: { type: 'SAIDA', timestamp: { gte: start, lte: end } } }),
        prisma.checkin.count({ where: { createdAt: { gte: start, lte: end } } })
      ]);

      const currentOccupancy = entries - exits > 0 ? entries - exits : checkins;

      return res.json({
        pessoasNoEspaco: currentOccupancy,
        entradasHoje: entries,
        checkinsHoje: checkins,
        tempoMedio: 34 // Keep static or estimate if possible
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getResumoHistorico(req: Request, res: Response) {
    try {
      const totalVisitors = await prisma.visitor.count();
      const totalEntries = await prisma.cameraCount.count({ where: { type: 'ENTRADA' } });
      const adesao = totalEntries > 0 ? Math.round((totalVisitors / totalEntries) * 100) : 0;

      // Mediana de idade
      const visitors = await prisma.visitor.findMany({ select: { birthYear: true } });
      const currentYear = new Date().getFullYear();
      const ages = visitors.map(v => currentYear - v.birthYear).sort((a, b) => a - b);
      const median = ages.length > 0 ? ages[Math.floor(ages.length / 2)] : 0;

      return res.json({
        visitantes: totalVisitors,
        adesao: adesao,
        idadeMediana: median
      });
    } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getHistorico(req: Request, res: Response) {
    try {
      const camera = await prisma.cameraCount.count({ where: { type: 'ENTRADA' } });
      const checkins = await prisma.checkin.count();
      
      // Recorrência: Visitantes com mais de um checkin
      const recurrence_count = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM (
          SELECT visitorId FROM Checkin GROUP BY visitorId HAVING COUNT(*) > 1
        ) as sub
      `;
      const total_returning = Number(recurrence_count[0]?.count || 0);

      return res.json({
        camera,
        checkins,
        retorno: checkins > 0 ? Math.round((total_returning / checkins) * 100) : 0,
        multiplicador: checkins > 0 ? (camera / checkins).toFixed(1) : 0
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getStream(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write('retry: 10000\n\n');

    const interval = setInterval(async () => {
      try {
        const today = new Date();
        const start = startOfDay(today);
        const [entries, exits] = await Promise.all([
           prisma.cameraCount.count({ where: { type: 'ENTRADA', timestamp: { gte: start } } }),
           prisma.cameraCount.count({ where: { type: 'SAIDA', timestamp: { gte: start } } })
        ]);
        const data = { 
          ocupacao_atual: entries - exits,
          entradas_hoje: entries,
          saidas_hoje: exits,
          timestamp: new Date()
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {}
    }, 10000);

    req.on('close', () => {
      clearInterval(interval);
    });
  }
};
