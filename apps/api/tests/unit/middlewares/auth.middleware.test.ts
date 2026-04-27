import { describe, it, expect, vi } from 'vitest';
import { authMiddleware } from '../../../src/middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pulso-cultural-default-secret-key-2026';

function criarMockReqRes(authHeader?: string) {
  const req: any = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {}
  };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('authMiddleware', () => {
  it('deve retornar 401 se o header Authorization não estiver presente', () => {
    const { req, res, next } = criarMockReqRes();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 se o formato do header estiver errado (sem espaço)', () => {
    const { req, res, next } = criarMockReqRes('FormatoInvalido');
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro no token' });
  });

  it('deve retornar 401 se o scheme não for Bearer', () => {
    const { req, res, next } = criarMockReqRes('Basic algum-token');
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token malformatado' });
  });

  it('deve retornar 401 para JWT inválido ou expirado', () => {
    const { req, res, next } = criarMockReqRes('Bearer token.invalido.aqui');
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
  });

  it('deve chamar next() e anexar usuário para JWT válido', () => {
    const payload = { id: 'user-123', role: 'GESTOR', email: 'admin@mam.ba.gov.br' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = criarMockReqRes(`Bearer ${token}`);

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-123');
    expect(req.user.role).toBe('GESTOR');
    expect(req.user.email).toBe('admin@mam.ba.gov.br');
  });

  it('deve aceitar o scheme Bearer de forma case-insensitive', () => {
    const payload = { id: 'user-456' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = criarMockReqRes(`bearer ${token}`);

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
