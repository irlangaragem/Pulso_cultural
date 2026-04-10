import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';

export const DashboardController = {
  async getResumoHoje(_req: Request, res: Response) {
    try {
      const today = startOfDay(new Date());

      const entriesToday = await prisma.cameraCount.count({
        where: { type: 'ENTRADA', timestamp: { gte: today } }
      });

      const exitsToday = await prisma.cameraCount.count({
        where: { type: 'SAIDA', timestamp: { gte: today } }
      });

      const checkinsToday = await prisma.checkin.count({
        where: { createdAt: { gte: today } }
      });

      const currentOccupancy = Math.max(0, entriesToday - exitsToday);

      return res.json({
        entradas_hoje: entriesToday,
        saidas_hoje: exitsToday,
        checkins_hoje: checkinsToday,
        ocupacao_atual: currentOccupancy,
        ocupacao_pico: Math.max(currentOccupancy, entriesToday * 0.8), // Heuristic for demo
        atualizado_em: new Date().toISOString()
      });
    } catch (error) {
      console.error('Dashboard /resumo/hoje error:', error);
      return res.status(500).json({ error: 'Erro ao calcular dados em tempo real' });
    }
  },

  async getResumoHistorico(_req: Request, res: Response) {
    try {
      // Return counts for the last 7 days grouped by day
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return startOfDay(d);
      });

      const stats = await Promise.all(days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const inCount = await prisma.cameraCount.count({
          where: { type: 'ENTRADA', timestamp: { gte: day, lt: nextDay } }
        });
        const outCount = await prisma.cameraCount.count({
          where: { type: 'SAIDA', timestamp: { gte: day, lt: nextDay } }
        });

        return {
          data: day.toISOString().split('T')[0],
          entradas: inCount,
          saidas: outCount
        };
      }));

      return res.json(stats);
    } catch (error) {
      console.error('Dashboard /resumo/historico error:', error);
      return res.status(500).json({ error: 'Erro ao carregar resumo histórico' });
    }
  },

  async getHistorico(_req: Request, res: Response) {
    try {
      const totalCamera = await prisma.cameraCount.count({ where: { type: 'ENTRADA' } });
      const totalCheckins = await prisma.checkin.count();
      const returns = await prisma.checkin.groupBy({
        by: ['visitorId'],
        _count: { visitorId: true },
        having: { visitorId: { _count: { gt: 1 } } }
      });

      const returnRate = totalCheckins > 0 ? Math.round((returns.length / totalCheckins) * 100) : 0;

      return res.json({
        camera: totalCamera,
        checkins: totalCheckins,
        retorno: returnRate,
        multiplicador: totalCheckins > 0 ? (totalCamera / totalCheckins).toFixed(1) : 0
      });
    } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getStream(_req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('retry: 10000\n\n');

    const interval = setInterval(async () => {
      try {
        const today = startOfDay(new Date());
        const entries = await prisma.cameraCount.count({ where: { type: 'ENTRADA', timestamp: { gte: today } } });
        const exits = await prisma.cameraCount.count({ where: { type: 'SAIDA', timestamp: { gte: today } } });
        
        const data = {
          entradas_hoje: entries,
          saidas_hoje: exits,
          ocupacao_atual: Math.max(0, entries - exits),
          timestamp: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('Stream error:', err);
      }
    }, 10000);

    res.on('close', () => {
      clearInterval(interval);
    });
  }
};
