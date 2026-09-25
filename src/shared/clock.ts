// Relógio injetável (visao-geral.md §6; glossário §6): SystemClock em produção, FixedClock nos testes.
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('Clock');

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private current: Date;

  constructor(fixedAt: Date | string) {
    this.current = new Date(fixedAt);
  }

  now(): Date {
    return new Date(this.current);
  }

  /** Avança o relógio (útil para testar expiração e marcos temporais). */
  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }

  set(fixedAt: Date | string): void {
    this.current = new Date(fixedAt);
  }
}
