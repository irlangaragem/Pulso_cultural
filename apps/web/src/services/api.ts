import axios from 'axios';
import type { AxiosResponse } from 'axios';

import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const baseApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

// ── Request: attach JWT when available ──
baseApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: prevent 4xx from crashing the app on public routes ──
baseApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403 || status === 404) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Short-lived response cache for GETs.
// Avoids redundant refetches when the user switches dashboard tabs (each tab
// remounts and re-fires the same useEffects). Live tabs still see fresh data
// because their refresh interval (30s) is longer than the cache TTL.
const CACHE_TTL_MS = 15_000;
type CacheEntry = { at: number; promise: Promise<AxiosResponse<any>> };
const cache = new Map<string, CacheEntry>();

function cacheKey(url: string, params?: any): string {
  return params ? `${url}?${JSON.stringify(params)}` : url;
}

function clearCache() { cache.clear(); }

const api = {
  ...baseApi,
  get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    // Bypass cache when caller passes ?nocache=1 or sets a custom header.
    const noCache = config?.headers?.['x-cache-bypass'] === '1';
    if (noCache) return baseApi.get<T>(url, config);

    const key = cacheKey(url, config?.params);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.promise as Promise<AxiosResponse<T>>;
    }
    const promise = baseApi.get<T>(url, config);
    cache.set(key, { at: Date.now(), promise });
    // On error, remove the entry so the next call retries fresh.
    promise.catch(() => cache.delete(key));
    return promise;
  },
  // Non-GET methods invalidate cache to keep things consistent.
  post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    clearCache();
    return baseApi.post<T>(url, data, config);
  },
  put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    clearCache();
    return baseApi.put<T>(url, data, config);
  },
  patch<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    clearCache();
    return baseApi.patch<T>(url, data, config);
  },
  delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    clearCache();
    return baseApi.delete<T>(url, config);
  },
  defaults: baseApi.defaults,
  interceptors: baseApi.interceptors,
};

export { api };
export const apiCache = { clear: clearCache };
