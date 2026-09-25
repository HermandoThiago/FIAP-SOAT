import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma, type User as UserRecord } from '../../../generated/prisma/client';
import { Email } from '../../../shared/domain/email';
import { Role } from '../../../shared/domain/role';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PasswordHash } from '../domain/password-hash';
import { User } from '../domain/user';

const KNOWN_ROLES = new Set<string>(Object.values(Role));
const UNIQUE_VIOLATION = 'P2002';

// Repositório do agregado User sobre identity.users (modelo-de-dados.md §3): roles gravadas como CSV
// ("ATTENDANT,MANAGER" | "CUSTOMER"), customer_id null ↔ undefined. O id nasce no domínio (ADR-009).
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email: email.value } });
    return record ? toDomain(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const record = await this.prisma.user.findUnique({ where: { email: email.value }, select: { id: true } });
    return record !== null;
  }

  /** Unicidade de e-mail (e de customer_id) garantida pelo banco: violação → 409. */
  async insert(user: User): Promise<void> {
    try {
      await this.prisma.user.create({ data: toPersistence(user) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          uniqueTargetOf(error).includes('customer_id')
            ? 'Cliente já possui usuário de acesso'
            : 'E-mail já cadastrado',
        );
      }
      throw error;
    }
  }
}

function toDomain(record: UserRecord): User {
  return User.reconstitute({
    id: record.id,
    name: record.name,
    email: Email.parse(record.email),
    passwordHash: PasswordHash.fromHash(record.passwordHash),
    roles: parseRoles(record.roles),
    customerId: record.customerId ?? undefined,
    active: record.active,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function toPersistence(user: User): Prisma.UserCreateInput {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
    passwordHash: user.passwordHash.value,
    roles: user.roles.join(','),
    customerId: user.customerId ?? null,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function parseRoles(csv: string): Role[] {
  return csv.split(',').map((raw) => {
    const role = raw.trim();
    if (!KNOWN_ROLES.has(role)) {
      throw new Error(`Unknown role stored in identity.users: ${role}`);
    }
    return role as Role;
  });
}

function uniqueTargetOf(error: Prisma.PrismaClientKnownRequestError): string {
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target)) {
    return target.map(String).join(',');
  }
  return typeof target === 'string' ? target : '';
}
