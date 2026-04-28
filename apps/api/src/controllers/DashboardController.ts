import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';

/**
 * Camera batches carry a `count` field (number of people in this batch).
 * Aggregation must SUM that field — counting rows undercounts visitors,
 * which is exactly the bias the product was meant to expose. (LOG-01)
 */
async function sumCameraCounts(where: Record<string, unknown>): Promise<number> {
  const r = await prisma.cameraCount.aggregate({
    _sum: { count: true },
    where,
  });
  return r._sum.count ?? 0;
}

export const DashboardController = {
  async getResumoHoje(_req: Request, res: Response) {
    try {
      const today = startOfDay(new Date());

      const [entriesToday, exitsToday, checkinsToday] = await Promise.all([
        sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: today } }),
        sumCameraCounts({ type: 'SAIDA', timestamp: { gte: today } }),
        prisma.checkin.count({ where: { createdAt: { gte: today } } }),
      ]);

      const currentOccupancy = Math.max(0, entriesToday - exitsToday);

      return res.json({
        entradas_hoje: entriesToday,
        saidas_hoje: exitsToday,
        checkins_hoje: checkinsToday,
        ocupacao_atual: currentOccupancy,
        // ocupacao_pico: removed pending real peak-tracking (see LOG-06).
        ocupacao_pico: null,
        atualizado_em: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Dashboard.getResumoHoje] error:', error);
      return res.status(500).json({ error: 'Erro ao calcular dados em tempo real' });
    }
  },

  /**
   * GET /resumo/historico?days=N
   * Returns daily totals for the last N days (default 7, max 90).
   * Used by Histórico (30-day area) and Tempo real (7-day weekly comparison).
   */
  async getResumoHistorico(req: Request, res: Response) {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

    try {
      const dayList = Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return startOfDay(d);
      });

      const stats = await Promise.all(
        dayList.map(async (day) => {
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);

          const [inCount, outCount, checkinCount] = await Promise.all([
            sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: day, lt: nextDay } }),
            sumCameraCounts({ type: 'SAIDA', timestamp: { gte: day, lt: nextDay } }),
            prisma.checkin.count({ where: { createdAt: { gte: day, lt: nextDay } } }),
          ]);

          return {
            data: day.toISOString().split('T')[0],
            entradas: inCount,
            saidas: outCount,
            checkins: checkinCount,
          };
        })
      );

      return res.json(stats);
    } catch (error) {
      console.error('[Dashboard.getResumoHistorico] error:', error);
      return res.status(500).json({ error: 'Erro ao carregar resumo histórico' });
    }
  },

  /**
   * GET /resumo/comparacao-mensal
   * Returns this-month-so-far vs same window last month.
   */
  async getComparacaoMensal(_req: Request, res: Response) {
    try {
      const now = new Date();
      const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const dayOfMonth = now.getDate();

      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLastMonthWindow = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth);

      const [thisMonth, lastMonthSameWindow] = await Promise.all([
        sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: startThisMonth } }),
        sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: startLastMonth, lt: endLastMonthWindow } }),
      ]);

      const pct = lastMonthSameWindow === 0
        ? null
        : Math.round(((thisMonth - lastMonthSameWindow) / lastMonthSameWindow) * 100);

      const checkinsThisMonth = await prisma.checkin.count({ where: { createdAt: { gte: startThisMonth } } });

      return res.json({
        pulsos_mes_atual: thisMonth,
        pulsos_mesmo_periodo_mes_anterior: lastMonthSameWindow,
        pulsos_pct_vs_mes_anterior: pct,
        checkins_mes_atual: checkinsThisMonth,
      });
    } catch (error) {
      console.error('[Dashboard.getComparacaoMensal] error:', error);
      return res.status(500).json({ error: 'Erro ao calcular comparação mensal' });
    }
  },

  /**
   * GET /resumo/recorrencia
   * Recurrence donut for Histórico tab: # of unique check-ins, # who returned ≥2x.
   */
  async getRecorrencia(_req: Request, res: Response) {
    try {
      const totalCheckins = await prisma.checkin.count();
      const visitorsWithCheckins = await prisma.checkin.groupBy({
        by: ['visitorId'],
        _count: { visitorId: true },
      });
      const totalVisitors = visitorsWithCheckins.length;
      const recorrentes = visitorsWithCheckins.filter(v => v._count.visitorId > 1).length;
      const primeira = totalVisitors - recorrentes;
      const taxaRetorno = totalVisitors > 0 ? Math.round((recorrentes / totalVisitors) * 100) : 0;

      return res.json({
        total_visitors_com_checkin: totalVisitors,
        primeira_visita: primeira,
        retorno: recorrentes,
        taxa_retorno_pct: taxaRetorno,
        total_checkins: totalCheckins,
      });
    } catch (error) {
      console.error('[Dashboard.getRecorrencia] error:', error);
      return res.status(500).json({ error: 'Erro ao calcular recorrência' });
    }
  },

  /**
   * Returns counters for "now" vs "same hour yesterday" and "today" vs "yesterday".
   * The frontend uses this to render the "↑ X% vs. ontem" labels on Tempo real.
   */
  async getComparacao(_req: Request, res: Response) {
    try {
      const now = new Date();
      const today = startOfDay(now);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const startOfHour = new Date(now);
      startOfHour.setMinutes(0, 0, 0);

      const sameHourYesterdayStart = new Date(startOfHour);
      sameHourYesterdayStart.setDate(sameHourYesterdayStart.getDate() - 1);
      const sameHourYesterdayEnd = new Date(sameHourYesterdayStart);
      sameHourYesterdayEnd.setHours(sameHourYesterdayEnd.getHours() + 1);

      const [entradasHoje, entradasOntem, ocupacaoMesmaHoraOntem] = await Promise.all([
        sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: today } }),
        sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: yesterday, lt: today } }),
        sumCameraCounts({
          type: 'ENTRADA',
          timestamp: { gte: sameHourYesterdayStart, lt: sameHourYesterdayEnd },
        }),
      ]);

      const ocupacaoAgora = await sumCameraCounts({
        type: 'ENTRADA',
        timestamp: { gte: startOfHour },
      });

      const pct = (curr: number, prev: number) => {
        if (prev === 0) return null;
        return Math.round(((curr - prev) / prev) * 100);
      };

      return res.json({
        ocupacao_vs_mesma_hora_ontem: pct(ocupacaoAgora, ocupacaoMesmaHoraOntem),
        entradas_vs_ontem: pct(entradasHoje, entradasOntem),
      });
    } catch (error) {
      console.error('[Dashboard.getComparacao] error:', error);
      return res.status(500).json({ error: 'Erro ao calcular comparação' });
    }
  },

  async getHistorico(_req: Request, res: Response) {
    try {
      const totalCamera = await sumCameraCounts({ type: 'ENTRADA' });
      const totalCheckins = await prisma.checkin.count();
      const returns = await prisma.checkin.groupBy({
        by: ['visitorId'],
        _count: { visitorId: true },
        having: { visitorId: { _count: { gt: 1 } } },
      });

      const returnRate = totalCheckins > 0 ? Math.round((returns.length / totalCheckins) * 100) : 0;

      return res.json({
        camera: totalCamera,
        checkins: totalCheckins,
        retorno: returnRate,
        multiplicador: totalCheckins > 0 ? (totalCamera / totalCheckins).toFixed(1) : '0.0',
      });
    } catch (error) {
      console.error('[Dashboard.getHistorico] error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getStream(_req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.write('retry: 10000\n\n');
    res.write(': keep-alive\n\n');

    const interval = setInterval(async () => {
      try {
        const today = startOfDay(new Date());
        const [entries, exits] = await Promise.all([
          sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: today } }),
          sumCameraCounts({ type: 'SAIDA', timestamp: { gte: today } }),
        ]);

        const data = {
          entradas_hoje: entries,
          saidas_hoje: exits,
          ocupacao_atual: Math.max(0, entries - exits),
          timestamp: new Date().toISOString(),
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('[Dashboard.getStream] error:', err);
      }
    }, 10000);

    res.on('close', () => clearInterval(interval));
  },
};
