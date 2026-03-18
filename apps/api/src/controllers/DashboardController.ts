import { Request, Response } from 'express';

export const DashboardController = {
  async getResumoHoje(req: Request, res: Response) {
    return res.json({
      pessoasNoEspaco: 150,
      entradasHoje: 1842,
      checkinsHoje: 847,
      tempoMedio: 34
    });
  },

  async getResumoHistorico(req: Request, res: Response) {
    return res.json({
      visitantes: 847,
      adesao: 46,
      idadeMediana: 29
    });
  },

  async getHistorico(req: Request, res: Response) {
    return res.json({
      camera: 12602,
      checkins: 5966,
      retorno: 32,
      multiplicador: 2.4
    });
  },

  async getStream(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write('retry: 10000\n\n');

    const interval = setInterval(() => {
      const data = { visitorCount: Math.floor(Math.random() * 200) + 100 };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }, 5000);

    req.on('close', () => {
      clearInterval(interval);
    });
  }
};
