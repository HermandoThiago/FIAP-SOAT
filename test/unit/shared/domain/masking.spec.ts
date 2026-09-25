import { maskCnpj, maskCpf, maskDocument, maskLicensePlate } from '../../../../src/shared/domain/masking';

// Formatos oficiais das máscaras (ADR-009 Parte 2; PRD-001 RN-008): `***.982.247-**`, `**.***.174/0001-**`, `ABC1***`.
describe('maskCpf', () => {
  it('should hide the first three digits and the check digits when given a CPF', () => {
    expect(maskCpf('52998224725')).toBe('***.982.247-**');
  });
});

describe('maskCnpj', () => {
  it('should hide the root and the check digits when given a CNPJ', () => {
    expect(maskCnpj('45723174000110')).toBe('**.***.174/0001-**');
  });
});

describe('maskDocument', () => {
  it('should apply the CPF mask when the document has 11 digits', () => {
    expect(maskDocument('52998224725')).toBe('***.982.247-**');
  });

  it('should apply the CNPJ mask when the document has 14 digits', () => {
    expect(maskDocument('11222333000181')).toBe('**.***.333/0001-**');
  });
});

describe('maskLicensePlate', () => {
  it.each([
    ['ABC1234', 'ABC1***'],
    ['ABC1D23', 'ABC1***'],
  ])('should keep only the first four characters when given the plate %p', (plate, masked) => {
    expect(maskLicensePlate(plate)).toBe(masked);
  });
});
