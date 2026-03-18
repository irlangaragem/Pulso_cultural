import { createHash } from 'crypto';

export class HashService {
  private static SALT = process.env.CPF_SALT || 'pulso-cultural-default-salt';

  static hashCPF(cpf: string): string {
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');
    
    return createHash('sha256')
      .update(cleanCPF + this.SALT)
      .digest('hex');
  }
}
