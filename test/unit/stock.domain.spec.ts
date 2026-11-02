import {
  StockRuleError,
  adjust,
  availableQuantity,
  issue,
  receive,
  release,
  reserve,
  withdrawReserved,
} from '../../src/modules/catalog/domain/stock';

const level = (quantidade: number, reservada = 0) => ({
  quantidade,
  reservada,
});
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as StockRuleError).code;
  }
  return undefined;
};

describe('stock domain', () => {
  describe('availableQuantity', () => {
    it('should be the physical balance minus the reserved quantity', () => {
      expect(availableQuantity(level(10, 3.5))).toBe(6.5);
    });

    it('should not suffer from floating point errors with 3 decimals', () => {
      expect(availableQuantity(level(0.3, 0.1))).toBe(0.2);
    });
  });

  describe('receive', () => {
    it('should add to the physical balance and keep the reservation', () => {
      expect(receive(level(10, 2), 5)).toEqual({
        level: { quantidade: 15, reservada: 2 },
        movimentada: 5,
      });
    });

    it.each([0, -1])('should reject a quantity of %s', (quantity) => {
      expect(codeOf(() => receive(level(10), quantity))).toBe('NO_CHANGE');
    });
  });

  describe('issue (saída manual)', () => {
    it('should take from the available quantity', () => {
      expect(issue(level(10, 2), 8).level).toEqual({
        quantidade: 2,
        reservada: 2,
      });
    });

    it('should never touch the reserved quantity', () => {
      expect(codeOf(() => issue(level(10, 2), 8.001))).toBe('INSUFFICIENT');
    });
  });

  describe('adjust (inventário)', () => {
    it('should set the new balance and record the absolute difference', () => {
      expect(adjust(level(10, 2), 7)).toEqual({
        level: { quantidade: 7, reservada: 2 },
        movimentada: 3,
      });
      expect(adjust(level(10, 2), 12.5).movimentada).toBe(2.5);
    });

    it('should accept zero when nothing is reserved', () => {
      expect(adjust(level(4), 0).level.quantidade).toBe(0);
    });

    it('should refuse a balance below the reserved quantity', () => {
      expect(codeOf(() => adjust(level(10, 5), 4.999))).toBe(
        'RESERVED_EXCEEDS_STOCK',
      );
    });

    it('should refuse a negative balance and a balance equal to the current one', () => {
      expect(codeOf(() => adjust(level(10), -1))).toBe('INSUFFICIENT');
      expect(codeOf(() => adjust(level(10), 10))).toBe('NO_CHANGE');
    });
  });

  describe('reserve', () => {
    it('should raise the reserved quantity up to the available balance', () => {
      expect(reserve(level(10, 4), 6)).toEqual({
        level: { quantidade: 10, reservada: 10 },
        movimentada: 6,
      });
    });

    it('should refuse to reserve more than the available quantity', () => {
      expect(codeOf(() => reserve(level(10, 4), 6.001))).toBe('INSUFFICIENT');
    });
  });

  describe('release', () => {
    it('should lower the reserved quantity and keep the balance', () => {
      expect(release(level(10, 4), 4).level).toEqual({
        quantidade: 10,
        reservada: 0,
      });
    });

    it('should refuse to release more than what is reserved', () => {
      expect(codeOf(() => release(level(10, 1), 2))).toBe('INCONSISTENT');
    });
  });

  describe('withdrawReserved (baixa da OS)', () => {
    it('should lower the balance and the reservation together', () => {
      expect(withdrawReserved(level(10, 4), 3)).toEqual({
        level: { quantidade: 7, reservada: 1 },
        movimentada: 3,
      });
    });

    it('should refuse to withdraw more than what is reserved, keeping 0 <= reserved <= balance', () => {
      expect(codeOf(() => withdrawReserved(level(10, 2), 3))).toBe(
        'INCONSISTENT',
      );
    });
  });

  it('should keep the invariants through a whole reserve → withdraw cycle', () => {
    const start = level(5);
    const reserved = reserve(start, 2).level;
    const done = withdrawReserved(reserved, 2).level;

    expect(done).toEqual({ quantidade: 3, reservada: 0 });
    expect(availableQuantity(done)).toBe(3);
  });
});
