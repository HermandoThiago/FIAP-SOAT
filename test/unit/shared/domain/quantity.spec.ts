import Decimal from 'decimal.js';

import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { Quantity } from '../../../../src/shared/domain/quantity';

function captureError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('Quantity.of', () => {
  it.each([
    [1.0005, '1.001'],
    [1.2345, '1.235'],
    [2.0004, '2.000'],
    [0.0005, '0.001'],
    [0.0004, '0.000'],
    [0.9995, '1.000'],
    ['2.5005', '2.501'],
    ['0.12345', '0.123'],
    [5e-4, '0.001'],
  ])('should round %p to %s when the value has more than 3 decimal places', (input, expected) => {
    expect(Quantity.of(input).toFixed()).toBe(expected);
  });

  it.each([
    [1, '1.000'],
    [2.5, '2.500'],
    [0.001, '0.001'],
    ['3', '3.000'],
    ['2.500', '2.500'],
    ['0.75', '0.750'],
    ['+4.25', '4.250'],
    [1e3, '1000.000'],
  ])('should keep %p as %s when the value already fits in 3 decimal places', (input, expected) => {
    expect(Quantity.of(input).toFixed()).toBe(expected);
  });

  it('should accept a Decimal instance when creating a quantity', () => {
    expect(Quantity.of(new Decimal('1.2345')).toFixed()).toBe('1.235');
  });

  it.each([[0], ['0'], ['0.000'], [-0], ['-0'], ['-0.000']])('should produce zero when the value is %p', (input) => {
    const quantity = Quantity.of(input);

    expect(quantity.isZero()).toBe(true);
    expect(quantity.toFixed()).toBe('0.000');
    expect(quantity.toNumber()).toBe(0);
  });

  it.each([['9999999.999'], ['9999999.9994'], [9999999.999], [9999999], [new Decimal('9999999.999')]])(
    'should accept %p when the value is within the decimal(10,3) limit',
    (input) => {
      expect(Quantity.of(input).toFixed()).toMatch(/^9999999\.(999|000)$/);
    },
  );

  it.each([[10000000], ['10000000.000'], ['9999999.9995'], [12345678.5], [new Decimal('1e8')]])(
    'should reject %p when the value exceeds 9999999.999',
    (input) => {
      expect(() => Quantity.of(input)).toThrow(ValidationError);
      expect(() => Quantity.of(input)).toThrow('quantidade excede o máximo de 9999999.999');
    },
  );

  it.each([[-1], [-0.001], [-0.0001], ['-5'], ['-0.0001'], [new Decimal('-2')]])(
    'should reject %p when the value is negative',
    (input) => {
      expect(() => Quantity.of(input)).toThrow(ValidationError);
      expect(() => Quantity.of(input)).toThrow('quantidade não pode ser negativa');
    },
  );

  it.each([[NaN], [Infinity], [-Infinity], [new Decimal(NaN)], [new Decimal(-Infinity)]])(
    'should reject %p when the value is not a finite number',
    (input) => {
      expect(() => Quantity.of(input)).toThrow(ValidationError);
      expect(() => Quantity.of(input)).toThrow('quantidade inválida');
    },
  );

  it.each([['abc'], [''], [' 2'], ['2 '], ['2,5'], ['1e2'], ['0x10'], ['5.'], ['.5'], ['2 un'], ['1_000']])(
    'should reject %p when the string is not in plain decimal notation',
    (input) => {
      expect(() => Quantity.of(input)).toThrow(ValidationError);
      expect(() => Quantity.of(input)).toThrow('quantidade inválida');
    },
  );

  it.each([[null], [undefined], [{}], [[]], [true], [2n]])(
    'should reject %p when the value has an unsupported type',
    (input) => {
      expect(() => Quantity.of(input as never)).toThrow('quantidade inválida');
    },
  );

  it('should carry the default field and the VALIDATION_ERROR code when the value is invalid', () => {
    const error = captureError(() => Quantity.of('abc'));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ field: 'quantity', code: 'VALIDATION_ERROR', message: 'quantidade inválida' });
  });

  it('should carry the given field when a field name is provided', () => {
    const error = captureError(() => Quantity.of(-1, 'stockQuantity'));

    expect(error).toMatchObject({ field: 'stockQuantity', message: 'quantidade não pode ser negativa' });
  });
});

