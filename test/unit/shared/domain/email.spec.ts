import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { Email } from '../../../../src/shared/domain/email';

// E-mails fictícios (domínios reservados/de exemplo). Regras: ADR-009 Parte 2; PRD-001 RN-006.
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

/** E-mail sintaticamente válido com exatamente `length` caracteres. */
function emailOfLength(length: number): string {
  const domain = '@example.com';
  return 'a'.repeat(length - domain.length) + domain;
}

describe('Email.parse', () => {
  it.each([
    ['maria@oficina.local', 'maria@oficina.local'],
    ['Maria.Silva@Oficina.LOCAL', 'maria.silva@oficina.local'],
    ['MARIA@EXAMPLE.COM', 'maria@example.com'],
    ['  joao@oficina.com.br  ', 'joao@oficina.com.br'],
    ['\tjoao@oficina.com.br\n', 'joao@oficina.com.br'],
    ['user+tag@example.com', 'user+tag@example.com'],
    ['user_name-1@sub.domain.example.org', 'user_name-1@sub.domain.example.org'],
    ["o'neil@example.com", "o'neil@example.com"],
    ['a@b.co', 'a@b.co'],
    ['123@456.com', '123@456.com'],
    ['first.middle.last@example.travel', 'first.middle.last@example.travel'],
    ['user@my-domain.example.com', 'user@my-domain.example.com'],
  ])('should normalize %p to %p when the e-mail is valid', (raw, expected) => {
    const email = Email.parse(raw);

    expect(email.value).toBe(expected);
  });

  it('should accept the e-mail when it has exactly 254 characters', () => {
    const raw = emailOfLength(254);

    const email = Email.parse(raw);

    expect(email.value).toBe(raw);
    expect(email.value).toHaveLength(254);
  });

  it('should accept the e-mail when it has 254 characters after trimming', () => {
    const raw = `  ${emailOfLength(254)}  `;

    expect(Email.parse(raw).value).toHaveLength(254);
  });

  it.each([255, 256, 300])('should reject the e-mail when it has %i characters', (length) => {
    const error = validationErrorOf(() => Email.parse(emailOfLength(length)));

    expect(error.message).toBe('e-mail inválido');
    expect(error.field).toBe('email');
  });

  it.each(['', '   ', 'maria', 'maria.oficina.local', 'oficina.local'])(
    'should reject %p with "e-mail inválido" when there is no @',
    (raw) => {
      const error = validationErrorOf(() => Email.parse(raw));

      expect(error.message).toBe('e-mail inválido');
      expect(error.field).toBe('email');
    },
  );

  it.each(['maria@@oficina.local', 'maria@oficina@local', '@@', 'a@b@c.com'])(
    'should reject %p with "e-mail inválido" when there is more than one @',
    (raw) => {
      const error = validationErrorOf(() => Email.parse(raw));

      expect(error.message).toBe('e-mail inválido');
      expect(error.field).toBe('email');
    },
  );

  it.each([
    '@oficina.local',
    '@',
    'maria@',
    '.maria@oficina.local',
    'maria.@oficina.local',
    'maria..silva@oficina.local',
  ])('should reject %p with "e-mail inválido" when the local part is missing or malformed', (raw) => {
    const error = validationErrorOf(() => Email.parse(raw));

    expect(error.message).toBe('e-mail inválido');
    expect(error.field).toBe('email');
  });

  it.each([
    'maria@oficina',
    'maria@localhost',
    'maria@oficina.l',
    'maria@oficina.123',
    'maria@oficina.local.',
    'maria@.oficina.local',
    'maria@oficina..local',
    'maria@-oficina.local',
    'maria@oficina-.local',
    'maria@oficina.local-',
    'maria@oficina_local.com',
  ])(
    'should reject %p with "e-mail inválido" when the domain has no dot, an invalid TLD or a malformed label',
    (raw) => {
      const error = validationErrorOf(() => Email.parse(raw));

      expect(error.message).toBe('e-mail inválido');
      expect(error.field).toBe('email');
    },
  );

  it.each([
    'maria silva@oficina.local',
    'maria@oficina .local',
    'maria@ oficina.local',
    'maria @oficina.local',
    'maria\t@oficina.local',
    'maria@oficina.lo cal',
    'maria\n@oficina.local',
  ])('should reject %p with "e-mail inválido" when there is whitespace inside the e-mail', (raw) => {
    const error = validationErrorOf(() => Email.parse(raw));

    expect(error.message).toBe('e-mail inválido');
    expect(error.field).toBe('email');
  });

  it.each([
    'josé@oficina.local',
    'maria@oficína.local',
    'maria@oficina.locál',
    'ｍaria@oficina.local',
    'maria@例え.jp',
  ])('should reject %p with "e-mail inválido" when it contains non-ASCII characters', (raw) => {
    const error = validationErrorOf(() => Email.parse(raw));

    expect(error.message).toBe('e-mail inválido');
    expect(error.field).toBe('email');
  });

  it.each([
    'maria"silva@oficina.local',
    'maria(silva)@oficina.local',
    'maria,silva@oficina.local',
    'maria<@oficina.local',
  ])('should reject %p with "e-mail inválido" when the local part has characters outside the dot-atom set', (raw) => {
    const error = validationErrorOf(() => Email.parse(raw));

    expect(error.message).toBe('e-mail inválido');
    expect(error.field).toBe('email');
  });

  it.each(NON_STRING_INPUTS)('should reject %p with "e-mail inválido" when the input is not a string', (raw) => {
    const error = validationErrorOf(() => Email.parse(raw as unknown as string));

    expect(error.message).toBe('e-mail inválido');
    expect(error.field).toBe('email');
  });

  it('should expose the VALIDATION_ERROR code when the e-mail is invalid', () => {
    const error = validationErrorOf(() => Email.parse('invalid'));

    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Email formatting', () => {
  it.each([
    ['maria@oficina.local', 'm***@oficina.local'],
    ['Maria.Silva@Oficina.LOCAL', 'm***@oficina.local'],
    ['joao@oficina.com.br', 'j***@oficina.com.br'],
    ['a@b.co', 'a***@b.co'],
    ['user+tag@example.com', 'u***@example.com'],
    ['123@456.com', '1***@456.com'],
  ])('should mask %p as %p when exposed to logs', (raw, masked) => {
    expect(Email.parse(raw).masked()).toBe(masked);
  });

  it.each([
    ['maria@oficina.local', 'maria@oficina.local'],
    ['  Maria@Oficina.LOCAL ', 'maria@oficina.local'],
  ])('should return the normalized value when %p is converted to string', (raw, value) => {
    const email = Email.parse(raw);

    expect(email.toString()).toBe(value);
    expect(String(email)).toBe(value);
  });
});

describe('Email.equals', () => {
  it('should be equal when both e-mails normalize to the same value', () => {
    expect(Email.parse('Maria@Oficina.LOCAL').equals(Email.parse(' maria@oficina.local '))).toBe(true);
  });

  it('should not be equal when the local parts differ', () => {
    expect(Email.parse('maria@oficina.local').equals(Email.parse('joao@oficina.local'))).toBe(false);
  });

  it('should not be equal when the domains differ', () => {
    expect(Email.parse('maria@oficina.local').equals(Email.parse('maria@oficina.com.br'))).toBe(false);
  });
});
