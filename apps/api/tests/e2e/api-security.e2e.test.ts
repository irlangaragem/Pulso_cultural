/**
 * Testes E2E — Segurança e Headers
 */
import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:3333';

describe('E2E: Postura de Segurança', () => {
  let authToken: string;

  beforeAll(async () => {
    const r = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mam.ba.gov.br', password: 'PUL_$0=CL' })
    });
    authToken = (await r.json()).token;
  });

  function headers(includeAuth = false) {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (includeAuth) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  }

  it('deve incluir headers de segurança do Helmet em /health', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('deve incluir header X-Frame-Options', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.headers.get('x-frame-options')).toBeTruthy();
  });

  it('GET /analytics/demographics — deve estar protegido', async () => {
    expect((await fetch(`${API_URL}/analytics/demographics`)).status).toBe(401);
  });

  it('GET /museums — deve estar protegido', async () => {
    expect((await fetch(`${API_URL}/museums`)).status).toBe(401);
  });

  it('GET /exhibitions — deve estar protegido', async () => {
    expect((await fetch(`${API_URL}/exhibitions`)).status).toBe(401);
  });

  it('POST /admin/reseed — deve rejeitar sem secret', async () => {
    const res = await fetch(`${API_URL}/admin/reseed`, {
      method: 'POST', headers: headers(), body: JSON.stringify({})
    });
    expect(res.status).toBe(403);
  });

  it('POST /admin/reseed — deve rejeitar com secret errado', async () => {
    const res = await fetch(`${API_URL}/admin/reseed`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ secret: 'errado' })
    });
    expect(res.status).toBe(403);
  });

  it('LGPD: /verify deve retornar apenas firstName, sem dados sensíveis', async () => {
    const cpf = `321${Date.now().toString().slice(-8)}`;
    await fetch(`${API_URL}/checkins`, {
      method: 'POST', headers: headers(true),
      body: JSON.stringify({ cpf, name: 'Carlos Alberto Santos', birthYear: 1990, gender: 'MASCULINO', origin: 'SALVADOR', exhibitionId: 'test-security', channel: 'OUTRO' })
    });
    const body = await (await fetch(`${API_URL}/checkins/verify`, {
      method: 'POST', headers: headers(true), body: JSON.stringify({ cpf })
    })).json();
    expect(body.firstName).toBe('Carlos');
    expect(body.birthYear).toBeUndefined();
    expect(body.gender).toBeUndefined();
  });
});
