import { EventEmitter2 } from '@nestjs/event-emitter';

import { type DomainEvent } from '../../../../src/shared/domain/domain-event';
import { DomainEventPublisher } from '../../../../src/shared/events/domain-event-publisher';

function eventNamed(name: string): DomainEvent {
  return { name, aggregateId: '0f8f3e1a-6a1b-4b9c-9a4c-2d7f0a1c5e11', occurredAt: new Date('2026-09-25T10:00:00Z') };
}

function createStubEmitter(): {
  emitter: EventEmitter2;
  emitAsync: jest.Mock<Promise<unknown[]>, [string, DomainEvent]>;
} {
  const emitAsync = jest.fn<Promise<unknown[]>, [string, DomainEvent]>().mockResolvedValue([]);
  return { emitter: { emitAsync } as unknown as EventEmitter2, emitAsync };
}

describe('DomainEventPublisher', () => {
  describe('publish', () => {
    it('should call emitAsync with the event name and the event when publishing', async () => {
      const { emitter, emitAsync } = createStubEmitter();
      const publisher = new DomainEventPublisher(emitter);
      const event = eventNamed('QuoteSent');

      await publisher.publish(event);

      expect(emitAsync).toHaveBeenCalledTimes(1);
      expect(emitAsync).toHaveBeenCalledWith('QuoteSent', event);
    });

    it('should deliver the event to the listeners when a real emitter is used', async () => {
      const emitter = new EventEmitter2();
      const received: DomainEvent[] = [];
      emitter.on('QuoteSent', (event: DomainEvent) => {
        received.push(event);
      });
      const publisher = new DomainEventPublisher(emitter);
      const event = eventNamed('QuoteSent');

      await publisher.publish(event);

      expect(received).toEqual([event]);
    });

    it('should reject when a listener fails', async () => {
      const emitter = new EventEmitter2();
      emitter.on('QuoteSent', () => {
        throw new Error('handler failed');
      });
      const publisher = new DomainEventPublisher(emitter);

      await expect(publisher.publish(eventNamed('QuoteSent'))).rejects.toThrow('handler failed');
    });
  });

  describe('publishAll', () => {
    it('should publish the events in order when given several events', async () => {
      const { emitter, emitAsync } = createStubEmitter();
      const publisher = new DomainEventPublisher(emitter);
      const events = [eventNamed('QuoteSent'), eventNamed('QuoteApproved'), eventNamed('StockReserved')];

      await publisher.publishAll(events);

      expect(emitAsync.mock.calls).toEqual([
        ['QuoteSent', events[0]],
        ['QuoteApproved', events[1]],
        ['StockReserved', events[2]],
      ]);
    });

    it('should wait for the listeners of one event before publishing the next when listeners are async', async () => {
      const emitter = new EventEmitter2();
      const timeline: string[] = [];
      // EventEmitter2 tipa o listener como void, mas emitAsync aguarda a promessa devolvida por ele.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      emitter.on('QuoteApproved', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        timeline.push('QuoteApproved handled');
      });
      emitter.on('StockReserved', () => {
        timeline.push('StockReserved handled');
      });
      const publisher = new DomainEventPublisher(emitter);

      await publisher.publishAll([eventNamed('QuoteApproved'), eventNamed('StockReserved')]);

      expect(timeline).toEqual(['QuoteApproved handled', 'StockReserved handled']);
    });

    it('should not emit anything when the list is empty', async () => {
      const { emitter, emitAsync } = createStubEmitter();
      const publisher = new DomainEventPublisher(emitter);

      await publisher.publishAll([]);

      expect(emitAsync).not.toHaveBeenCalled();
    });
  });
});
