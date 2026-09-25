import { ValidationError } from '../../../shared/domain/domain-error';

// Hash bcrypt da senha (glossário §5: `passwordHash`; ADR-004; PRD-005 RN-060). O VO só garante o formato
// (`$2a$`/`$2b$`/`$2y$` + custo + 53 caracteres = 60); quem gera e confere o hash é o PasswordHasher (services/),
// para o domínio não depender do pacote bcrypt.
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export class PasswordHash {
  private constructor(readonly value: string) {}

  static fromHash(hash: string): PasswordHash {
    if (typeof hash !== 'string' || !BCRYPT_PATTERN.test(hash)) {
      throw new ValidationError('hash de senha inválido', 'passwordHash');
    }
    return new PasswordHash(hash);
  }
}
