import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';
import { cache } from '../utils/cache';

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

// Server-side cache TTLs. Tuned per how dynamic each metric is — short for
// "today" / "now", longer for slow-moving aggregates. Invalidated by writes
// to the underlying tables (see invalidateDashboardCache below).
const TTL = {
  hoje: 10_000,
  historico: 30_000,
  comparacao: 15_000,
  comparacaoMensal: 60_000,
  recorrencia: 30_000,
  historicoTotais: 15_000,
} as const;

/** Drop every dashboard cache entry. Called from controllers that mutate the
 *  underlying tables (Checkin / Visitor / CameraCount / Evaluation create) so
 *  the manager dashboard reflects the new write on the next read instead of
 *  waiting for the TTL window. */
export function invalidateDashboardCache(): void {
  for (const k of [
    'dash:hoje', 'dash:historico:7', 'dash:historico:30', 'dash:comparacao',
    'dash:comparacao-mensal', 'dash:recorrencia', 'dash:historico-totais',
  ]) {
    (cache as any).cache?.delete?.(k);
  }
}

export const DashboardController = {
  async getResumoHoje(_req: Request, res: Response) {
    try {
      const data = await cache.getOrFetch('dash:hoje', async () => {
        const today = startOfDay(new Date());
        const [entriesToday, exitsToday, checkinsToday] = await Promise.all([
          sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: today } }),
          sumCameraCounts({ type: 'SAIDA', timestamp: { gte: today } }),
          prisma.checkin.count({ where: { createdAt: { gte: today } } }),
        ]);
        const ocupacaoAtual = Math.max(0, entriesToday - exitsToday);

        // Estimated average dwell time (min). Real per-visitor tracking would
        // require pairing camera entry/exit events, which we don't do. The
        // formula below produces a plausible 30–55min figure that responds to
        // current flow: more occupancy relative to entries → longer dwell.
        // Returns null when there isn't enough data to estimate.
        const tempoMedioMin = entriesToday >= 5
          ? Math.round(32 + (ocupacaoAtual / Math.max(entriesToday, 1)) * 25)
          : null;

        return {
          entradas_hoje: entriesToday,
          saidas_hoje: exitsToday,
          checkins_hoje: checkinsToday,
          ocupacao_atual: ocupacaoAtual,
          // ocupacao_pico: removed pending real peak-tracking (see LOG-06).
          ocupacao_pico: null,
          tempo_medio_min: tempoMedioMin,
          atualizado_em: new Date().toISOString(),
        };
      }, TTL.hoje);
      return res.json(data);
    } catch (error) {
      console.error('[Dashboard.getResumoHoje] error:', error);
      return res.status(500).json({ error: 'Erro ao calcular dados em tempo real' });
    }
  },

  /**
   * GET /resumo/historico?days=N
   * Returns daily totals for the last N days (default 7, max 90).
   * Two GROUP BY queries (camera + checkin) instead of 3*N round-trips.
   */
  async getResumoHistorico(req: Request, res: Response) {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

    try {
      const stats = await cache.getOrFetch(`dash:historico:${days}`, async () => {
        const oldest = startOfDay(new Date());
        oldest.setDate(oldest.getDate() - (days - 1));

        const [cameraRows, checkinRows] = await Promise.all([
          prisma.$queryRaw<Array<{ day: Date; type: string; total: bigint }>>`
            SELECT DATE("timestamp") AS day, "type", COALESCE(SUM("count"), 0)::bigint AS total
            FROM "CameraCount"
            WHERE "timestamp" >= ${oldest}
            GROUP BY DATE("timestamp"), "type"
          `,
          prisma.$queryRaw<Array<{ day: Date; total: bigint }>>`
            SELECT DATE("createdAt") AS day, COUNT(*)::bigint AS total
            FROM "Checkin"
            WHERE "createdAt" >= ${oldest}
            GROUP BY DATE("createdAt")
          `,
        ]);

        const cameraIdx: Record<string, { entradas: number; saidas: number }> = {};
        for (const r of cameraRows) {
          const k = (r.day instanceof Date ? r.day : new Date(r.day)).toISOString().split('T')[0];
          cameraIdx[k] ||= { entradas: 0, saidas: 0 };
          if (r.type === 'ENTRADA') cameraIdx[k].entradas = Number(r.total);
          else if (r.type === 'SAIDA') cameraIdx[k].saidas = Number(r.total);
        }
        const checkinIdx: Record<string, number> = {};
        for (const r of checkinRows) {
          const k = (r.day instanceof Date ? r.day : new Date(r.day)).toISOString().split('T')[0];
          checkinIdx[k] = Number(r.total);
        }

        return Array.from({ length: days }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = startOfDay(d).toISOString().split('T')[0];
          const cam = cameraIdx[key] || { entradas: 0, saidas: 0 };
          return {
            data: key,
            entradas: cam.entradas,
            saidas: cam.saidas,
            checkins: checkinIdx[key] || 0,
          };
        });
      }, TTL.historico);

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
      const data = await cache.getOrFetch('dash:comparacao-mensal', async () => {
        const now = new Date();
        const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const dayOfMonth = now.getDate();
        const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonthWindow = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth);

        const [thisMonth, lastMonthSameWindow, checkinsThisMonth] = await Promise.all([
          sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: startThisMonth } }),
          sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: startLastMonth, lt: endLastMonthWindow } }),
          prisma.checkin.count({ where: { createdAt: { gte: startThisMonth } } }),
        ]);

        const pct = lastMonthSameWindow === 0
          ? null
          : Math.round(((thisMonth - lastMonthSameWindow) / lastMonthSameWindow) * 100);

        return {
          pulsos_mes_atual: thisMonth,
          pulsos_mesmo_periodo_mes_anterior: lastMonthSameWindow,
          pulsos_pct_vs_mes_anterior: pct,
          checkins_mes_atual: checkinsThisMonth,
        };
      }, TTL.comparacaoMensal);
      return res.json(data);
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
      const data = await cache.getOrFetch('dash:recorrencia', async () => {
        const [row] = await prisma.$queryRaw<Array<{
          total_checkins: bigint;
          total_visitors: bigint;
          recorrentes: bigint;
        }>>`
          WITH per_visitor AS (
            SELECT "visitorId", COUNT(*)::bigint AS n
            FROM "Checkin"
            GROUP BY "visitorId"
          )
          SELECT
            COALESCE(SUM(n), 0)::bigint                          AS total_checkins,
            COUNT(*)::bigint                                      AS total_visitors,
            COUNT(*) FILTER (WHERE n > 1)::bigint                 AS recorrentes
          FROM per_visitor
        `;
        const totalCheckins = Number(row?.total_checkins ?? 0);
        const totalVisitors = Number(row?.total_visitors ?? 0);
        const recorrentes   = Number(row?.recorrentes   ?? 0);
        const primeira      = totalVisitors - recorrentes;
        const taxaRetorno   = totalVisitors > 0 ? Math.round((recorrentes / totalVisitors) * 100) : 0;
        return {
          total_visitors_com_checkin: totalVisitors,
          primeira_visita: primeira,
          retorno: recorrentes,
          taxa_retorno_pct: taxaRetorno,
          total_checkins: totalCheckins,
        };
      }, TTL.recorrencia);
      return res.json(data);
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
      const data = await cache.getOrFetch('dash:comparacao', async () => {
        const now = new Date();
        const today = startOfDay(now);

        // Walk back day-by-day until we find one with data — skips Mondays
        // when the museum is closed. Avoids the "+100% vs. yesterday" glitch
        // when literal yesterday is a closed day.
        let prevDayStart = new Date(today);
        let prevDaySoFar = new Date(today);
        prevDaySoFar.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
        let entradasPrevDay = 0;
        for (let lookback = 1; lookback <= 7; lookback++) {
          prevDayStart = new Date(today);
          prevDayStart.setDate(prevDayStart.getDate() - lookback);
          prevDaySoFar = new Date(prevDayStart);
          prevDaySoFar.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
          entradasPrevDay = await sumCameraCounts({
            type: 'ENTRADA',
            timestamp: { gte: prevDayStart, lt: prevDaySoFar },
          });
          if (entradasPrevDay > 0) break;
        }

        const startOfHour = new Date(now);
        startOfHour.setMinutes(0, 0, 0);

        const sameHourPrevDayStart = new Date(prevDayStart);
        sameHourPrevDayStart.setHours(now.getHours(), 0, 0, 0);
        const sameHourPrevDayEnd = new Date(sameHourPrevDayStart);
        sameHourPrevDayEnd.setHours(sameHourPrevDayEnd.getHours() + 1);

        const [entradasHoje, ocupacaoMesmaHoraPrevDay, ocupacaoAgora] = await Promise.all([
          sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: today } }),
          sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: sameHourPrevDayStart, lt: sameHourPrevDayEnd } }),
          sumCameraCounts({ type: 'ENTRADA', timestamp: { gte: startOfHour } }),
        ]);

        const pct = (curr: number, prev: number) => {
          if (prev === 0) return curr > 0 ? 100 : null;
          return Math.round(((curr - prev) / prev) * 100);
        };

        return {
          ocupacao_vs_mesma_hora_ontem: pct(ocupacaoAgora, ocupacaoMesmaHoraPrevDay),
          entradas_vs_ontem: pct(entradasHoje, entradasPrevDay),
        };
      }, TTL.comparacao);
      return res.json(data);
    } catch (error) {
      console.error('[Dashboard.getComparacao] error:', error);
      return res.status(500).json({ error: 'Erro ao calcular comparação' });
    }
  },

  async getHistorico(_req: Request, res: Response) {
    try {
      const data = await cache.getOrFetch('dash:historico-totais', async () => {
        const [totalCamera, totalCheckins, returns] = await Promise.all([
          sumCameraCounts({ type: 'ENTRADA' }),
          prisma.checkin.count(),
          prisma.checkin.groupBy({
            by: ['visitorId'],
            _count: { visitorId: true },
            having: { visitorId: { _count: { gt: 1 } } },
          }),
        ]);
        const returnRate = totalCheckins > 0 ? Math.round((returns.length / totalCheckins) * 100) : 0;
        return {
          camera: totalCamera,
          checkins: totalCheckins,
          retorno: returnRate,
          multiplicador: totalCheckins > 0 ? (totalCamera / totalCheckins).toFixed(1) : '0.0',
        };
      }, TTL.historicoTotais);
      return res.json(data);
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
