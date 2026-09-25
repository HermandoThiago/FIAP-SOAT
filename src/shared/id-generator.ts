import { randomUUID } from 'node:crypto';

// Ids UUID v4 gerados na aplicação, nunca pelo banco (ADR-009): UuidV4IdGenerator em produção, FixedIdGenerator nos
// testes (determinismo).
export interface IdGenerator {
  next(): string;
}

export const ID_GENERATOR = Symbol('IdGenerator');

export class UuidV4IdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

export class FixedIdGenerator implements IdGenerator {
  private readonly queue: string[];

  constructor(ids: string[]) {
    if (ids.length === 0) {
      throw new Error('FixedIdGenerator requires at least one id');
    }
    this.queue = [...ids];
  }

  /** Devolve os ids na ordem informada; o último se repete quando a fila acaba. */
  next(): string {
    if (this.queue.length === 1) {
      return this.queue[0];
    }
    return this.queue.shift() as string;
  }
}
