// ─── Schema version ────────────────────────────────────────────────────────
// Bump whenever the VisitorData shape changes so stale localStorage entries
// are safely flushed instead of silently misused.
const SCHEMA_VERSION = 1;

export interface VisitorData {
  cpfHash: string;
  name: string;
  birthYear: number;
  gender: string;
  origin: string;
  email?: string;
  createdAt: string;
}

export interface SyncEntry {
  _id: string;          // idempotency key — prevents duplicate syncs
  _ts: string;          // ISO timestamp — used for TTL pruning
  cpfHash?: string;
  name?: string;
  exhibitionId?: string;
  channel?: string;
  [key: string]: unknown;
}

const DB_KEY    = '@pulso-cultural:visitors';
const SYNC_KEY  = '@pulso-cultural:sync-queue';
const VER_KEY   = '@pulso-cultural:schema-version';

// 48 hours in ms — stale offline entries older than this are pruned on sync
const SYNC_TTL_MS = 48 * 60 * 60 * 1000;

async function hashCpf(cpf: string) {
  const normalized = cpf.replace(/\D/g, '');
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a short random idempotency key for sync entries. */
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Migrate or flush stale schema on mount. Called once by useSyncQueue. */
export function checkSchemaVersion() {
  try {
    const stored = Number(localStorage.getItem(VER_KEY) ?? 0);
    if (stored !== SCHEMA_VERSION) {
      // Clear visitors (schema changed) — sync queue is cleared separately
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(SYNC_KEY);
      localStorage.setItem(VER_KEY, String(SCHEMA_VERSION));
      console.info(`[localDb] Schema migrated ${stored}→${SCHEMA_VERSION}. Local cache flushed.`);
    }
  } catch { /* silent */ }
}

export const localDb = {
  getVisitors(): VisitorData[] {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[localDb] Failed to read visitors', e);
      return [];
    }
  },

  async getVisitorByCPF(cpf: string) {
    const visitors = this.getVisitors();
    const targetHash = await hashCpf(cpf);
    return visitors.find(v => v.cpfHash === targetHash);
  },

  async saveVisitor(visitor: any): Promise<VisitorData> {
    const visitors = this.getVisitors();
    const targetHash = await hashCpf(visitor.cpf);
    const existingIndex = visitors.findIndex(v => v.cpfHash === targetHash);

    const visitorToSave: VisitorData = {
      cpfHash:   targetHash,
      name:      visitor.name,
      birthYear: visitor.birthYear,
      gender:    visitor.gender,
      origin:    visitor.origin,
      email:     visitor.email,
      createdAt: visitor.createdAt ?? new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      visitors[existingIndex] = { ...visitors[existingIndex], ...visitorToSave };
    } else {
      visitors.push(visitorToSave);
    }

    try {
      localStorage.setItem(DB_KEY, JSON.stringify(visitors));
    } catch {
      // Quota exceeded — remove only the oldest entry, not 5 at once.
      // If still fails after trim, log a warning but never delete the current record.
      if (visitors.length > 1) {
        visitors.splice(0, 1);
        try { localStorage.setItem(DB_KEY, JSON.stringify(visitors)); } catch { /* ignore */ }
      }
      console.warn('[localDb] Storage quota exceeded. Oldest visitor trimmed.');
    }

    return existingIndex >= 0 ? visitors[existingIndex] : visitorToSave;
  },

  // ─── Sync queue ─────────────────────────────────────────────────────────

  getSyncQueue(): SyncEntry[] {
    try {
      const data = localStorage.getItem(SYNC_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  /**
   * Add a checkin to the offline sync queue.
   * Deduplicates by (cpfHash + exhibitionId + calendar date) so retries
   * never create double entries for the same visitor on the same day.
   */
  addToSyncQueue(payload: Omit<SyncEntry, '_id' | '_ts'>) {
    const queue = this.getSyncQueue();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Idempotency check — skip if same visitor + exhibition already queued today
    const isDuplicate = queue.some(
      e => e.cpfHash === payload.cpfHash &&
           e.exhibitionId === payload.exhibitionId &&
           e._ts.slice(0, 10) === today
    );
    if (isDuplicate) return;

    queue.push({ ...payload, _id: genId(), _ts: new Date().toISOString() });
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
    } catch { /* ignore — entry lost, not catastrophic */ }
  },

  /** Remove entries older than SYNC_TTL_MS (48h). Call before each sync. */
  pruneStaleQueue() {
    const queue = this.getSyncQueue();
    const cutoff = Date.now() - SYNC_TTL_MS;
    const fresh = queue.filter(e => new Date(e._ts).getTime() >= cutoff);
    if (fresh.length !== queue.length) {
      try {
        localStorage.setItem(SYNC_KEY, JSON.stringify(fresh));
        console.info(`[localDb] Pruned ${queue.length - fresh.length} stale sync entries.`);
      } catch { /* ignore */ }
    }
    return fresh;
  },

  clearSyncQueue() {
    localStorage.removeItem(SYNC_KEY);
  },

  clearLocalData() {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(SYNC_KEY);
  },
};
