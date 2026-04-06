import { Request, Response } from 'express';
import { cache } from '../utils/cache';
import { ResumoHojeSchema, ResumoHistoricoSchema, HistoricoSchema } from '../schemas/api-schemas';

const EXTERNAL_API_URL = 'https://pulsocultural-production.up.railway.app';
const CACHE_TTL = 30000; // 30 seconds

export const DashboardController = {
  async getResumoHoje(_req: Request, res: Response) {
    try {
      const data = await cache.getOrFetch('resumo-hoje', async () => {
        const response = await fetch(`${EXTERNAL_API_URL}/resumo/hoje`);
        const json = await response.json();
        return ResumoHojeSchema.parse(json);
      }, CACHE_TTL);
      
      return res.json(data);
    } catch (error) {
      console.error('Dashboard /resumo/hoje error:', error);
      return res.status(500).json({ error: 'Erro ao carregar dados em tempo real' });
    }
  },

  async getResumoHistorico(_req: Request, res: Response) {
    try {
      const data = await cache.getOrFetch('resumo-historico', async () => {
        const response = await fetch(`${EXTERNAL_API_URL}/resumo/historico`);
        const json = await response.json();
        return ResumoHistoricoSchema.parse(json);
      }, CACHE_TTL);

      return res.json(data);
    } catch (error) {
      console.error('Dashboard /resumo/historico error:', error);
      return res.status(500).json({ error: 'Erro ao carregar resumo histórico' });
    }
  },

  async getHistorico(_req: Request, res: Response) {
    try {
      const data = await cache.getOrFetch('historico', async () => {
        const response = await fetch(`${EXTERNAL_API_URL}/historico`);
        const json = await response.json();
        return HistoricoSchema.parse(json);
      }, CACHE_TTL);

      return res.json(data);
    } catch (error) {
      console.error('Dashboard /historico error:', error);
      return res.status(500).json({ error: 'Erro ao carregar histórico' });
    }
  },

  async getStream(_req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('retry: 10000\n\n');

    const interval = setInterval(async () => {
      try {
        // Here we use the cache to avoid excessive external HTTP calls
        // Stream will be updated every 10s using potentially cached 30s data
        const result = await cache.getOrFetch('resumo-hoje', async () => {
           const response = await fetch(`${EXTERNAL_API_URL}/resumo/hoje`);
           const json = await response.json();
           return ResumoHojeSchema.parse(json);
        }, CACHE_TTL);

        const data = {
          entradas_hoje: result.entradas_hoje ?? result.entradasHoje,
          saidas_hoje: result.saidas_hoje,
          ocupacao_atual: result.ocupacao_atual ?? result.pessoasNoEspaco,
          ocupacao_pico: result.ocupacao_pico,
          timestamp: result.atualizado_em || new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('Stream fetch error:', err);
      }
    }, 10000);

    res.on('close', () => {
      clearInterval(interval);
    });
  }
};
