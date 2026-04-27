import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../../src/store/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null });
    localStorage.clear();
  });

  it('deve iniciar com user e token nulos', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('deve definir user e token via setAuth', () => {
    const user = { name: 'Admin MAM', email: 'admin@mam.ba.gov.br', role: 'ADMIN' as const };
    useAuthStore.getState().setAuth(user, 'jwt-token-abc');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.token).toBe('jwt-token-abc');
  });

  it('deve limpar user e token ao fazer logout', () => {
    useAuthStore.getState().setAuth(
      { name: 'Admin', email: 'a@b.com', role: 'MANAGER' as const }, 'tok'
    );
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('deve permitir múltiplas atualizações de auth', () => {
    const u1 = { name: 'User1', email: 'u1@t.com', role: 'VISITOR' as const };
    const u2 = { name: 'User2', email: 'u2@t.com', role: 'ADMIN' as const };
    useAuthStore.getState().setAuth(u1, 'tok-1');
    expect(useAuthStore.getState().user?.name).toBe('User1');
    useAuthStore.getState().setAuth(u2, 'tok-2');
    expect(useAuthStore.getState().user?.name).toBe('User2');
    expect(useAuthStore.getState().token).toBe('tok-2');
  });

  it('deve incluir id opcional no user', () => {
    const user = { id: 'abc-123', name: 'Admin', email: 'a@b.com', role: 'ADMIN' as const };
    useAuthStore.getState().setAuth(user, 'tok');
    expect(useAuthStore.getState().user?.id).toBe('abc-123');
  });
});
