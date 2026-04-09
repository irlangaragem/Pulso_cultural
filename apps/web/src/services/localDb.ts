export interface VisitorData {
  cpfHash: string;
  name: string;

  birthYear: number;
  gender: string;
  origin: string;
  email?: string;
  createdAt: string;
}

const DB_KEY = '@pulso-cultural:visitors';
const SYNC_KEY = '@pulso-cultural:sync-queue';

function hashCpf(cpf: string) {
  const normalized = cpf.replace(/\D/g, '');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return 'p_' + Math.abs(hash).toString(36);
}


export const localDb = {
  getVisitors(): VisitorData[] {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read localDb', e);
      return [];
    }
  },

  getVisitorByCPF(cpf: string): any | undefined {
    const visitors = this.getVisitors();
    const targetHash = hashCpf(cpf);
    return visitors.find(v => v.cpfHash === targetHash);
  },

  saveVisitor(visitor: any): any {
    const visitors = this.getVisitors();
    const targetHash = hashCpf(visitor.cpf);
    const existingIndex = visitors.findIndex(v => v.cpfHash === targetHash);

    const visitorToSave = {
      ...visitor,
      cpfHash: targetHash,
    };
    delete visitorToSave.cpf; // Remove raw PII before saving

    if (existingIndex >= 0) {
      visitors[existingIndex] = { ...visitors[existingIndex], ...visitorToSave };
    } else {
      visitors.push({
        ...visitorToSave,
        createdAt: new Date().toISOString()
      });
    }


    try {
      localStorage.setItem(DB_KEY, JSON.stringify(visitors));
    } catch {
      console.warn('Local storage quota exceeded. Cleaning old data...');
      // Basic cleanup: remove oldest 5 visitors if full
      if (visitors.length > 10) {
        visitors.splice(0, 5);
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(visitors));
        } catch {
          // Silent cleanup
        }
      }
    }
    return existingIndex >= 0 ? visitors[existingIndex] : visitors[visitors.length - 1];
  },

  getSyncQueue(): any[] {
    try {
      const data = localStorage.getItem(SYNC_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  addToSyncQueue(payload: any) {
    const queue = this.getSyncQueue();
    queue.push({
      ...payload,
      timestamp: new Date().toISOString()
    });
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
    } catch {
      // Ignore storage errors on sync queue
    }
  },


  clearSyncQueue() {
    localStorage.removeItem(SYNC_KEY);
  },

  clearLocalData() {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(SYNC_KEY);
  }
};

