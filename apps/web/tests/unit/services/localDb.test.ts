import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb } from '../../../src/services/localDb';

describe('localDb', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve retornar array vazio para getVisitors quando localStorage está vazio', () => {
    expect(localDb.getVisitors()).toEqual([]);
  });

  it('deve salvar e recuperar um visitante', async () => {
    const visitante = {
      cpf: '12345678901', name: 'João Silva',
      birthYear: 1990, gender: 'MASCULINO', origin: 'SALVADOR'
    };
    const salvo = await localDb.saveVisitor(visitante);
    expect(salvo.name).toBe('João Silva');
    expect(salvo.createdAt).toBeDefined();
    const visitantes = localDb.getVisitors();
    expect(visitantes).toHaveLength(1);
    expect(visitantes[0].cpfHash).toBeDefined();
    expect(visitantes[0].name).toBe('João Silva');
  });

  it('deve encontrar visitante por CPF (ignorando não-dígitos)', async () => {
    await localDb.saveVisitor({
      cpf: '12345678901', name: 'Maria',
      birthYear: 1985, gender: 'FEMININO', origin: 'EXTERIOR'
    });
    const encontrado = await localDb.getVisitorByCPF('123.456.789-01');
    expect(encontrado).toBeDefined();
    expect(encontrado?.name).toBe('Maria');
  });

  it('deve limpar a fila de sincronização', () => {
    localDb.addToSyncQueue({ cpf: '1', name: 'Espera', birthYear: 2000, gender: 'M', origin: 'A' });
    expect(localDb.getSyncQueue()).toHaveLength(1);
    localDb.clearSyncQueue();
    expect(localDb.getSyncQueue()).toHaveLength(0);
  });
});
