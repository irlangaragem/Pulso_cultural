/**
 * Testes E2E — Saúde da API e Endpoints Públicos
 *
 * Verifica se o servidor está vivo, saudável e respondendo corretamente.
 * Pré-requisito: API rodando na porta 3333 (`npm run dev` em apps/api)
 */
import { describe, it, expect } from 'vitest';

const API_URL = 'http://localhost:3333';

describe('E2E: Saúde do Servidor', () => {
  it('GET /health — deve retornar status saudável para API e banco de dados', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.services).toBeDefined();
    expect(body.services.api).toBe('healthy');
    expect(body.services.database).toBe('healthy');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /health — resposta deve ter timestamp ISO válido e recente', async () => {
    const res = await fetch(`${API_URL}/health`);
    const body = await res.json();
    const ts = new Date(body.timestamp);
    expect(ts.getTime()).not.toBeNaN();
    expect(Date.now() - ts.getTime()).toBeLessThan(30000);
  });

  it('GET /health — resposta deve ser JSON', async () => {
    const res = await fetch(`${API_URL}/health`);
    const ct = res.headers.get('content-type');
    expect(ct).toContain('application/json');
  });
});
