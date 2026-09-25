// Eventos de domínio nomeados no passado, em inglês (glossário §8; agregados.md §4).
export interface DomainEvent {
  /** Nome canônico do evento, ex.: 'UserRegistered'. */
  readonly name: string;
  /** Id do agregado que emitiu o evento. */
  readonly aggregateId: string;
  readonly occurredAt: Date;
}
