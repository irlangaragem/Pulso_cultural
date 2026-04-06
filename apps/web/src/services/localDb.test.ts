import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb } from './localDb';

describe('localDb', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return an empty array for getVisitors when localStorage is empty', () => {
    expect(localDb.getVisitors()).toEqual([]);
  });

  it('should save and retrieve a visitor', () => {
    const visitor = {
      cpf: '12345678901',
      name: 'João Silva',
      birthYear: 1990,
      gender: 'MASCULINO',
      origin: 'SALVADOR'
    };

    const saved = localDb.saveVisitor(visitor);
    expect(saved.name).toBe('João Silva');
    expect(saved.createdAt).toBeDefined();

    const visitors = localDb.getVisitors();
    expect(visitors).toHaveLength(1);
    expect(visitors[0].cpf).toBe('12345678901');
  });

  it('should find a visitor by CPF (ignoring non-digits)', () => {
    localDb.saveVisitor({
      cpf: '12345678901',
      name: 'Maria',
      birthYear: 1985,
      gender: 'FEMININO',
      origin: 'EXTERIOR'
    });

    const found = localDb.getVisitorByCPF('123.456.789-01');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Maria');
  });

  it('should clear the sync queue', () => {
    localDb.addToSyncQueue({ cpf: '1', name: 'Wait', birthYear: 2000, gender: 'M', origin: 'A' });
    expect(localDb.getSyncQueue()).toHaveLength(1);
    
    localDb.clearSyncQueue();
    expect(localDb.getSyncQueue()).toHaveLength(0);
  });
});
