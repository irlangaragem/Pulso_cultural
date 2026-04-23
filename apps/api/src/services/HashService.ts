import argon2 from 'argon2';

export class HashService {
  private static SALT = process.env.CPF_SALT || 'pulso-cultural-default-salt-16bytes';

  static async hashCPF(cpf: string): Promise<string> {
    if (typeof cpf !== 'string') {
      throw new Error('Invalid CPF parameter: must be a string');
    }
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // For identity matching, we need a deterministic hash.
    // We use Argon2id with a fixed salt from env.
    // Note: salt must be at least 8 bytes for argon2.
    const salt = Buffer.from(this.SALT.padEnd(16, '0')).slice(0, 16);

    return argon2.hash(cleanCPF, {
      type: argon2.argon2id,
      salt,
      parallelism: 1,
      memoryCost: 65536, // 64MB
      timeCost: 3
    });
  }

  static async hashEmail(email: string): Promise<string> {
    if (typeof email !== 'string') {
      throw new Error('Invalid email parameter: must be a string');
    }
    const cleanEmail = email.trim().toLowerCase();
    const salt = Buffer.from(this.SALT.padEnd(16, '0')).slice(0, 16);

    return argon2.hash(cleanEmail, {
      type: argon2.argon2id,
      salt,
      parallelism: 1,
      memoryCost: 65536, // 64MB
      timeCost: 3
    });
  }
}
