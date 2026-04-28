import argon2 from 'argon2';
import { env } from '../config/env';

/**
 * Server-side hashing for CPF and email.
 *
 * Salts are read from env. To stay byte-compatible with hashes already in the
 * production DB (which were computed with `SALT.padEnd(16,'0').slice(0,16)` —
 * i.e. the first 16 bytes of the legacy hardcoded salt), we apply the same
 * pad+slice transform on whatever the env provides. Setting CPF_SALT/EMAIL_SALT
 * to the legacy default `pulso-cultural-default-salt-16bytes` reproduces the
 * exact original 16 bytes.
 */
export class HashService {
  private static normalize(salt: string): Buffer {
    return Buffer.from(salt.padEnd(16, '0')).slice(0, 16);
  }

  private static cpfSalt(): Buffer {
    return this.normalize(env.CPF_SALT);
  }

  private static emailSalt(): Buffer {
    return this.normalize(env.EMAIL_SALT);
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
