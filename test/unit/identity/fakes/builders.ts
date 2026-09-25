import { UserAuthenticated, UserRegistered } from '../../../../src/modules/identity/domain/events';
import { PasswordHash } from '../../../../src/modules/identity/domain/password-hash';
import { User, type UserProps } from '../../../../src/modules/identity/domain/user';
import { type AuthenticatedUser } from '../../../../src/shared/auth/principal';
import { Email } from '../../../../src/shared/domain/email';
import { type DomainEvent } from '../../../../src/shared/domain/domain-event';
import { type DomainEventPublisher } from '../../../../src/shared/events/domain-event-publisher';
import { Role } from '../../../../src/shared/domain/role';

// Dados fictícios determinísticos para os testes do identity (estrategia-de-testes.md §3).
export const FIXED_NOW = new Date('2026-09-25T12:00:00.000Z');
export const USER_ID = '6f1d2c3b-4a5e-4f60-8b7c-9d0e1f2a3b4c';
export const CUSTOMER_ID = 'c719b4b1-df0d-4057-a9dd-5b8f9be2898b';
export const SERVICE_ORDER_ID = '2f109cde-cc93-44a8-89bf-6554894ff689';
/** bcrypt válido no formato (custo 4); o conteúdo só importa quando o teste gera o próprio hash. */
export const SAMPLE_HASH = '$2b$04$oI8woj569c6lcFXlKOZiAu5vcXPafz4jthrlR1DXaJEOhQY0MGdcO';

export function aUser(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: USER_ID,
    name: 'Mecânico da oficina',
    email: Email.parse('mechanic@test.oficina.local'),
    passwordHash: PasswordHash.fromHash(SAMPLE_HASH),
    roles: [Role.MECHANIC],
    active: true,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  });
}

export function anActor(...roles: Role[]): AuthenticatedUser {
  return { id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', roles };
}

export interface PublisherStub {
  publisher: DomainEventPublisher;
  published: DomainEvent[];
}

/** DomainEventPublisher falso que só guarda o que foi publicado (sem EventEmitter2). */
export function createPublisherStub(): PublisherStub {
  const published: DomainEvent[] = [];
  const publisher = {
    publish: (event: DomainEvent) => {
      published.push(event);
      return Promise.resolve();
    },
    publishAll: (events: DomainEvent[]) => {
      published.push(...events);
      return Promise.resolve();
    },
  } as unknown as DomainEventPublisher;
  return { publisher, published };
}

export function isUserRegistered(event: DomainEvent): event is UserRegistered {
  return event instanceof UserRegistered;
}

export function isUserAuthenticated(event: DomainEvent): event is UserAuthenticated {
  return event instanceof UserAuthenticated;
}
