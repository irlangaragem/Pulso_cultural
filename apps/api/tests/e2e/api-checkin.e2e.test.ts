/**
 * Testes E2E — Fluxo de Check-in do Visitante
 *
 * As rotas /checkins são PÚBLICAS (registradas antes do middleware auth).
 * Não é necessário autenticação para registrar visitantes.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:3333';

describe('E2E: Fluxo de Check-in do Visitante', () => {
  let exhibitionId: string;
  let authToken: string;

  beforeAll(async () => {
    // Auth needed only to list exhibitions
    const loginRes = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mam.ba.gov.br', password: 'PUL_$0=CL' })
    });
    authToken = (await loginRes.json()).token;

    const exRes = await fetch(`${API_URL}/exhibitions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (exRes.ok) {
      const exs = await exRes.json();
      if (Array.isArray(exs) && exs.length > 0) exhibitionId = exs[0].id;
    }
  });

  it('POST /checkins — deve rejeitar requisição sem CPF', async () => {
    const res = await fetch(`${API_URL}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Teste', exhibitionId: 'falso' })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('CPF');
  });

  it('POST /checkins — deve rejeitar requisição sem exhibitionId', async () => {
    const res = await fetch(`${API_URL}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: '12345678901', name: 'Teste' })
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('exhibitionId');
  });

  it('POST /checkins — deve criar checkin para novo visitante', async () => {
    if (!exhibitionId) { console.warn('⚠️ Sem exhibition — pulando'); return; }
    const cpf = `999${Date.now().toString().slice(-8)}`;
    const res = await fetch(`${API_URL}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, name: 'Visitante E2E', birthYear: 1990, gender: 'PREFIRO_NAO_DIZER', origin: 'SALVADOR', exhibitionId, channel: 'REDES_SOCIAIS' })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.visitorId).toBeDefined();
  });

  it('POST /checkins/verify — deve encontrar visitante registrado', async () => {
    if (!exhibitionId) { console.warn('⚠️ Sem exhibition — pulando'); return; }
    const cpf = `555${Date.now().toString().slice(-8)}`;
    const regRes = await fetch(`${API_URL}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, name: 'Maria Verificação', birthYear: 1985, gender: 'FEMININO', origin: 'INTERIOR_BA', exhibitionId, channel: 'INDICACAO' })
    });
    expect(regRes.status).toBe(201);
    const verifyRes = await fetch(`${API_URL}/checkins/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf })
    });
    expect(verifyRes.status).toBe(200);
    const body = await verifyRes.json();
    expect(body.success).toBe(true);
    expect(body.firstName).toBe('Maria');
    expect(body.origin).toBe('INTERIOR_BA');
  });

  it('POST /checkins/verify — deve retornar 404 para CPF desconhecido', async () => {
    const res = await fetch(`${API_URL}/checkins/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: `111${Date.now().toString().slice(-8)}` })
    });
    expect(res.status).toBe(404);
  });

  it('POST /checkins/verify — deve retornar 400 sem CPF', async () => {
    const res = await fetch(`${API_URL}/checkins/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });

  it('POST /checkins/batch — deve aceitar array de checkins', async () => {
    if (!exhibitionId) { console.warn('⚠️ Sem exhibition — pulando'); return; }
    const res = await fetch(`${API_URL}/checkins/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ cpf: `888${Date.now().toString().slice(-8)}`, name: 'Batch 1', birthYear: 2000, gender: 'MASCULINO', origin: 'OUTRO_ESTADO', exhibitionId, channel: 'PASSOU_NA_FRENTE' }])
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.skipped).toBeDefined();
  });

  it('POST /checkins/batch — deve rejeitar body que não é array', async () => {
    const res = await fetch(`${API_URL}/checkins/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: '123' })
    });
    expect(res.status).toBe(400);
  });

  it('Jornada completa: registrar → check-in → verificar', async () => {
    if (!exhibitionId) { console.warn('⚠️ Sem exhibition — pulando'); return; }
    const cpf = `777${Date.now().toString().slice(-8)}`;
    const checkinRes = await fetch(`${API_URL}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, name: 'Jornada Completa', birthYear: 1975, gender: 'FEMININO', origin: 'INTERNACIONAL', exhibitionId, channel: 'ESCOLA_FACULDADE' })
    });
    expect(checkinRes.status).toBe(201);
    const verifyRes = await fetch(`${API_URL}/checkins/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf })
    });
    expect(verifyRes.status).toBe(200);
    const v = await verifyRes.json();
    expect(v.firstName).toBe('Jornada');
    expect(v.origin).toBe('INTERNACIONAL');
  });
});
