import { z } from 'zod';

export const ResumoHojeSchema = z.object({
  pessoasNoEspaco: z.number().optional(), // de legado
  entradasHoje: z.number().optional(),    // de legado
  entradas_hoje: z.number().optional(),
  saidas_hoje: z.number().optional(),
  ocupacao_atual: z.number().optional(),
  // peak tracking removed pending real implementation (LOG-06).
  ocupacao_pico: z.number().nullable().optional(),
  atualizado_em: z.string().optional(),
});

export const ResumoHistoricoSchema = z.object({
  visitantes: z.number().optional(),
  adesao: z.number().optional(),
  idadeMediana: z.number().optional(),
});

export const HistoricoSchema = z.array(z.object({
  data: z.string(), // ISO date (YYYY-MM-DD) — was previously "dia" (LOG-09).
  entradas: z.number(),
  saidas: z.number(),
}));

export type ResumoHoje = z.infer<typeof ResumoHojeSchema>;
export type ResumoHistorico = z.infer<typeof ResumoHistoricoSchema>;
export type Historico = z.infer<typeof HistoricoSchema>;
