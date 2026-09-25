import { Cnpj, Cpf, Document, cnpjCheckDigits, cpfCheckDigits } from '../../../../src/shared/domain/document';
import { ValidationError } from '../../../../src/shared/domain/domain-error';

// Documentos fictícios com dígitos verificadores válidos: exemplos da PRD-001 §4, ADR-009 e contrato-api.md.
const VALID_CPF = '52998224725';
const VALID_CNPJ = '45723174000110';
const OTHER_VALID_CNPJ = '11222333000181';
// Entradas que não são string (guarda de tipo em runtime): mesma ValidationError do VO, nunca TypeError.
const NON_STRING_INPUTS: (null | undefined | number | object | boolean)[] = [null, undefined, 123, {}, [], true];

const REPEATED_CPFS = Array.from({ length: 10 }, (_, digit) => String(digit).repeat(11));
const REPEATED_CNPJS = Array.from({ length: 10 }, (_, digit) => String(digit).repeat(14));

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

describe('Document.parse', () => {
  it.each(['52998224725', '529.982.247-25', '529982247-25', '529.982.24725', '529 982 247 25', ' 529.982.247-25 '])(
    'should return a Cpf when the input is the valid CPF %p',
    (raw) => {
      const document = Document.parse(raw);

      expect(document).toBeInstanceOf(Cpf);
      expect(document.kind).toBe('CPF');
      expect(document.digits).toBe(VALID_CPF);
    },
  );

  it.each([
    ['45723174000110', VALID_CNPJ],
    ['45.723.174/0001-10', VALID_CNPJ],
    ['45723174/0001-10', VALID_CNPJ],
    ['45 723 174 0001 10', VALID_CNPJ],
    [' 45.723.174/0001-10 ', VALID_CNPJ],
    ['11.222.333/0001-81', OTHER_VALID_CNPJ],
  ])('should return a Cnpj when the input is the valid CNPJ %p', (raw, digits) => {
    const document = Document.parse(raw);

    expect(document).toBeInstanceOf(Cnpj);
    expect(document.kind).toBe('CNPJ');
    expect(document.digits).toBe(digits);
  });

  it.each(['', '   ', '1', '5299822472', '529982247251', '4572317400011', '457231740001100'])(
    'should reject with "documento inválido" when the length is wrong for %p',
    (raw) => {
      const error = validationErrorOf(() => Document.parse(raw));

      expect(error.message).toBe('documento inválido');
      expect(error.field).toBe('document');
    },
  );

  it.each(['5299822472A', '529.982.247-2x', '529,982,247-25', 'abc.def.ghi-jk', '45.723.174/0001-1O', '5299822472５'])(
    'should reject with "documento inválido" when the input has non-numeric characters like %p',
    (raw) => {
      const error = validationErrorOf(() => Document.parse(raw));

      expect(error.message).toBe('documento inválido');
      expect(error.field).toBe('document');
    },
  );

  it.each(NON_STRING_INPUTS)('should reject %p with "documento inválido" when the input is not a string', (raw) => {
    const error = validationErrorOf(() => Document.parse(raw as unknown as string));

    expect(error.message).toBe('documento inválido');
    expect(error.field).toBe('document');
  });

  it('should expose the VALIDATION_ERROR code when the document is invalid', () => {
    const error = validationErrorOf(() => Document.parse('123'));

    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it.each([...REPEATED_CPFS, '111.111.111-11'])('should reject the repeated sequence %p when parsing a CPF', (raw) => {
    const error = validationErrorOf(() => Document.parse(raw));

    expect(error.message).toBe('CPF inválido: sequência repetida');
    expect(error.field).toBe('document');
  });

  it.each([...REPEATED_CNPJS, '11.111.111/1111-11'])(
    'should reject the repeated sequence %p when parsing a CNPJ',
    (raw) => {
      const error = validationErrorOf(() => Document.parse(raw));

      expect(error.message).toBe('CNPJ inválido: sequência repetida');
      expect(error.field).toBe('document');
    },
  );

  it.each(['52998224726', '529.982.247-26', '123.456.789-00', '52998224735', '52998224715'])(
    'should reject the CPF %p when a check digit is wrong',
    (raw) => {
      const error = validationErrorOf(() => Document.parse(raw));

      expect(error.message).toBe('CPF com dígito verificador inválido');
      expect(error.field).toBe('document');
    },
  );

  it.each(['45723174000111', '45.723.174/0001-11', '11222333000182', '45723174000120', '45723174000100'])(
    'should reject the CNPJ %p when a check digit is wrong',
    (raw) => {
      const error = validationErrorOf(() => Document.parse(raw));

      expect(error.message).toBe('CNPJ com dígito verificador inválido');
      expect(error.field).toBe('document');
    },
  );
});

describe('Cpf.parse', () => {
  it('should return a Cpf when the input is a valid CPF with punctuation', () => {
    const cpf: Cpf = Cpf.parse('529.982.247-25');

    expect(cpf.digits).toBe(VALID_CPF);
    expect(cpf.kind).toBe('CPF');
  });

  it('should reject with "documento inválido" when the input is a CNPJ', () => {
    const error = validationErrorOf(() => Cpf.parse(VALID_CNPJ));

    expect(error.message).toBe('documento inválido');
    expect(error.field).toBe('document');
  });

  it.each(NON_STRING_INPUTS)('should reject %p with "documento inválido" when the input is not a string', (raw) => {
    const error = validationErrorOf(() => Cpf.parse(raw as unknown as string));

    expect(error.message).toBe('documento inválido');
    expect(error.field).toBe('document');
  });

  it('should reject the repeated sequence when parsing directly', () => {
    expect(() => Cpf.parse('99999999999')).toThrow('CPF inválido: sequência repetida');
  });

  it('should reject a wrong check digit when parsing directly', () => {
    expect(() => Cpf.parse('52998224726')).toThrow('CPF com dígito verificador inválido');
  });
});

describe('Cnpj.parse', () => {
  it('should return a Cnpj when the input is a valid CNPJ with punctuation', () => {
    const cnpj: Cnpj = Cnpj.parse('45.723.174/0001-10');

    expect(cnpj.digits).toBe(VALID_CNPJ);
    expect(cnpj.kind).toBe('CNPJ');
  });

  it('should reject with "documento inválido" when the input is a CPF', () => {
    const error = validationErrorOf(() => Cnpj.parse(VALID_CPF));

    expect(error.message).toBe('documento inválido');
    expect(error.field).toBe('document');
  });

  it.each(NON_STRING_INPUTS)('should reject %p with "documento inválido" when the input is not a string', (raw) => {
    const error = validationErrorOf(() => Cnpj.parse(raw as unknown as string));

    expect(error.message).toBe('documento inválido');
    expect(error.field).toBe('document');
  });

  it('should reject the repeated sequence when parsing directly', () => {
    expect(() => Cnpj.parse('00000000000000')).toThrow('CNPJ inválido: sequência repetida');
  });

  it('should reject a wrong check digit when parsing directly', () => {
    expect(() => Cnpj.parse('45723174000111')).toThrow('CNPJ com dígito verificador inválido');
  });
});

describe('Document formatting', () => {
  it('should format with dots and dash when the document is a CPF', () => {
    expect(Document.parse(VALID_CPF).formatted()).toBe('529.982.247-25');
  });

  it.each([
    [VALID_CNPJ, '45.723.174/0001-10'],
    [OTHER_VALID_CNPJ, '11.222.333/0001-81'],
  ])('should format %p with dots, slash and dash when the document is a CNPJ', (digits, formatted) => {
    expect(Document.parse(digits).formatted()).toBe(formatted);
  });

  it('should mask the first three digits and the check digits when the document is a CPF', () => {
    expect(Document.parse('529.982.247-25').masked()).toBe('***.982.247-**');
  });

  it('should mask the root and the check digits when the document is a CNPJ', () => {
    expect(Document.parse('45.723.174/0001-10').masked()).toBe('**.***.174/0001-**');
  });

  it.each([
    ['529.982.247-25', VALID_CPF],
    ['45.723.174/0001-10', VALID_CNPJ],
  ])('should return only the digits when %p is converted to string', (raw, digits) => {
    const document = Document.parse(raw);

    expect(document.toString()).toBe(digits);
    expect(String(document)).toBe(digits);
  });
});

describe('Document.equals', () => {
  it('should be equal when both CPFs have the same digits regardless of punctuation', () => {
    expect(Document.parse('529.982.247-25').equals(Document.parse(VALID_CPF))).toBe(true);
  });

  it('should be equal when both CNPJs have the same digits regardless of punctuation', () => {
    expect(Document.parse('45.723.174/0001-10').equals(Cnpj.parse(VALID_CNPJ))).toBe(true);
  });

  it('should not be equal when the CPFs differ', () => {
    expect(Cpf.parse(VALID_CPF).equals(Cpf.parse('123.456.789-09'))).toBe(false);
  });

  it('should not be equal when comparing a CPF with a CNPJ', () => {
    expect(Document.parse(VALID_CPF).equals(Document.parse(VALID_CNPJ))).toBe(false);
  });
});

describe('cpfCheckDigits', () => {
  it.each([
    ['529982247', '25'],
    ['123456789', '09'],
    ['000000001', '91'],
  ])('should compute %p when the base is %p', (base, checkDigits) => {
    expect(cpfCheckDigits(base)).toBe(checkDigits);
  });
});

describe('cnpjCheckDigits', () => {
  it.each([
    ['457231740001', '10'],
    ['112223330001', '81'],
  ])('should compute %p when the base is %p', (base, checkDigits) => {
    expect(cnpjCheckDigits(base)).toBe(checkDigits);
  });
});
