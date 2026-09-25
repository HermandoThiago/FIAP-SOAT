import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { type DomainEvent } from '../domain/domain-event';

// Publicador de eventos de domínio em processo (@nestjs/event-emitter — estrutura §5). Na Fase 1 os handlers rodam na
// mesma transação (contextos-delimitados.md §3); trocar o barramento por SQS/SNS é um adaptador (evolucao-fases.md).
@Injectable()
export class DomainEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.emitter.emitAsync(event.name, event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
