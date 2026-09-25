import { maskPii, maskPiiDeep } from '../../../../src/shared/http/pii-mask';

// Máscara central de PII nos logs (ADR-009 Parte 2; PRD-005 RN-066). Documentos e placas fictícios porém válidos.
const CPF_DIGITS = '52998224725';
const CPF_MASKED = '***.982.247-**';
const CNPJ_DIGITS = '11222333000181';
const CNPJ_MASKED = '**.***.333/0001-**';

class SampleEntity {
  constructor(readonly document: string) {}
}

describe('maskPii', () => {
  it.each([
    ['CPF 529.982.247-25', 'CPF ***.982.247-**'],
    [`CPF ${CPF_DIGITS}`, `CPF ${CPF_MASKED}`],
  ])('should mask the CPF when the text contains %p', (text, masked) => {
    expect(maskPii(text)).toBe(masked);
  });

  it.each([
    ['CNPJ 11.222.333/0001-81', `CNPJ ${CNPJ_MASKED}`],
    [`CNPJ ${CNPJ_DIGITS}`, `CNPJ ${CNPJ_MASKED}`],
  ])('should mask the CNPJ when the text contains %p', (text, masked) => {
    expect(maskPii(text)).toBe(masked);
  });

  it.each([
    ['placa ABC1234', 'placa ABC1***'],
    ['placa ABC-1234', 'placa ABC1***'],
    ['placa ABC1D23', 'placa ABC1***'],
    ['placa ABC-1D23', 'placa ABC1***'],
  ])('should mask the license plate when the text contains %p', (text, masked) => {
    expect(maskPii(text)).toBe(masked);
  });

  it('should mask every occurrence when the text contains several documents and plates', () => {
    const text = `Cliente 529.982.247-25 (CNPJ ${CNPJ_DIGITS}) com placas ABC-1D23 e XYZ9876`;

    expect(maskPii(text)).toBe(`Cliente ${CPF_MASKED} (CNPJ ${CNPJ_MASKED}) com placas ABC1*** e XYZ9***`);
  });

  it('should mask the query string when the URL carries a document', () => {
    expect(maskPii(`/api/v1/customers?document=${CPF_DIGITS}`)).toBe(`/api/v1/customers?document=${CPF_MASKED}`);
  });

  it.each([
    'Ordem de serviço OS-2026-000001 recebida',
    'recebida em 2026-09-25T10:00:00.000Z',
    'id 3f2a9c1e-7b4d-4c2a-9f1e-123456789012',
    'Total R$ 1234.56',
    '',
  ])('should keep the text intact when it has no PII (%p)', (text) => {
    expect(maskPii(text)).toBe(text);
  });

  it.each(['12345', '1234567890', '123456789012345', 'código 000001'])(
    'should keep the number intact when %p is not a document',
    (text) => {
      expect(maskPii(text)).toBe(text);
    },
  );
});

