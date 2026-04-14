import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'pulso-cultural-default-secret-key-2026';
if (JWT_SECRET === 'pulso-cultural-default-secret-key-2026' && process.env.NODE_ENV !== 'production') {
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
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      return res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
      console.error('[AuthController] changePassword error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};
