import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { LicensePlate } from '../../../../src/shared/domain/license-plate';

// Placas fictícias (PRD-001 §4; ADR-009 Parte 2).
// Entradas que não são string (guarda de tipo em runtime): mesma ValidationError do VO, nunca TypeError.
const NON_STRING_INPUTS: (null | undefined | number | object | boolean)[] = [null, undefined, 123, {}, [], true];
function validationErrorOf(parse: () => unknown): ValidationError {
  try {
    parse();
  } catch (error) {
    if (error instanceof ValidationError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a ValidationError to be thrown');
}

describe('LicensePlate.parse', () => {
  it.each(['ABC1234', 'abc1234', 'ABC-1234', 'abc-1234', 'ABC 1234', ' abc-1234 ', 'Abc1234'])(
    'should normalize %p to ABC1234 with the OLD format when the plate follows the old pattern',
    (raw) => {
      const plate = LicensePlate.parse(raw);

      expect(plate.value).toBe('ABC1234');
      expect(plate.format).toBe('OLD');
    },
  );

  it.each(['ABC1D23', 'abc1d23', 'ABC-1D23', 'ABC 1D23', ' abc 1d23 ', 'Abc1d23'])(
    'should normalize %p to ABC1D23 with the MERCOSUL format when the plate follows the Mercosul pattern',
    (raw) => {
      const plate = LicensePlate.parse(raw);

      expect(plate.value).toBe('ABC1D23');
      expect(plate.format).toBe('MERCOSUL');
    },
  );

  it.each([
    'ABCD123',
    'ABC12345',
    'AB1234',
    'ABC1D2',
    '1234ABC',
    '',
    '   ',
    'AB12345',
    'ABC1DE3',
    'ABC12D3',
    'ABCD1D23',
    'ABC_1234',
    'ÁBC1234',
    'ABC1234X',
  ])('should reject %p with "placa fora do padrão" when the plate matches neither pattern', (raw) => {
    const error = validationErrorOf(() => LicensePlate.parse(raw));

    expect(error.message).toBe('placa fora do padrão');
    expect(error.field).toBe('licensePlate');
  });

  it.each(NON_STRING_INPUTS)('should reject %p with "placa fora do padrão" when the input is not a string', (raw) => {
    const error = validationErrorOf(() => LicensePlate.parse(raw as unknown as string));

    expect(error.message).toBe('placa fora do padrão');
    expect(error.field).toBe('licensePlate');
  });

  it('should expose the VALIDATION_ERROR code when the plate is invalid', () => {
    const error = validationErrorOf(() => LicensePlate.parse('ABCD123'));

    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('LicensePlate formatting', () => {
  it('should format with a dash when the plate follows the old pattern', () => {
    expect(LicensePlate.parse('abc1234').formatted()).toBe('ABC-1234');
  });

  it('should format without a dash when the plate follows the Mercosul pattern', () => {
    expect(LicensePlate.parse('ABC-1D23').formatted()).toBe('ABC1D23');
  });

  it.each([
    ['ABC1234', 'ABC1***'],
    ['abc1d23', 'ABC1***'],
  ])('should mask %p as %p when exposed to the customer or to logs', (raw, masked) => {
    expect(LicensePlate.parse(raw).masked()).toBe(masked);
  });

  it.each([
    ['abc-1234', 'ABC1234'],
    ['abc 1d23', 'ABC1D23'],
  ])('should return the normalized value when %p is converted to string', (raw, value) => {
    const plate = LicensePlate.parse(raw);

    expect(plate.toString()).toBe(value);
    expect(String(plate)).toBe(value);
  });
});

describe('LicensePlate.equals', () => {
  it('should be equal when both plates normalize to the same value', () => {
    expect(LicensePlate.parse('abc-1234').equals(LicensePlate.parse('ABC1234'))).toBe(true);
  });

  it('should not be equal when the plates differ', () => {
    expect(LicensePlate.parse('ABC1234').equals(LicensePlate.parse('ABC1235'))).toBe(false);
  });

  it('should not be equal when comparing an old plate with a Mercosul plate', () => {
    expect(LicensePlate.parse('ABC1234').equals(LicensePlate.parse('ABC1D23'))).toBe(false);
  });
});
