import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';

import { PasswordHash } from '../domain/password-hash';

// Hash e conferência de senha com bcrypt, custo 12 em produção (ADR-004; PRD-005 RN-060). Fica em services/ para o
// domínio não depender do pacote. Testes instanciam com custo menor (ex.: 4). Registrado no módulo por useFactory,
// porque o Nest não injeta um `number` posicional.
export const BCRYPT_COST = 12;

@Injectable()
export class PasswordHasher {
  constructor(private readonly cost: number = BCRYPT_COST) {}

  async hash(plain: string): Promise<PasswordHash> {
    return PasswordHash.fromHash(await hash(plain, this.cost));
  }

  async verify(plain: string, passwordHash: PasswordHash): Promise<boolean> {
    return compare(plain, passwordHash.value);
  }
}
