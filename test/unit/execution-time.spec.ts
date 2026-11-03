import {
  averageExecutionMinutes,
  buildExecutionSamples,
  executionMinutes,
} from '../../src/modules/service-orders/domain/execution-time';

const at = (iso: string) => new Date(iso);

describe('execution-time', () => {
  describe('executionMinutes', () => {
    it('should return the minutes between start and completion', () => {
      expect(
        executionMinutes({
          serviceOrderId: 'a',
          startedAt: at('2026-11-01T10:00:00Z'),
          completedAt: at('2026-11-01T11:30:00Z'),
        }),
      ).toBe(90);
    });
  });

  describe('averageExecutionMinutes', () => {
    it('should return null when there are no finished orders', () => {
      expect(averageExecutionMinutes([])).toBeNull();
    });

    it('should average the durations and round to 2 decimals', () => {
      const samples = [
        {
          serviceOrderId: 'a',
          startedAt: at('2026-11-01T10:00:00Z'),
          completedAt: at('2026-11-01T11:00:00Z'), // 60
        },
        {
          serviceOrderId: 'b',
          startedAt: at('2026-11-01T10:00:00Z'),
          completedAt: at('2026-11-01T11:00:20Z'), // 60,33...
        },
      ];

      expect(averageExecutionMinutes(samples)).toBe(60.17);
    });
  });

  describe('buildExecutionSamples', () => {
    it('should pair the start and the completion of each order', () => {
      const samples = buildExecutionSamples(
        [{ serviceOrderId: 'a', at: at('2026-11-01T10:00:00Z') }],
        [{ serviceOrderId: 'a', at: at('2026-11-01T12:00:00Z') }],
      );

      expect(samples).toEqual([
        {
          serviceOrderId: 'a',
          startedAt: at('2026-11-01T10:00:00Z'),
          completedAt: at('2026-11-01T12:00:00Z'),
        },
      ]);
    });

    it('should ignore orders without a recorded start', () => {
      expect(
        buildExecutionSamples(
          [],
          [{ serviceOrderId: 'a', at: at('2026-11-01T12:00:00Z') }],
        ),
      ).toEqual([]);
    });

    it('should ignore orders whose completion precedes the start', () => {
      expect(
        buildExecutionSamples(
          [{ serviceOrderId: 'a', at: at('2026-11-01T12:00:00Z') }],
          [{ serviceOrderId: 'a', at: at('2026-11-01T10:00:00Z') }],
        ),
      ).toEqual([]);
    });

    it('should use the first start and the last completion when an order has repeated entries', () => {
      const samples = buildExecutionSamples(
        [
          { serviceOrderId: 'a', at: at('2026-11-01T10:30:00Z') },
          { serviceOrderId: 'a', at: at('2026-11-01T10:00:00Z') },
        ],
        [
          { serviceOrderId: 'a', at: at('2026-11-01T11:00:00Z') },
          { serviceOrderId: 'a', at: at('2026-11-01T12:00:00Z') },
        ],
      );

      expect(samples).toHaveLength(1);
      expect(executionMinutes(samples[0])).toBe(120);
    });
  });
});
