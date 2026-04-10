import { useEffect } from 'react';
import { localDb } from './localDb';
import { api } from './api';

export function useSyncQueue() {
  useEffect(() => {
    const sync = async () => {
      const queue = localDb.getSyncQueue();
      if (queue.length === 0) return;

      console.log(`[Sync] Attempting to sync ${queue.length} items via batch...`);

      try {
        await api.post('/checkins/batch', queue);
        console.log(`[Sync] Successfully synced batch of ${queue.length} items.`);
        localDb.clearSyncQueue();
      } catch (err) {
        console.warn(`[Sync] Batch sync failed. Will retry later.`, err);
      }
    };

    // Sync on mount and every 30 seconds
    sync();
    const interval = setInterval(sync, 30000);

    // Also sync when coming back online
    window.addEventListener('online', sync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', sync);
    };
  }, []);
}
