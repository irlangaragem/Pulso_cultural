import argon2 from 'argon2';
import { env } from '../config/env';

/**
 * Server-side hashing for CPF and email.
 * Salts come from env (validated at startup, no fallbacks — see SEC-04).
 * CPF and email use distinct salts so a leak of one doesn't compromise the other.
 */
export class HashService {
  private static cpfSalt(): Buffer {
    // argon2 needs raw bytes ≥ 8. We pass the env value directly as utf8.
    return Buffer.from(env.CPF_SALT, 'utf8');
  }

  private static emailSalt(): Buffer {
    return Buffer.from(env.EMAIL_SALT, 'utf8');
  }

  static async hashCPF(cpf: string): Promise<string> {
    if (typeof cpf !== 'string') {
      throw new Error('Invalid CPF parameter: must be a string');
    }
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      throw new Error('Invalid CPF: must contain 11 digits');
    }
    return argon2.hash(cleanCPF, {
      type: argon2.argon2id,
      salt: this.cpfSalt(),
      parallelism: 1,
      memoryCost: 65536, // 64MB
      timeCost: 3,
    });
  }

  static async hashEmail(email: string): Promise<string> {
    if (typeof email !== 'string') {
      throw new Error('Invalid email parameter: must be a string');
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      throw new Error('Invalid email');
    }
    return argon2.hash(cleanEmail, {
      type: argon2.argon2id,
      salt: this.emailSalt(),
      parallelism: 1,
      memoryCost: 65536,
      timeCost: 3,
    });
  }
}
