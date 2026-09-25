import { AggregateRoot } from '../../../../src/shared/domain/aggregate-root';
import { type DomainEvent } from '../../../../src/shared/domain/domain-event';

class SampleAggregate extends AggregateRoot {
  record(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

function eventNamed(name: string): DomainEvent {
  return { name, aggregateId: '0f8f3e1a-6a1b-4b9c-9a4c-2d7f0a1c5e11', occurredAt: new Date('2026-09-25T10:00:00Z') };
}

describe('AggregateRoot', () => {
  it('should return an empty list when no event was recorded', () => {
    const aggregate = new SampleAggregate();

    expect(aggregate.pullDomainEvents()).toEqual([]);
  });

  it('should return the recorded events in order when pullDomainEvents is called', () => {
    const aggregate = new SampleAggregate();
    const sent = eventNamed('QuoteSent');
    const approved = eventNamed('QuoteApproved');
    aggregate.record(sent);
    aggregate.record(approved);

    const events = aggregate.pullDomainEvents();

    expect(events).toEqual([sent, approved]);
    expect(events[0]).toBe(sent);
  });

  it('should clear the queue when the events are pulled', () => {
    const aggregate = new SampleAggregate();
    aggregate.record(eventNamed('QuoteSent'));
    aggregate.pullDomainEvents();

    expect(aggregate.pullDomainEvents()).toEqual([]);
  });

  it('should return only the new events when more are recorded after a pull', () => {
    const aggregate = new SampleAggregate();
    aggregate.record(eventNamed('QuoteSent'));
    aggregate.pullDomainEvents();
    const approved = eventNamed('QuoteApproved');
    aggregate.record(approved);

    expect(aggregate.pullDomainEvents()).toEqual([approved]);
  });

  it('should return a defensive copy when the caller mutates the pulled list', () => {
    const aggregate = new SampleAggregate();
    aggregate.record(eventNamed('QuoteSent'));

    const pulled = aggregate.pullDomainEvents();
    pulled.push(eventNamed('QuoteRejected'));
    const rejected = eventNamed('ServiceOrderCancelled');
    aggregate.record(rejected);

    expect(aggregate.pullDomainEvents()).toEqual([rejected]);
  });

  it('should return a different array instance when pulled twice', () => {
    const aggregate = new SampleAggregate();

    const first = aggregate.pullDomainEvents();
    const second = aggregate.pullDomainEvents();

    expect(first).not.toBe(second);
  });
});
