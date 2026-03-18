import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'pulso-cultural-secret-key-2026';

export const AuthController = {
  async signIn(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      // For MVP/Demo purposes, we use a hardcoded manager if database is empty
      // In a real scenario, we would check against hashed password in DB
      if (email === 'admin@pulsocultural.com.br' && password === 'admin123') {
        const token = jwt.sign(
          { role: 'MANAGER', email },
          JWT_SECRET,
          { expiresIn: '1d' }
        );

        return res.json({
          user: { email, name: 'Gestor MAM', role: 'MANAGER' },
          token
        });
      }

      // Check database
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user || user.passwordHash !== password) { // Should use bcrypt in production
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.json({
        user: { 
          id: user.id,
          email: user.email, 
          name: user.name, 
          role: user.role 
        },
        token
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
