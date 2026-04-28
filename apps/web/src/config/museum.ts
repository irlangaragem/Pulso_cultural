// Single source of truth for the active museum slug on the web client.
// Override at build time via VITE_MUSEUM_SLUG; defaults align with the API
// seed and PILOT_MUSEUM_SLUG env on the backend (LOG-10).
export const MUSEUM_SLUG: string =
  (import.meta as any).env?.VITE_MUSEUM_SLUG || 'mam-bahia';
