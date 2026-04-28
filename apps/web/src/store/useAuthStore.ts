import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Roles match the Prisma `UserRole` enum (LOG-12).
export type UserRole = 'GESTOR' | 'ADMIN';

interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  museumId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'pulso-cultural-auth',
    }
  )
);
