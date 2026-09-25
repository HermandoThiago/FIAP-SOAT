import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { ServiceOrderNumber } from '../../../../src/shared/domain/service-order-number';

// Número da OS `OS-AAAA-NNNNNN` (ADR-009 Decisão; glossário §2). A sequência vem do banco; aqui só formato e validação.
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

describe('ServiceOrderNumber.parse', () => {
  it.each([
    ['OS-2026-000042', 2026, 42],
    ['OS-2026-000001', 2026, 1],
    ['OS-2026-999999', 2026, 999999],
    ['OS-2027-100000', 2027, 100000],
    ['OS-2026-012345', 2026, 12345],
    ['OS-2000-000007', 2000, 7],
    ['OS-9999-999999', 9999, 999999],
  ])(
    'should accept %p and extract year %i and sequence %i when the format is OS-AAAA-NNNNNN',
    (raw, year, sequence) => {
      const number = ServiceOrderNumber.parse(raw);

      expect(number.value).toBe(raw);
      expect(number.year).toBe(year);
      expect(number.sequence).toBe(sequence);
    },
  );

  it.each(['os-2026-000042', 'Os-2026-000042', 'oS-2026-000042'])(
    'should reject %p with "número da OS inválido" when the prefix is in lowercase',
    (raw) => {
      const error = validationErrorOf(() => ServiceOrderNumber.parse(raw));

      expect(error.message).toBe('número da OS inválido');
      expect(error.field).toBe('number');
    },
  );

  it.each(['SO-2026-000042', 'O-2026-000042', 'OSS-2026-000042', '2026-000042', 'WO-2026-000042', '-2026-000042'])(
    'should reject %p with "número da OS inválido" when the prefix is wrong',
    (raw) => {
      const error = validationErrorOf(() => ServiceOrderNumber.parse(raw));

      expect(error.message).toBe('número da OS inválido');
      expect(error.field).toBe('number');
    },
  );

  it.each(['OS-26-000042', 'OS-026-000042', 'OS-20260-000042', 'OS-2O26-000042', 'OS--000042'])(
    'should reject %p with "número da OS inválido" when the year does not have 4 digits',
    (raw) => {
      const error = validationErrorOf(() => ServiceOrderNumber.parse(raw));

      expect(error.message).toBe('número da OS inválido');
      expect(error.field).toBe('number');
    },
  );

  it.each(['OS-2026-00042', 'OS-2026-0000042', 'OS-2026-42', 'OS-2026-', 'OS-2026-00004A', 'OS-2026-0000４2'])(
    'should reject %p with "número da OS inválido" when the sequence does not have 6 digits',
    (raw) => {
      const error = validationErrorOf(() => ServiceOrderNumber.parse(raw));

      expect(error.message).toBe('número da OS inválido');
      expect(error.field).toBe('number');
    },
  );

  it.each([
    '',
    '   ',
    ' OS-2026-000042',
    'OS-2026-000042 ',
    'OS 2026 000042',
    'OS_2026_000042',
    'OS2026000042',
    'OS-2026-000042-1',
    'OS-2026-000042\n',
    'OS-2026.000042',
  ])('should reject %p with "número da OS inválido" when separators or surrounding characters are wrong', (raw) => {
    const error = validationErrorOf(() => ServiceOrderNumber.parse(raw));

    expect(error.message).toBe('número da OS inválido');
    expect(error.field).toBe('number');
  });

  // Mesmas faixas de generate(): o VO tem uma única invariante para ano e sequência.
  it.each(['OS-0999-000001', 'OS-1999-000001', 'OS-0000-000042'])(
    'should reject %p with "ano do número da OS inválido" when the year is outside 2000..9999',
    (raw) => {
      const error = validationErrorOf(() => ServiceOrderNumber.parse(raw));

      expect(error.message).toBe('ano do número da OS inválido');
      expect(error.field).toBe('number');
    },
  );

  it('should reject OS-2026-000000 with "sequência do número da OS inválida" when the sequence is zero', () => {
    const error = validationErrorOf(() => ServiceOrderNumber.parse('OS-2026-000000'));

    expect(error.message).toBe('sequência do número da OS inválida');
    expect(error.field).toBe('number');
  });

  it.each(NON_STRING_INPUTS)('should reject %p with "número da OS inválido" when the input is not a string', (raw) => {
    const error = validationErrorOf(() => ServiceOrderNumber.parse(raw as unknown as string));

    expect(error.message).toBe('número da OS inválido');
    expect(error.field).toBe('number');
  });

  it('should expose the VALIDATION_ERROR code when the number is invalid', () => {
    const error = validationErrorOf(() => ServiceOrderNumber.parse('invalid'));

    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('ServiceOrderNumber.generate', () => {
  it.each([
    [2026, 42, 'OS-2026-000042'],
    [2026, 1, 'OS-2026-000001'],
    [2026, 999999, 'OS-2026-999999'],
    [2026, 123456, 'OS-2026-123456'],
    [2027, 100000, 'OS-2027-100000'],
    [2026, 99999, 'OS-2026-099999'],
    [2000, 1, 'OS-2000-000001'],
    [9999, 1, 'OS-9999-000001'],
  ])('should format year %i and sequence %i as %p when both are within range', (year, sequence, expected) => {
    const number = ServiceOrderNumber.generate(year, sequence);

    expect(number.value).toBe(expected);
  });

  it('should pad the sequence with zeros to 6 digits when it is short', () => {
    expect(ServiceOrderNumber.generate(2026, 7).value).toBe('OS-2026-000007');
  });

  it('should expose the year and the sequence when generated', () => {
    const number = ServiceOrderNumber.generate(2026, 42);

    expect(number.year).toBe(2026);
    expect(number.sequence).toBe(42);
  });

  it.each([0, 1000000, -1, -42, 1.5, 42.0001, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'should reject the sequence %p when it is not an integer between 1 and 999999',
    (sequence) => {
      const error = validationErrorOf(() => ServiceOrderNumber.generate(2026, sequence));

      expect(error.message).toBe('sequência do número da OS inválida');
      expect(error.field).toBe('number');
    },
  );

  it.each([999, 1999, 10000, 0, -2026, 26, 2026.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'should reject the year %p when it is not an integer between 2000 and 9999',
    (year) => {
      const error = validationErrorOf(() => ServiceOrderNumber.generate(year, 42));

      expect(error.message).toBe('ano do número da OS inválido');
      expect(error.field).toBe('number');
    },
  );

  it('should expose the VALIDATION_ERROR code when the sequence is out of range', () => {
    const error = validationErrorOf(() => ServiceOrderNumber.generate(2026, 0));

    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should produce a value that parses back to the same number when generated', () => {
    const generated = ServiceOrderNumber.generate(2026, 42);

    const parsed = ServiceOrderNumber.parse(generated.value);

    expect(parsed.equals(generated)).toBe(true);
    expect(parsed.year).toBe(2026);
    expect(parsed.sequence).toBe(42);
  });
});

describe('ServiceOrderNumber formatting', () => {
  it('should return the value when converted to string', () => {
    const number = ServiceOrderNumber.parse('OS-2026-000042');

    expect(number.toString()).toBe('OS-2026-000042');
    expect(String(number)).toBe('OS-2026-000042');
  });
});

describe('ServiceOrderNumber.equals', () => {
  it('should be equal when both numbers have the same value', () => {
    expect(ServiceOrderNumber.parse('OS-2026-000042').equals(ServiceOrderNumber.generate(2026, 42))).toBe(true);
  });

  it('should not be equal when the sequences differ', () => {
    expect(ServiceOrderNumber.generate(2026, 42).equals(ServiceOrderNumber.generate(2026, 43))).toBe(false);
  });

  it('should not be equal when the years differ', () => {
    expect(ServiceOrderNumber.generate(2026, 42).equals(ServiceOrderNumber.generate(2027, 42))).toBe(false);
  });
});
