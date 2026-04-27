import { describe, it, expect } from 'vitest';
import { CSVService } from '../../../src/services/CSVService';

describe('CSVService', () => {
  describe('jsonToCSV()', () => {
    it('deve retornar string vazia para array vazio', () => {
      expect(CSVService.jsonToCSV([])).toBe('');
    });

    it('deve gerar linha de cabeçalho a partir das chaves do objeto', () => {
      const resultado = CSVService.jsonToCSV([{ name: 'João', age: 30 }]);
      const linhas = resultado.split('\n');
      expect(linhas[0]).toBe('name,age');
    });

    it('deve gerar linhas de dados com valores entre aspas', () => {
      const resultado = CSVService.jsonToCSV([{ name: 'Maria', city: 'Salvador' }]);
      const linhas = resultado.split('\n');
      expect(linhas[1]).toBe('"Maria","Salvador"');
    });

    it('deve lidar com múltiplas linhas', () => {
      const dados = [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Carlos' },
        { id: 3, name: 'Beatriz' }
      ];
      const resultado = CSVService.jsonToCSV(dados);
      const linhas = resultado.split('\n');
      expect(linhas).toHaveLength(4);
    });

    it('deve escapar aspas duplas nos valores (RFC 4180)', () => {
      const dados = [{ comment: 'Ela disse "oi"' }];
      const resultado = CSVService.jsonToCSV(dados);
      expect(resultado).toContain('""');
    });

    it('deve tratar valores null/undefined sem quebrar', () => {
      const dados = [{ name: 'Teste', value: null }];
      const resultado = CSVService.jsonToCSV(dados);
      expect(resultado).toContain('"null"');
    });

    it('deve tratar valores numéricos', () => {
      const dados = [{ count: 42, score: 3.14 }];
      const resultado = CSVService.jsonToCSV(dados);
      const linhas = resultado.split('\n');
      expect(linhas[1]).toBe('"42","3.14"');
    });

    it('deve tratar valores booleanos', () => {
      const dados = [{ active: true, deleted: false }];
      const resultado = CSVService.jsonToCSV(dados);
      const linhas = resultado.split('\n');
      expect(linhas[1]).toBe('"true","false"');
    });
  });
});