describe('Quantity.zero', () => {
  it('should be zero when created with zero', () => {
    const zero = Quantity.zero();

    expect(zero.isZero()).toBe(true);
    expect(zero.isPositive()).toBe(false);
    expect(zero.toFixed()).toBe('0.000');
    expect(zero.equals(Quantity.of(0))).toBe(true);
  });
});

describe('Quantity.isWhole', () => {
  it.each([[3], ['3.000'], [0], ['10'], [1e3], [9999999]])('should be whole when the quantity is %p', (input) => {
    expect(Quantity.of(input).isWhole()).toBe(true);
  });

  it.each([[2.5], ['0.001'], ['1.250'], [0.999], ['9999999.999']])(
    'should not be whole when the quantity is %p',
    (input) => {
      expect(Quantity.of(input).isWhole()).toBe(false);
    },
  );

  it('should be whole when the rounding to 3 places removes the fractional part', () => {
    expect(Quantity.of(2.0004).isWhole()).toBe(true);
    expect(Quantity.of(1.9995).isWhole()).toBe(true);
  });
});

describe('Quantity.add', () => {
  it('should sum without floating point error when adding 0.1 and 0.2', () => {
    const sum = Quantity.of(0.1).add(Quantity.of(0.2));

    expect(sum.toFixed()).toBe('0.300');
    expect(sum.toNumber()).toBe(0.3);
  });

  it.each([
    ['1.5', '2.25', '3.750'],
    ['0.001', '0.002', '0.003'],
    ['999.999', '0.001', '1000.000'],
    ['3', '4', '7.000'],
  ])('should return %s plus %s equal to %s when adding two quantities', (left, right, expected) => {
    expect(Quantity.of(left).add(Quantity.of(right)).toFixed()).toBe(expected);
  });

  it('should return the same quantity when adding zero', () => {
    const quantity = Quantity.of('2.500');

    expect(quantity.add(Quantity.zero()).equals(quantity)).toBe(true);
  });

  it('should reject the sum when it exceeds 9999999.999', () => {
    expect(() => Quantity.of('9999999.999').add(Quantity.of('0.001'))).toThrow(
      'quantidade excede o máximo de 9999999.999',
    );
  });

  it('should not change the operands when adding', () => {
    const left = Quantity.of('1.500');
    const right = Quantity.of('2.000');

    const sum = left.add(right);

    expect(left.toFixed()).toBe('1.500');
    expect(right.toFixed()).toBe('2.000');
    expect(sum).not.toBe(left);
    expect(sum.toFixed()).toBe('3.500');
  });
});

describe('Quantity.subtract', () => {
  it.each([
    ['5', '2.5', '2.500'],
    ['0.003', '0.001', '0.002'],
    ['1000.000', '0.001', '999.999'],
    ['10', '10', '0.000'],
  ])('should return %s minus %s equal to %s when subtracting', (left, right, expected) => {
    expect(Quantity.of(left).subtract(Quantity.of(right)).toFixed()).toBe(expected);
  });

  it('should return zero when subtracting a quantity from itself', () => {
    const quantity = Quantity.of('4.250');

    expect(quantity.subtract(quantity).isZero()).toBe(true);
  });

  it('should return the same quantity when subtracting zero', () => {
    const quantity = Quantity.of('4.250');

    expect(quantity.subtract(Quantity.zero()).equals(quantity)).toBe(true);
  });

  it.each([
    ['2', '3'],
    ['0', '0.001'],
    ['0.5', '0.501'],
  ])('should reject %s minus %s when the result would be negative', (left, right) => {
    expect(() => Quantity.of(left).subtract(Quantity.of(right))).toThrow(ValidationError);
    expect(() => Quantity.of(left).subtract(Quantity.of(right))).toThrow('quantidade não pode ficar negativa');
  });

  it('should carry the quantity field when the result would be negative', () => {
    const error = captureError(() => Quantity.of(1).subtract(Quantity.of(2)));

    expect(error).toMatchObject({ field: 'quantity', code: 'VALIDATION_ERROR' });
  });

  it('should not change the operands when subtracting', () => {
    const left = Quantity.of('5.000');
    const right = Quantity.of('2.500');

    const difference = left.subtract(right);

    expect(left.toFixed()).toBe('5.000');
    expect(right.toFixed()).toBe('2.500');
    expect(difference).not.toBe(left);
    expect(difference.toFixed()).toBe('2.500');
  });
});

