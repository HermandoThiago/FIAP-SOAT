import { type DomainEvent } from './domain-event';

// Raiz de agregado (agregados.md): guarda os eventos emitidos pelos comandos até o serviço de aplicação publicá-los
// (na mesma transação, na Fase 1 — contextos-delimitados.md §3).
export abstract class AggregateRoot {
  private readonly domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /** Devolve os eventos pendentes e limpa a fila. */
  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }
}
