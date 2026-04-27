import { describe, it, expect } from 'vitest';
import { ResumoHojeSchema, ResumoHistoricoSchema, HistoricoSchema } from '../../../src/schemas/api-schemas';

describe('Schemas da API', () => {
  describe('ResumoHojeSchema', () => {
    it('deve validar corretamente com todos os campos', () => {
      const dados = {
        entradas_hoje: 10,
        saidas_hoje: 5,
        ocupacao_atual: 5,
        ocupacao_pico: 12,
        atualizado_em: '2023-01-01T10:00:00Z'
      };
      expect(ResumoHojeSchema.parse(dados)).toEqual(dados);
    });

    it('deve aceitar campos legados', () => {
       const dadosLegados = {
         pessoasNoEspaco: 42,
         entradasHoje: 100
       };
       const parsed = ResumoHojeSchema.parse(dadosLegados);
       expect(parsed.pessoasNoEspaco).toBe(42);
       expect(parsed.entradasHoje).toBe(100);
    });

    it('deve ser parcial por padrão (aceitar objeto vazio)', () => {
      expect(ResumoHojeSchema.parse({})).toEqual({});
    });
  });

  describe('HistoricoSchema', () => {
    it('deve validar um array de itens de histórico', () => {
       const dados = [
         { dia: '2023-01-01', entradas: 10, saidas: 8 },
         { dia: '2023-01-02', entradas: 15, saidas: 12 }
       ];
       expect(HistoricoSchema.parse(dados)).toEqual(dados);
    });

    it('deve falhar para dados inválidos', () => {
       expect(() => HistoricoSchema.parse([{ dia: 123 }])).toThrow();
    });
  });
});
