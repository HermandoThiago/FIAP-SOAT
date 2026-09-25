import { ConflictException } from '@nestjs/common';

import { type User } from '../../../../src/modules/identity/domain/user';
import { type UserRepository } from '../../../../src/modules/identity/repositories/user.repository';
import { type Email } from '../../../../src/shared/domain/email';

// Repositório fake em memória (estrategia-de-testes.md §1): mesma interface pública do UserRepository, inclusive o
// 409 por e-mail/customerId duplicado que o banco garante.
export class InMemoryUserRepository {
  readonly users: User[] = [];

  findByEmail(email: Email): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.email.equals(email)) ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  existsByEmail(email: Email): Promise<boolean> {
    return Promise.resolve(this.users.some((user) => user.email.equals(email)));
  }

  insert(user: User): Promise<void> {
    if (this.users.some((existing) => existing.email.equals(user.email))) {
      return Promise.reject(new ConflictException('E-mail já cadastrado'));
    }
    if (user.customerId && this.users.some((existing) => existing.customerId === user.customerId)) {
      return Promise.reject(new ConflictException('Cliente já possui usuário de acesso'));
    }
    this.users.push(user);
    return Promise.resolve();
  }

  /** O UserRepository real tem membro privado (PrismaService); o fake é estruturalmente equivalente no que importa. */
  asRepository(): UserRepository {
    return this as unknown as UserRepository;
  }
}
