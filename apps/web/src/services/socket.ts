import { io, type Socket } from 'socket.io-client';

/**
 * Singleton Socket.IO client for the dashboard.
 *
 * The API emits two event types on writes:
 *  - `occupancy_update`  fired on visitor pulse / check-in / camera ingest
 *  - `evaluation_update` fired when a visitor submits feedback
 *
 * Consumers register listeners; we wire one connection per page session and
 * never tear it down explicitly — the browser closes it on tab unload.
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3333';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 8000,
  });

  // Light dev-mode logging so the console shows the connection state when debugging.
  if ((import.meta as any).env?.DEV) {
    socket.on('connect',    () => console.log('[socket] connected', socket?.id));
    socket.on('disconnect', (reason) => console.log('[socket] disconnected:', reason));
    socket.on('connect_error', (err) => console.warn('[socket] connect_error:', err.message));
  }

  return socket;
}

/** Subscribe to one of the dashboard's real-time events. Returns a teardown fn. */
export function onDashboardEvent(
  event: 'occupancy_update' | 'evaluation_update',
  handler: (payload: any) => void,
): () => void {
  const s = getSocket();
  s.on(event, handler);
  return () => { s.off(event, handler); };
}