describe('maskPiiDeep', () => {
  it('should mask strings inside nested objects and arrays when given a plain object', () => {
    const input = {
      customer: { document: CPF_DIGITS, company: { document: CNPJ_DIGITS } },
      vehicles: [{ plate: 'ABC1D23' }, `placa ${'XYZ-9876'}`],
    };

    expect(maskPiiDeep(input)).toEqual({
      customer: { document: CPF_MASKED, company: { document: CNPJ_MASKED } },
      vehicles: [{ plate: 'ABC1***' }, 'placa XYZ9***'],
    });
  });

  it('should return a masked copy when the input is a string', () => {
    expect(maskPiiDeep(`CPF ${CPF_DIGITS}`)).toBe(`CPF ${CPF_MASKED}`);
  });

  it('should not mutate the input when masking', () => {
    const input = { document: CPF_DIGITS, plates: ['ABC1D23'] };

    const output = maskPiiDeep(input);

    expect(input).toEqual({ document: CPF_DIGITS, plates: ['ABC1D23'] });
    expect(output).not.toBe(input);
    expect(output.plates).not.toBe(input.plates);
  });

  it('should not overflow the stack when the object has a cycle', () => {
    const node: Record<string, unknown> = { document: CPF_DIGITS };
    node.self = node;

    expect(() => maskPiiDeep(node)).not.toThrow();
    expect(maskPiiDeep(node).document).toBe(CPF_MASKED);
  });

  it('should not overflow the stack when an array contains itself', () => {
    const list: unknown[] = [CPF_DIGITS];
    list.push(list);

    expect(() => maskPiiDeep(list)).not.toThrow();
    expect(maskPiiDeep(list)[0]).toBe(CPF_MASKED);
  });

  it.each([
    ['an Error', new Error(`CPF ${CPF_DIGITS}`)],
    ['a Date', new Date('2026-09-25T10:00:00Z')],
    ['a class instance', new SampleEntity(CPF_DIGITS)],
  ])('should pass the value through untouched when it is %s', (_label, value) => {
    expect(maskPiiDeep(value)).toBe(value);
  });

  it('should keep class instances untouched when they are nested in a plain object', () => {
    const entity = new SampleEntity(CPF_DIGITS);

    const output = maskPiiDeep({ entity, document: CPF_DIGITS });

    expect(output.entity).toBe(entity);
    expect(output.document).toBe(CPF_MASKED);
  });

  it('should mask objects without prototype when they are plain dictionaries', () => {
    const input = Object.assign(Object.create(null) as Record<string, unknown>, { document: CPF_DIGITS });

    expect(maskPiiDeep(input)).toEqual({ document: CPF_MASKED });
  });

  it('should mask the innermost string when the nesting is within the depth limit', () => {
    let input: Record<string, unknown> = { document: CPF_DIGITS };
    for (let level = 0; level < 7; level += 1) {
      input = { child: input };
    }

    const output = JSON.stringify(maskPiiDeep(input));

    expect(output).toContain(CPF_MASKED);
    expect(output).not.toContain(CPF_DIGITS);
  });

  it('should stop descending when the nesting exceeds the depth limit', () => {
    const leaf: Record<string, unknown> = { document: CPF_DIGITS };
    let input: Record<string, unknown> = leaf;
    for (let level = 0; level < 8; level += 1) {
      input = { child: input };
    }

    let cursor: unknown = maskPiiDeep(input);
    for (let level = 0; level < 8; level += 1) {
      cursor = (cursor as Record<string, unknown>).child;
    }

    expect(cursor).toBe(leaf);
  });

  it.each([
    ['a number', 42],
    ['a boolean', true],
    ['null', null],
    ['undefined', undefined],
  ])('should return the primitive untouched when it is %s', (_label, value) => {
    expect(maskPiiDeep(value)).toBe(value);
  });
});

describe('maskPii — phones and lowercase plates', () => {
  it.each([
    ['(11) 91234-5678', '(11) *****-5678'],
    ['11 91234-5678', '(11) *****-5678'],
    ['(11) 3123-4567', '(11) ****-4567'],
  ])('should mask the phone number when the text contains %s', (input, expected) => {
    expect(maskPii(`telefone ${input} informado`)).toBe(`telefone ${expected} informado`);
  });

  it.each([
    ['abc1d23', 'abc1***'],
    ['abc-1234', 'abc1***'],
    ['/api/v1/vehicles?licensePlate=abc1d23', '/api/v1/vehicles?licensePlate=abc1***'],
  ])('should mask the plate when it is written in lowercase (%s)', (input, expected) => {
    expect(maskPii(input)).toBe(expected);
  });
});

describe('maskPiiDeep — shared references and cycles', () => {
  const CPF = '52998224725';
  const MASKED = '***.982.247-**';

  it('should mask every occurrence when the same object is referenced twice without a cycle', () => {
    const shared = { document: CPF };

    const output = maskPiiDeep({ a: shared, b: shared, list: [shared, shared] });

    expect(output.a.document).toBe(MASKED);
    expect(output.b.document).toBe(MASKED);
    expect(output.list.map((item) => item.document)).toEqual([MASKED, MASKED]);
  });

  it('should replace the back-reference with a placeholder when the object has a cycle', () => {
    const node: Record<string, unknown> = { document: CPF };
    node.self = node;

    const output = maskPiiDeep(node);

    expect(output.document).toBe(MASKED);
    expect(output.self).toBe('[Circular]');
  });
});
