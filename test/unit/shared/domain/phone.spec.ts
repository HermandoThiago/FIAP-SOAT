import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { Phone } from '../../../../src/shared/domain/phone';

// Telefones fictícios. Regras: ADR-009 Parte 2; PRD-001 RN-006.
const MOBILE = '11912345678';
const LANDLINE = '1131234567';
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

describe('Phone.parse', () => {
  it.each([
    '11912345678',
    '(11) 91234-5678',
    '(11)91234-5678',
    '11 91234-5678',
    '11-91234-5678',
    '11 91234 5678',
    '11.91234.5678',
    '(11) 9 1234-5678',
    ' (11) 91234-5678 ',
    '\t11912345678\n',
  ])('should keep only the digits 11912345678 when the mobile input is %p', (raw) => {
    const phone = Phone.parse(raw);

    expect(phone.digits).toBe(MOBILE);
  });

  it.each([
    '1131234567',
    '(11) 3123-4567',
    '(11)3123-4567',
    '11 3123-4567',
    '11-3123-4567',
    '11 3123 4567',
    ' 1131234567 ',
  ])('should keep only the digits 1131234567 when the landline input is %p', (raw) => {
    const phone = Phone.parse(raw);

    expect(phone.digits).toBe(LANDLINE);
  });

  it.each([
    ['(11) 91234-5678', '11'],
    ['(21) 2123-4567', '21'],
    ['(47) 99123-4567', '47'],
    ['(85) 3123-4567', '85'],
    ['(99) 91234-5678', '99'],
  ])('should accept %p and keep the area code %p when the input starts with the DDD', (raw, areaCode) => {
    const phone = Phone.parse(raw);

    expect(phone.digits.slice(0, 2)).toBe(areaCode);
  });

  // PRD-001 RN-006 / ADR-009 Parte 2 só exigem 10 ou 11 dígitos com DDD: faixa de DDD e 9 inicial não são regras.
  it.each([
    ['(10) 91234-5678', '10912345678'],
    ['(01) 3123-4567', '0131234567'],
    ['0091234567', '0091234567'],
    ['(11) 81234-5678', '11812345678'],
    ['(11) 01234-5678', '11012345678'],
    ['11312345678', '11312345678'],
  ])(
    'should accept %p as %p when it has 10 or 11 digits regardless of the area code or the first digit',
    (raw, digits) => {
      expect(Phone.parse(raw).digits).toBe(digits);
    },
  );

  it.each(NON_STRING_INPUTS)('should reject %p with "telefone inválido" when the input is not a string', (raw) => {
    const error = validationErrorOf(() => Phone.parse(raw as unknown as string));

    expect(error.message).toBe('telefone inválido');
    expect(error.field).toBe('phone');
  });

  it.each(['', '   ', '1', '11', '(11) 1234-567', '119123456', '(11) 9123-567'])(
    'should reject %p with "telefone inválido" when there are fewer than 10 digits',
    (raw) => {
      const error = validationErrorOf(() => Phone.parse(raw));

      expect(error.message).toBe('telefone inválido');
      expect(error.field).toBe('phone');
    },
  );

  it.each(['(11) 91234-56789', '119123456789', '5511912345678', '55 11 91234-5678', '11912345678912'])(
    'should reject %p with "telefone inválido" when there are more than 11 digits',
    (raw) => {
      const error = validationErrorOf(() => Phone.parse(raw));

      expect(error.message).toBe('telefone inválido');
      expect(error.field).toBe('phone');
    },
  );

  it.each([
    '(11) 9123A-5678',
    '(11) 91234-567x',
    'abcdefghij',
    'onze912345678',
    '11912345678a',
    '(11) 91234-５678',
    '11_91234_5678',
    '11/91234/5678',
    '+5511912345678',
    '+55 (11) 91234-5678',
  ])(
    'should reject %p with "telefone inválido" when the input has characters other than digits and separators',
    (raw) => {
      const error = validationErrorOf(() => Phone.parse(raw));

      expect(error.message).toBe('telefone inválido');
      expect(error.field).toBe('phone');
    },
  );

  it('should expose the VALIDATION_ERROR code when the phone is invalid', () => {
    const error = validationErrorOf(() => Phone.parse('123'));

    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Phone formatting', () => {
  it.each([
    ['11912345678', '(11) 91234-5678'],
    ['(47)99123-4567', '(47) 99123-4567'],
    ['11812345678', '(11) 81234-5678'],
  ])('should format %p as %p when the phone has 11 digits', (raw, formatted) => {
    expect(Phone.parse(raw).formatted()).toBe(formatted);
  });

  it.each([
    ['1131234567', '(11) 3123-4567'],
    ['(21)2123-4567', '(21) 2123-4567'],
  ])('should format %p as %p when the phone is a landline', (raw, formatted) => {
    expect(Phone.parse(raw).formatted()).toBe(formatted);
  });

  it.each([
    ['11912345678', '(11) *****-5678'],
    ['(47) 99123-4567', '(47) *****-4567'],
  ])('should mask %p as %p when a mobile number is exposed to the customer or to logs', (raw, masked) => {
    expect(Phone.parse(raw).masked()).toBe(masked);
  });

  it.each([
    ['1131234567', '(11) ****-4567'],
    ['(21) 2123-4567', '(21) ****-4567'],
  ])('should mask %p as %p when a landline is exposed to the customer or to logs', (raw, masked) => {
    expect(Phone.parse(raw).masked()).toBe(masked);
  });

  it.each([
    ['(11) 91234-5678', MOBILE],
    ['(11) 3123-4567', LANDLINE],
  ])('should return only the digits when %p is converted to string', (raw, digits) => {
    const phone = Phone.parse(raw);

    expect(phone.toString()).toBe(digits);
    expect(String(phone)).toBe(digits);
  });
});

describe('Phone.equals', () => {
  it('should be equal when both inputs have the same digits', () => {
    expect(Phone.parse('(11) 91234-5678').equals(Phone.parse('11912345678'))).toBe(true);
  });

  it('should not be equal when the digits differ', () => {
    expect(Phone.parse('11912345678').equals(Phone.parse('11912345679'))).toBe(false);
  });

  it('should not be equal when comparing a mobile number with a landline', () => {
    expect(Phone.parse('11912345678').equals(Phone.parse('1131234567'))).toBe(false);
  });
});
