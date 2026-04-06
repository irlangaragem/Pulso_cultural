import { useEffect } from 'react';
import { localDb } from './localDb';
import { api } from './api';

export function useSyncQueue() {
  useEffect(() => {
    const sync = async () => {
      const queue = localDb.getSyncQueue();
      if (queue.length === 0) return;

      console.log(`[Sync] Attempting to sync ${queue.length} items...`);
      const remainingItems = [];

      for (const item of queue) {
        try {
          // Attempt to sync each checkin
          await api.post('/checkins', item);
          console.log(`[Sync] Successfully synced checkin for ${item.cpf}`);
        } catch {
          console.warn(`[Sync] Failed to sync checkin for ${item.cpf}, will retry later.`);
          remainingItems.push(item);
        }
      }

      // Update queue with only failed items
      if (remainingItems.length !== queue.length) {
        localDb.clearSyncQueue();
        remainingItems.forEach(item => localDb.addToSyncQueue(item));
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
