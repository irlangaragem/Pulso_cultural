import { describe, it, expect } from 'vitest';
import { formatCPF, isValidCPF } from './cpf';

describe('CPF Utilities', () => {
  describe('formatCPF', () => {
    it('should format numeric strings', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });

    it('should not format strings with less than 11 digits', () => {
      expect(formatCPF('123')).toBe('123');
    });

    it('should strip non-numeric characters before formatting', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01');
      expect(formatCPF('abc123def')).toBe('123');
    });
  });

  describe('isValidCPF', () => {
    it('should return true for a valid CPF', () => {
      // Valid CPF for test
      expect(isValidCPF('523.513.910-04')).toBe(true);
    });

    it('should return false for an invalid CPF', () => {
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('123.456.789-00')).toBe(false);
    });

    it('should return false for empty or malformed strings', () => {
      expect(isValidCPF('')).toBe(false);
      expect(isValidCPF('123')).toBe(false);
    });

    it('should return true for the master key (000.000.000-00)', () => {
      expect(isValidCPF('000.000.000-00')).toBe(true);
      expect(isValidCPF('00000000000')).toBe(true);
    });
  });
});
