interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) return cached;

    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }
}

export const cache = new MemoryCache();
