import { useEffect, useRef } from 'react';
import { onDashboardEvent } from './socket';
import { apiCache } from './api';

/**
 * Subscribe a dashboard tab to real-time updates from the API.
 *
 * The hook clears the client-side response cache and calls the tab's existing
 * `refresh` function whenever the API emits an `occupancy_update` (visitor /
 * check-in / camera ingest) or `evaluation_update` (feedback) event.
 *
 * Includes a small coalescing window so a burst of events fires a single
 * refresh — avoids hammering the API when several pulses happen at once.
 *
 * Pass `events` to scope to a subset (e.g., the Público tab only cares about
 * occupancy_update; the Impacto tab cares about both).
 */
export function useRealtimeUpdates(
  refresh: () => void | Promise<void>,
  events: Array<'occupancy_update' | 'evaluation_update'> = ['occupancy_update', 'evaluation_update'],
) {
  // Keep the callback in a ref so we don't reattach listeners on every parent render.
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        apiCache.clear();
        ref.current?.();
      }, 250); // coalesce rapid bursts into one refresh
    };
    const offs = events.map(ev => onDashboardEvent(ev, trigger));
    return () => {
      if (timer) clearTimeout(timer);
      offs.forEach(off => off());
    };
    // We intentionally hash events as a string so consumers can pass a
    // different subset on re-render without bouncing the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(',')]);
}
