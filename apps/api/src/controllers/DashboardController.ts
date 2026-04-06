import { Request, Response } from 'express';

const EXTERNAL_API_URL = 'https://pulsocultural-production.up.railway.app';

interface ResumoHojeResponse {
  entradas_hoje?: number;
  saidas_hoje?: number;
  ocupacao_atual?: number;
  ocupacao_pico?: number;
  atualizado_em?: string;
}

export const DashboardController = {
  async getResumoHoje(req: Request, res: Response) {
    try {
      const response = await fetch(`${EXTERNAL_API_URL}/resumo/hoje`);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('API /resumo/hoje fetch error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getResumoHistorico(req: Request, res: Response) {
    try {
      const response = await fetch(`${EXTERNAL_API_URL}/resumo/historico`);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('API /resumo/historico fetch error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getHistorico(req: Request, res: Response) {
    try {
      const response = await fetch(`${EXTERNAL_API_URL}/historico`);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('API /historico fetch error:', error);
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
        const response = await fetch(`${EXTERNAL_API_URL}/resumo/hoje`);
        const result = (await response.json()) as ResumoHojeResponse;

        const data = {
          entradas_hoje: result.entradas_hoje,
          saidas_hoje: result.saidas_hoje,
          ocupacao_atual: result.ocupacao_atual,
          ocupacao_pico: result.ocupacao_pico,
          timestamp: result.atualizado_em || new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('Stream fetch error:', err);
      }
    }, 10000);

    req.on('close', () => {
      clearInterval(interval);
    });
  }
};
