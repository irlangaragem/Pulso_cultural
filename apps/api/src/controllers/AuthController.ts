import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'pulso-cultural-default-secret-key-2026';
if (JWT_SECRET === 'pulso-cultural-default-secret-key-2026') {
  console.warn('⚠️ JWT_SECRET env variable is not set in AuthController. Using default secret.');
}

export const AuthController = {
  async signIn(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token
      });
    } catch (error) {
      console.error('[AuthController] signIn error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};
