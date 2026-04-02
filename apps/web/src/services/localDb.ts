export interface VisitorData {
  cpf: string;
  name: string;
  birthYear: number;
  gender: string;
  origin: string;
  email?: string;
  createdAt: string;
}

const DB_KEY = '@pulso-cultural:visitors';
const SYNC_KEY = '@pulso-cultural:sync-queue';

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

  getVisitorByCPF(cpf: string): VisitorData | undefined {
    const visitors = this.getVisitors();
    const normalizedCpf = cpf.replace(/\D/g, '');
    return visitors.find(v => v.cpf.replace(/\D/g, '') === normalizedCpf);
  },

  saveVisitor(visitor: Omit<VisitorData, 'createdAt'>): VisitorData {
    const visitors = this.getVisitors();
    const existingIndex = visitors.findIndex(
      v => v.cpf.replace(/\D/g, '') === visitor.cpf.replace(/\D/g, '')
    );

    if (existingIndex >= 0) {
      // Update existing
      visitors[existingIndex] = { ...visitors[existingIndex], ...visitor };
    } else {
      // Add new
      visitors.push({
        ...visitor,
        createdAt: new Date().toISOString()
      });
    }

    try {
      localStorage.setItem(DB_KEY, JSON.stringify(visitors));
    } catch (e) {
      console.warn('Local storage quota exceeded. Cleaning old data...', e);
      // Basic cleanup: remove oldest 5 visitors if full
      if (visitors.length > 10) {
        visitors.splice(0, 5);
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(visitors));
        } catch (inner) {}
      }
    }
    return existingIndex >= 0 ? visitors[existingIndex] : visitors[visitors.length - 1];
  },

  getSyncQueue(): any[] {
    try {
      const data = localStorage.getItem(SYNC_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  addToSyncQueue(payload: any) {
    const queue = this.getSyncQueue();
    queue.push({
      ...payload,
      timestamp: new Date().toISOString()
    });
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
    } catch (e) {}
  },

  clearSyncQueue() {
    localStorage.removeItem(SYNC_KEY);
  }
};