describe('Quantity comparisons', () => {
  it('should be greater when the quantity is larger', () => {
    expect(Quantity.of('2.001').isGreaterThan(Quantity.of('2.000'))).toBe(true);
    expect(Quantity.of('2.000').isGreaterThan(Quantity.of('2.001'))).toBe(false);
  });

  it('should not be greater when the quantities are equal', () => {
    expect(Quantity.of('2.000').isGreaterThan(Quantity.of(2))).toBe(false);
  });

  it('should be greater than or equal when the quantity is larger or equal', () => {
    expect(Quantity.of('2.001').isGreaterThanOrEqual(Quantity.of('2.000'))).toBe(true);
    expect(Quantity.of('2.000').isGreaterThanOrEqual(Quantity.of(2))).toBe(true);
    expect(Quantity.of('1.999').isGreaterThanOrEqual(Quantity.of('2.000'))).toBe(false);
  });

  it('should be positive only when the quantity is above zero', () => {
    expect(Quantity.of('0.001').isPositive()).toBe(true);
    expect(Quantity.of(0).isPositive()).toBe(false);
    expect(Quantity.of(0.0004).isPositive()).toBe(false);
  });

  it('should be zero only when the quantity is zero', () => {
    expect(Quantity.of(0).isZero()).toBe(true);
    expect(Quantity.of('0.001').isZero()).toBe(false);
  });
});

describe('Quantity.equals', () => {
  it('should be equal when the quantities are the same value in different representations', () => {
    expect(Quantity.of(2).equals(Quantity.of('2.000'))).toBe(true);
    expect(Quantity.of('2.5').equals(Quantity.of(new Decimal('2.500')))).toBe(true);
  });

  it('should be equal when the rounded values match', () => {
    expect(Quantity.of(1.0005).equals(Quantity.of('1.001'))).toBe(true);
  });

  it('should be equal when comparing with itself', () => {
    const quantity = Quantity.of('7.777');

    expect(quantity.equals(quantity)).toBe(true);
  });

  it('should not be equal when the quantities differ', () => {
    expect(Quantity.of('2.000').equals(Quantity.of('2.001'))).toBe(false);
    expect(Quantity.of(0).equals(Quantity.of('0.001'))).toBe(false);
  });
});

describe('Quantity conversions', () => {
  it.each([
    ['2.500', 2.5],
    ['0.300', 0.3],
    ['0.001', 0.001],
    ['9999999.999', 9999999.999],
  ])('should convert %s to the number %p when toNumber is called', (input, expected) => {
    expect(Quantity.of(input).toNumber()).toBe(expected);
  });

  it.each([
    [2.5, '2.500'],
    [0, '0.000'],
    [3, '3.000'],
    [0.3, '0.300'],
    [1000000.5, '1000000.500'],
  ])('should format %p as %s when toFixed is called', (input, expected) => {
    expect(Quantity.of(input).toFixed()).toBe(expected);
  });

  it('should format with 3 decimal places when toString is called', () => {
    const quantity = Quantity.of(2.5);

    expect(quantity.toString()).toBe('2.500');
    expect(quantity.toString()).toBe(quantity.toFixed());
  });

  it('should serialize as a number when toJSON is called', () => {
    expect(Quantity.of('2.500').toJSON()).toBe(2.5);
    expect(JSON.stringify({ quantity: Quantity.of('2.500') })).toBe('{"quantity":2.5}');
  });

  it('should return a Decimal with the same value when toDecimal is called', () => {
    const decimal = Quantity.of('2.500').toDecimal();

    expect(Decimal.isDecimal(decimal)).toBe(true);
    expect(decimal.toFixed(3)).toBe('2.500');
  });

  it('should return a fresh Decimal copy when toDecimal is called twice', () => {
    const quantity = Quantity.of('2.500');

    expect(quantity.toDecimal()).not.toBe(quantity.toDecimal());
    expect(quantity.toDecimal().equals(quantity.toDecimal())).toBe(true);
  });
});

describe('Quantity immutability', () => {
  it('should be frozen when created', () => {
    expect(Object.isFrozen(Quantity.of('2.500'))).toBe(true);
    expect(Object.isFrozen(Quantity.zero())).toBe(true);
  });

  it('should keep the original value when derived values are computed', () => {
    const quantity = Quantity.of('2.500');

    quantity.add(Quantity.of(1));
    quantity.subtract(Quantity.of(1));
    quantity.toDecimal();

    expect(quantity.toFixed()).toBe('2.500');
  });
});
