import { describe, it, expect } from 'vitest';
import { formatCPF, isValidCPF } from '../../../src/utils/cpf';

describe('Utilitários de CPF', () => {
  describe('formatCPF', () => {
    it('deve formatar strings numéricas', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });

    it('não deve formatar strings com menos de 11 dígitos', () => {
      expect(formatCPF('123')).toBe('123');
    });

    it('deve remover caracteres não-numéricos antes de formatar', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01');
      expect(formatCPF('abc123def')).toBe('123');
    });
  });

  describe('isValidCPF', () => {
    it('deve retornar true para CPF válido', () => {
      expect(isValidCPF('523.513.910-04')).toBe(true);
    });

    it('deve retornar false para CPF inválido', () => {
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('123.456.789-00')).toBe(false);
    });

    it('deve retornar false para strings vazias ou malformadas', () => {
      expect(isValidCPF('')).toBe(false);
      expect(isValidCPF('123')).toBe(false);
    });

    it('deve retornar true para a chave mestra (000.000.000-00)', () => {
      expect(isValidCPF('000.000.000-00')).toBe(true);
      expect(isValidCPF('00000000000')).toBe(true);
    });
  });
});
