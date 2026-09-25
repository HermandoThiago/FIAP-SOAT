import { type DomainEvent } from '../../../shared/domain/domain-event';
import { type Role } from '../../../shared/domain/role';

// Eventos do identity (glossário §8; agregados.md §4): nomes canônicos no passado, em inglês.

export class UserRegistered implements DomainEvent {
  readonly name = 'UserRegistered';
  readonly aggregateId: string;

  constructor(
    readonly payload: { userId: string; roles: Role[] },
    readonly occurredAt: Date,
  ) {
    this.aggregateId = payload.userId;
  }
}

export class UserAuthenticated implements DomainEvent {
  readonly name = 'UserAuthenticated';
  readonly aggregateId: string;

  constructor(
    readonly payload: { userId: string; roles: Role[] },
    readonly occurredAt: Date,
  ) {
    this.aggregateId = payload.userId;
  }
}
