import { useEffect } from 'react';
import { localDb, checkSchemaVersion } from './localDb';
import { api } from './api';

export function useSyncQueue() {
  useEffect(() => {
    // ── Schema guard: flush stale localStorage if schema version changed ──
    checkSchemaVersion();

    const sync = async () => {
      // Prune entries older than 48h before syncing
      const queue = localDb.pruneStaleQueue();
      if (queue.length === 0) return;

      console.log(`[Sync] Attempting to sync ${queue.length} items via batch...`);

      try {
        await api.post('/checkins/batch', queue);
        console.log(`[Sync] Successfully synced ${queue.length} items.`);
        localDb.clearSyncQueue();
      } catch (err) {
        console.warn('[Sync] Batch sync failed. Will retry later.', err);
        // Queue is preserved — entries will retry on next interval or reconnect
      }
    };

    // Sync on mount and every 60s (reduced from 30s to ease server pressure)
    sync();
    const interval = setInterval(sync, 60_000);

    // Sync when coming back online
    window.addEventListener('online', sync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', sync);
    };
  }, []);
}
