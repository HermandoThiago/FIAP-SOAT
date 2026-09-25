import { FixedClock, SystemClock } from '../../../src/shared/clock';

describe('SystemClock', () => {
  it('should return the current time when now is called', () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

describe('FixedClock', () => {
  it('should always return the fixed instant when now is called', () => {
    const clock = new FixedClock('2026-10-05T14:30:00Z');

    expect(clock.now().toISOString()).toBe('2026-10-05T14:30:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-10-05T14:30:00.000Z');
  });

  it('should return a copy when now is called so callers cannot mutate the clock', () => {
    const clock = new FixedClock('2026-10-05T14:30:00Z');

    clock.now().setFullYear(2000);

    expect(clock.now().toISOString()).toBe('2026-10-05T14:30:00.000Z');
  });

  it('should move forward when advance is called', () => {
    const clock = new FixedClock('2026-10-05T14:30:00Z');

    clock.advance(90 * 60 * 1000);

    expect(clock.now().toISOString()).toBe('2026-10-05T16:00:00.000Z');
  });

  it('should jump to the new instant when set is called', () => {
    const clock = new FixedClock('2026-10-05T14:30:00Z');

    clock.set(new Date('2026-11-08T09:00:00Z'));

    expect(clock.now().toISOString()).toBe('2026-11-08T09:00:00.000Z');
  });
});
