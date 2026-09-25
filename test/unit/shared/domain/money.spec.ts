import Decimal from 'decimal.js';

import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { Money } from '../../../../src/shared/domain/money';
import { Quantity } from '../../../../src/shared/domain/quantity';

function captureError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('Money.of', () => {
  it.each([
    [1.005, '1.01'],
    [2.675, '2.68'],
    [0.125, '0.13'],
    [0.005, '0.01'],
    [1.004, '1.00'],
    [1.0049, '1.00'],
    [1.995, '2.00'],
    [0.001, '0.00'],
    [99.999, '100.00'],
    [5e-3, '0.01'],
    ['330.005', '330.01'],
    ['330.004', '330.00'],
    ['0.999', '1.00'],
  ])('should round %p to %s when the value has more than 2 decimal places', (input, expected) => {
    expect(Money.of(input).toFixed()).toBe(expected);
  });

  it.each([
    [10, '10.00'],
    [330, '330.00'],
    [0.5, '0.50'],
    ['330', '330.00'],
    ['330.00', '330.00'],
    ['330.5', '330.50'],
    ['+15.25', '15.25'],
    ['9999999999.99', '9999999999.99'],
    [1e6, '1000000.00'],
  ])('should keep %p as %s when the value already fits in 2 decimal places', (input, expected) => {
    expect(Money.of(input).toFixed()).toBe(expected);
  });

  it('should accept a Decimal instance when creating money', () => {
    const money = Money.of(new Decimal('123.455'));

    expect(money.toFixed()).toBe('123.46');
  });

  // Teto decimal(12,2) das colunas de preço/valor (modelo-de-dados.md; PRD-005 RN-063).
  it.each([['9999999999.99'], ['9999999999.994'], [9999999999.99], [9999999999], [new Decimal('9999999999.99')]])(
    'should accept %p when the value is within the decimal(12,2) limit',
    (input) => {
      expect(Money.of(input).toFixed()).toMatch(/^9999999999\.(99|00)$/);
    },
  );

  it.each([[10000000000], ['10000000000.00'], ['9999999999.995'], [12345678901.5], [1e10], [new Decimal('1e11')]])(
    'should reject %p when the value exceeds 9999999999.99',
    (input) => {
      expect(() => Money.of(input)).toThrow(ValidationError);
      expect(() => Money.of(input)).toThrow('valor monetário excede o máximo de 9999999999.99');
    },
  );

  it('should carry the given field and the VALIDATION_ERROR code when the value exceeds the maximum', () => {
    const error = captureError(() => Money.of('10000000000.00', 'unitPrice'));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      field: 'unitPrice',
      code: 'VALIDATION_ERROR',
      message: 'valor monetário excede o máximo de 9999999999.99',
    });
  });

  it.each([[0], ['0'], ['0.00'], [-0], ['-0'], ['-0.00']])('should produce zero when the value is %p', (input) => {
    const money = Money.of(input);

    expect(money.isZero()).toBe(true);
    expect(money.toFixed()).toBe('0.00');
    expect(money.toNumber()).toBe(0);
  });

  it.each([[-1], [-0.01], [-0.001], ['-5'], ['-0.001'], [new Decimal('-10')]])(
    'should reject %p when the value is negative',
    (input) => {
      expect(() => Money.of(input)).toThrow(ValidationError);
      expect(() => Money.of(input)).toThrow('valor monetário não pode ser negativo');
    },
  );

  it.each([[NaN], [Infinity], [-Infinity], [new Decimal(NaN)], [new Decimal(Infinity)]])(
    'should reject %p when the value is not a finite number',
    (input) => {
      expect(() => Money.of(input)).toThrow(ValidationError);
      expect(() => Money.of(input)).toThrow('valor monetário inválido');
    },
  );

  it.each([['abc'], [''], [' 1'], ['1 '], ['1,50'], ['1e2'], ['0x1f'], ['5.'], ['.5'], ['R$ 10'], ['1_000'], ['--1']])(
    'should reject %p when the string is not in plain decimal notation',
    (input) => {
      expect(() => Money.of(input)).toThrow(ValidationError);
      expect(() => Money.of(input)).toThrow('valor monetário inválido');
    },
  );

  it.each([[null], [undefined], [{}], [[]], [true], [10n]])(
    'should reject %p when the value has an unsupported type',
    (input) => {
      expect(() => Money.of(input as never)).toThrow('valor monetário inválido');
    },
  );

  it('should carry the default field and the VALIDATION_ERROR code when the value is invalid', () => {
    const error = captureError(() => Money.of('abc'));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ field: 'amount', code: 'VALIDATION_ERROR', message: 'valor monetário inválido' });
  });

  it('should carry the given field when a field name is provided', () => {
    const error = captureError(() => Money.of(-1, 'unitPrice'));

    expect(error).toMatchObject({ field: 'unitPrice', message: 'valor monetário não pode ser negativo' });
  });
});

