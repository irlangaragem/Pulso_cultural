import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cache } from './cache';

describe('MemoryCache', () => {
  beforeEach(() => {
    // Clear cache before each test if possible, 
    // or just use different keys.
    vi.useFakeTimers();
  });

  it('should store and retrieve data', () => {
    cache.set('test-key', { foo: 'bar' }, 1000);
    expect(cache.get('test-key')).toEqual({ foo: 'bar' });
  });

  it('should return null for expired keys', () => {
    cache.set('expired-key', 'data', 1000);
    vi.advanceTimersByTime(1500);
    expect(cache.get('expired-key')).toBeNull();
  });

  it('should fetch data if not in cache', async () => {
    const fetcher = vi.fn().mockResolvedValue('fresh-data');
    const data = await cache.getOrFetch('new-key', fetcher, 1000);
    
    expect(data).toBe('fresh-data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should use cached data if available', async () => {
    cache.set('cached-key', 'old-data', 1000);
    const fetcher = vi.fn().mockResolvedValue('fresh-data');
    
    const data = await cache.getOrFetch('cached-key', fetcher, 1000);
    
    expect(data).toBe('old-data');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
