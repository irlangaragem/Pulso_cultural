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

export const localDb = {
  getVisitors(): VisitorData[] {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
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

    localStorage.setItem(DB_KEY, JSON.stringify(visitors));
    return existingIndex >= 0 ? visitors[existingIndex] : visitors[visitors.length - 1];
  }
};