describe('Money.zero', () => {
  it('should be zero when created with zero', () => {
    const zero = Money.zero();

    expect(zero.isZero()).toBe(true);
    expect(zero.toFixed()).toBe('0.00');
    expect(zero.equals(Money.of(0))).toBe(true);
  });
});

describe('Money.add', () => {
  it('should sum without floating point error when adding 0.1 and 0.2', () => {
    const sum = Money.of(0.1).add(Money.of(0.2));

    expect(sum.toFixed()).toBe('0.30');
    expect(sum.toNumber()).toBe(0.3);
    expect(sum.equals(Money.of(0.3))).toBe(true);
  });

  it.each([
    ['100.00', '230.00', '330.00'],
    ['0.01', '0.02', '0.03'],
    ['999999.99', '0.01', '1000000.00'],
    ['19.99', '19.99', '39.98'],
  ])('should return %s plus %s equal to %s when adding two amounts', (left, right, expected) => {
    expect(Money.of(left).add(Money.of(right)).toFixed()).toBe(expected);
  });

  it('should return the same amount when adding zero', () => {
    const amount = Money.of('42.50');

    expect(amount.add(Money.zero()).equals(amount)).toBe(true);
    expect(Money.zero().add(amount).equals(amount)).toBe(true);
  });

  it('should accept the sum when it reaches exactly 9999999999.99', () => {
    expect(Money.of('9999999999.98').add(Money.of('0.01')).toFixed()).toBe('9999999999.99');
  });

  it('should reject the sum when it exceeds 9999999999.99', () => {
    const sum = () => Money.of('9999999999.99').add(Money.of('0.01'));

    expect(sum).toThrow(ValidationError);
    expect(sum).toThrow('valor monetário excede o máximo de 9999999999.99');
  });

  it('should not change the operands when adding', () => {
    const left = Money.of('10.00');
    const right = Money.of('5.00');

    const sum = left.add(right);

    expect(left.toFixed()).toBe('10.00');
    expect(right.toFixed()).toBe('5.00');
    expect(sum).not.toBe(left);
    expect(sum.toFixed()).toBe('15.00');
  });
});

describe('Money.multiply', () => {
  it('should return 225.00 when multiplying 90.00 by the fractional quantity 2.5', () => {
    expect(Money.of('90.00').multiply(Quantity.of(2.5)).toFixed()).toBe('225.00');
  });

  it('should return 270.00 when multiplying 90.00 by the whole quantity 3', () => {
    expect(Money.of('90.00').multiply(Quantity.of(3)).toFixed()).toBe('270.00');
  });

  it('should return 2.68 when multiplying 2.675 by 1', () => {
    expect(Money.of(2.675).multiply(1).toFixed()).toBe('2.68');
  });

  it.each([
    ['33.33', 3, '99.99'],
    ['10.00', '0.333', '3.33'],
    ['10.00', '0.3335', '3.34'],
    ['0.01', 0.5, '0.01'],
    ['19.99', 1.5, '29.99'],
    ['1.10', 3, '3.30'],
    ['0.10', 3, '0.30'],
    ['4.35', 100, '435.00'],
    ['100.00', 0, '0.00'],
  ])('should return %s times %p equal to %s when multiplying by a plain factor', (amount, factor, expected) => {
    expect(Money.of(amount).multiply(factor).toFixed()).toBe(expected);
  });

  it('should multiply by a Decimal when the factor is a Decimal instance', () => {
    expect(Money.of('12.50').multiply(new Decimal('0.125')).toFixed()).toBe('1.56');
  });

  it('should multiply by a string when the factor is in plain decimal notation', () => {
    expect(Money.of('90.00').multiply('2.500').toFixed()).toBe('225.00');
  });

  it('should return zero when multiplying by a zero quantity', () => {
    expect(Money.of('90.00').multiply(Quantity.zero()).isZero()).toBe(true);
  });

  it('should return zero when multiplying zero by any quantity', () => {
    expect(Money.zero().multiply(Quantity.of('1.250')).isZero()).toBe(true);
  });

  it('should accept the product when it reaches exactly 9999999999.99', () => {
    expect(Money.of('3333333333.33').multiply(3).toFixed()).toBe('9999999999.99');
  });

  it.each([
    ['9999999999.99', 2],
    ['5000000000.00', Quantity.of(2)],
    ['9999999999.99', '1.001'],
    ['0.01', 1e12],
  ])('should reject %s times %p when the product exceeds 9999999999.99', (amount, factor) => {
    expect(() => Money.of(amount).multiply(factor)).toThrow(ValidationError);
    expect(() => Money.of(amount).multiply(factor)).toThrow('valor monetário excede o máximo de 9999999999.99');
  });

  it.each([[-1], ['-2.5'], [new Decimal('-0.5')]])('should reject %p when the factor is negative', (factor) => {
    expect(() => Money.of('10.00').multiply(factor)).toThrow('valor monetário não pode ser negativo');
  });

  it.each([[NaN], [Infinity], ['abc'], ['1e2'], [''], [null], [undefined]])(
    'should reject %p when the factor is not a valid number',
    (factor) => {
      expect(() => Money.of('10.00').multiply(factor as never)).toThrow(ValidationError);
      expect(() => Money.of('10.00').multiply(factor as never)).toThrow('fator de multiplicação inválido');
    },
  );

  it('should not change the original amount when multiplying', () => {
    const amount = Money.of('90.00');

    const product = amount.multiply(Quantity.of(2));

    expect(amount.toFixed()).toBe('90.00');
    expect(product).not.toBe(amount);
    expect(product.toFixed()).toBe('180.00');
  });
});

