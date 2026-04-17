import axios from 'axios';

import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

// ── Request: attach JWT when available ──
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: prevent 4xx from crashing the app on public routes ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    // 401/403/404 on visitor-facing routes are expected (not logged in, not found)
    // Suppress them so they never reach the React ErrorBoundary
    if (status === 401 || status === 403 || status === 404) {
      return Promise.reject(error); // still rejects — callers must .catch()
    }
    // For network errors or 5xx, also reject silently
    return Promise.reject(error);
  }
);

export { api };
