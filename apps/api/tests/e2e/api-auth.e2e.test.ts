/**
 * Testes E2E — Fluxo de Autenticação
 */
import { describe, it, expect } from 'vitest';

const API_URL = 'http://localhost:3333';
const ADMIN_EMAIL = 'admin@mam.ba.gov.br';
const ADMIN_PASSWORD = 'PUL_$0=CL';

describe('E2E: Fluxo de Autenticação', () => {
  let tokenValido: string;

  it('POST /auth/signin — deve rejeitar credenciais ausentes', async () => {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeDefined();
  });

  it('POST /auth/signin — deve rejeitar senha incorreta', async () => {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'errada' })
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain('inválidas');
  });

  it('POST /auth/signin — deve rejeitar email inexistente', async () => {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@x.com', password: 'y' })
    });
    expect(res.status).toBe(401);
  });

  it('POST /auth/signin — deve autenticar com credenciais válidas', async () => {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe(ADMIN_EMAIL);
    expect(body.user.role).toBe('GESTOR');
    tokenValido = body.token;
  });

  it('Token JWT deve ter 3 partes e payload correto', () => {
    expect(tokenValido).toBeDefined();
    const partes = tokenValido.split('.');
    expect(partes).toHaveLength(3);
    const payload = JSON.parse(atob(partes[1]));
    expect(payload.email).toBe(ADMIN_EMAIL);
    expect(payload.role).toBe('GESTOR');
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('GET /resumo/hoje — deve rejeitar sem token', async () => {
    expect((await fetch(`${API_URL}/resumo/hoje`)).status).toBe(401);
  });

  it('GET /analytics/demographics — deve rejeitar sem token', async () => {
    expect((await fetch(`${API_URL}/analytics/demographics`)).status).toBe(401);
  });

  it('GET /resumo/hoje — deve aceitar com token válido', async () => {
    const res = await fetch(`${API_URL}/resumo/hoje`, {
      headers: { Authorization: `Bearer ${tokenValido}` }
    });
    expect(res.status).not.toBe(401);
  });
});
