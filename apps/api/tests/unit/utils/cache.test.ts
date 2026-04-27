import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cache } from '../../../src/utils/cache';

describe('MemoryCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('deve armazenar e recuperar dados', () => {
    cache.set('chave-teste', { foo: 'bar' }, 1000);
    expect(cache.get('chave-teste')).toEqual({ foo: 'bar' });
  });

  it('deve retornar null para chaves expiradas', () => {
    cache.set('chave-expirada', 'dados', 1000);
    vi.advanceTimersByTime(1500);
    expect(cache.get('chave-expirada')).toBeNull();
  });

  it('deve buscar dados se não estiverem no cache', async () => {
    const fetcher = vi.fn().mockResolvedValue('dados-novos');
    const dados = await cache.getOrFetch('chave-nova', fetcher, 1000);

    expect(dados).toBe('dados-novos');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('deve usar dados do cache se disponíveis', async () => {
    cache.set('chave-cacheada', 'dados-antigos', 1000);
    const fetcher = vi.fn().mockResolvedValue('dados-novos');

    const dados = await cache.getOrFetch('chave-cacheada', fetcher, 1000);

    expect(dados).toBe('dados-antigos');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