describe('Money comparisons', () => {
  it('should be greater when the amount is larger', () => {
    expect(Money.of('10.01').isGreaterThan(Money.of('10.00'))).toBe(true);
    expect(Money.of('10.00').isGreaterThan(Money.of('10.01'))).toBe(false);
  });

  it('should not be greater when the amounts are equal', () => {
    expect(Money.of('10.00').isGreaterThan(Money.of(10))).toBe(false);
  });

  it('should be greater than or equal when the amount is larger or equal', () => {
    expect(Money.of('10.01').isGreaterThanOrEqual(Money.of('10.00'))).toBe(true);
    expect(Money.of('10.00').isGreaterThanOrEqual(Money.of(10))).toBe(true);
    expect(Money.of('9.99').isGreaterThanOrEqual(Money.of('10.00'))).toBe(false);
  });

  it('should be zero only when the amount is zero', () => {
    expect(Money.of(0).isZero()).toBe(true);
    expect(Money.of('0.01').isZero()).toBe(false);
  });
});

describe('Money.equals', () => {
  it('should be equal when the amounts are the same value in different representations', () => {
    expect(Money.of(10).equals(Money.of('10.00'))).toBe(true);
    expect(Money.of('10.0').equals(Money.of(new Decimal(10)))).toBe(true);
  });

  it('should be equal when the rounded values match', () => {
    expect(Money.of(1.005).equals(Money.of('1.01'))).toBe(true);
  });

  it('should be equal when comparing with itself', () => {
    const amount = Money.of('7.77');

    expect(amount.equals(amount)).toBe(true);
  });

  it('should not be equal when the amounts differ', () => {
    expect(Money.of('10.00').equals(Money.of('10.01'))).toBe(false);
    expect(Money.of(0).equals(Money.of('0.01'))).toBe(false);
  });
});

describe('Money conversions', () => {
  it.each([
    ['330.00', 330],
    ['0.30', 0.3],
    ['0.01', 0.01],
    ['1000000.50', 1000000.5],
  ])('should convert %s to the number %p when toNumber is called', (input, expected) => {
    expect(Money.of(input).toNumber()).toBe(expected);
  });

  it.each([
    [330, '330.00'],
    [0, '0.00'],
    [0.3, '0.30'],
    [1000000.5, '1000000.50'],
    [7, '7.00'],
  ])('should format %p as %s when toFixed is called', (input, expected) => {
    expect(Money.of(input).toFixed()).toBe(expected);
  });

  it('should format with 2 decimal places when toString is called', () => {
    const amount = Money.of(330);

    expect(amount.toString()).toBe('330.00');
    expect(`${amount.toString()}`).toBe(amount.toFixed());
  });

  it('should serialize as a number when toJSON is called', () => {
    expect(Money.of('330.00').toJSON()).toBe(330);
    expect(JSON.stringify({ totalAmount: Money.of('330.50') })).toBe('{"totalAmount":330.5}');
  });

  it('should return a Decimal with the same value when toDecimal is called', () => {
    const decimal = Money.of('330.00').toDecimal();

    expect(Decimal.isDecimal(decimal)).toBe(true);
    expect(decimal.toFixed(2)).toBe('330.00');
  });

  it('should return a fresh Decimal copy when toDecimal is called twice', () => {
    const amount = Money.of('330.00');

    expect(amount.toDecimal()).not.toBe(amount.toDecimal());
    expect(amount.toDecimal().equals(amount.toDecimal())).toBe(true);
  });
});

describe('Money immutability', () => {
  it('should be frozen when created', () => {
    expect(Object.isFrozen(Money.of('10.00'))).toBe(true);
    expect(Object.isFrozen(Money.zero())).toBe(true);
  });

  it('should keep the original value when derived values are computed', () => {
    const amount = Money.of('10.00');

    amount.add(Money.of('5.00'));
    amount.multiply(3);
    amount.toDecimal();

    expect(amount.toFixed()).toBe('10.00');
  });
});
