import { describe, it, expect } from 'vitest';
import { ResumoHojeSchema, ResumoHistoricoSchema, HistoricoSchema } from './api-schemas';

describe('API Schemas', () => {
  describe('ResumoHojeSchema', () => {
    it('should validate correctly with all fields', () => {
      const data = {
        entradas_hoje: 10,
        saidas_hoje: 5,
        ocupacao_atual: 5,
        ocupacao_pico: 12,
        atualizado_em: '2023-01-01T10:00:00Z'
      };
      expect(ResumoHojeSchema.parse(data)).toEqual(data);
    });

    it('should handle legacy fields', () => {
       const legacyData = {
         pessoasNoEspaco: 42,
         entradasHoje: 100
       };
       const parsed = ResumoHojeSchema.parse(legacyData);
       expect(parsed.pessoasNoEspaco).toBe(42);
       expect(parsed.entradasHoje).toBe(100);
    });

    it('should be partial by default', () => {
      expect(ResumoHojeSchema.parse({})).toEqual({});
    });
  });

  describe('HistoricoSchema', () => {
    it('should validate an array of history items', () => {
       const data = [
         { dia: '2023-01-01', entradas: 10, saidas: 8 },
         { dia: '2023-01-02', entradas: 15, saidas: 12 }
       ];
       expect(HistoricoSchema.parse(data)).toEqual(data);
    });

    it('should fail on invalid data', () => {
       expect(() => HistoricoSchema.parse([{ dia: 123 }])).toThrow();
    });
  });
});
