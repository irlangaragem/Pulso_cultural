import { describe, it, expect } from 'vitest';
import { HashService } from '../../../src/services/HashService';

describe('HashService', () => {
  describe('hashCPF()', () => {
    it('deve retornar uma string de hash não vazia', async () => {
      const hash = await HashService.hashCPF('12345678901');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('deve produzir hashes determinísticos (mesmo input → mesmo output)', async () => {
      const hash1 = await HashService.hashCPF('12345678901');
      const hash2 = await HashService.hashCPF('12345678901');
      expect(hash1).toBe(hash2);
    });

    it('deve produzir hashes diferentes para CPFs diferentes', async () => {
      const hash1 = await HashService.hashCPF('12345678901');
      const hash2 = await HashService.hashCPF('98765432100');
      expect(hash1).not.toBe(hash2);
    });

    it('deve remover caracteres não-numéricos antes de gerar o hash', async () => {
      const hashFormatado = await HashService.hashCPF('123.456.789-01');
      const hashPuro = await HashService.hashCPF('12345678901');
      expect(hashFormatado).toBe(hashPuro);
    });

    it('deve lançar erro para input que não é string', async () => {
      await expect(HashService.hashCPF(12345 as any)).rejects.toThrow('must be a string');
    });

    it('deve usar formato argon2id (hash começa com $argon2id$)', async () => {
      const hash = await HashService.hashCPF('11111111111');
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });
  });

  describe('hashEmail()', () => {
    it('deve retornar uma string de hash não vazia', async () => {
      const hash = await HashService.hashEmail('user@example.com');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('deve ser case-insensitive (normaliza para minúsculas)', async () => {
      const hash1 = await HashService.hashEmail('User@Example.COM');
      const hash2 = await HashService.hashEmail('user@example.com');
      expect(hash1).toBe(hash2);
    });

    it('deve remover espaços em branco', async () => {
      const hash1 = await HashService.hashEmail('  user@example.com  ');
      const hash2 = await HashService.hashEmail('user@example.com');
      expect(hash1).toBe(hash2);
    });

    it('deve lançar erro para input que não é string', async () => {
      await expect(HashService.hashEmail(null as any)).rejects.toThrow('must be a string');
    });

    it('deve produzir hashes diferentes para emails diferentes', async () => {
      const hash1 = await HashService.hashEmail('alice@example.com');
      const hash2 = await HashService.hashEmail('bob@example.com');
      expect(hash1).not.toBe(hash2);
    });
  });
});
