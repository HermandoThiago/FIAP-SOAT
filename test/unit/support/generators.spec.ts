import { Cnpj, Cpf, Document } from '../../../src/shared/domain/document';
import { ValidationError } from '../../../src/shared/domain/domain-error';
import { LicensePlate } from '../../../src/shared/domain/license-plate';
import {
  invalidCnpj,
  invalidCpf,
  mercosulLicensePlate,
  oldLicensePlate,
  randomEmail,
  randomPhone,
  validCnpj,
  validCpf,
} from '../../support/generators';

const ITERATIONS = 100;

function samples(generate: () => string): string[] {
  return Array.from({ length: ITERATIONS }, generate);
}

describe('validCpf', () => {
  it('should produce CPFs accepted by Document.parse when called 100 times', () => {
    for (const cpf of samples(validCpf)) {
      const document = Document.parse(cpf);

      expect(document).toBeInstanceOf(Cpf);
      expect(document.digits).toBe(cpf);
    }
  });

  it('should produce only digits when called', () => {
    expect(validCpf()).toMatch(/^\d{11}$/);
  });
});

describe('validCnpj', () => {
  it('should produce CNPJs accepted by Document.parse when called 100 times', () => {
    for (const cnpj of samples(validCnpj)) {
      const document = Document.parse(cnpj);

      expect(document).toBeInstanceOf(Cnpj);
      expect(document.digits).toBe(cnpj);
    }
  });

  it('should produce a head office CNPJ with only digits when called', () => {
    expect(validCnpj()).toMatch(/^\d{8}0001\d{2}$/);
  });
});

describe('invalidCpf', () => {
  it('should produce CPFs rejected by the check digit rule when called 100 times', () => {
    for (const cpf of samples(invalidCpf)) {
      expect(() => Document.parse(cpf)).toThrow(ValidationError);
      expect(() => Document.parse(cpf)).toThrow('CPF com dígito verificador inválido');
    }
  });
});

describe('invalidCnpj', () => {
  it('should produce CNPJs rejected by the check digit rule when called 100 times', () => {
    for (const cnpj of samples(invalidCnpj)) {
      expect(() => Document.parse(cnpj)).toThrow(ValidationError);
      expect(() => Document.parse(cnpj)).toThrow('CNPJ com dígito verificador inválido');
    }
  });
});

describe('oldLicensePlate', () => {
  it('should produce plates accepted by LicensePlate.parse with the OLD format when called 100 times', () => {
    for (const raw of samples(oldLicensePlate)) {
      const plate = LicensePlate.parse(raw);

      expect(plate.format).toBe('OLD');
      expect(plate.value).toBe(raw);
    }
  });
});

describe('mercosulLicensePlate', () => {
  it('should produce plates accepted by LicensePlate.parse with the MERCOSUL format when called 100 times', () => {
    for (const raw of samples(mercosulLicensePlate)) {
      const plate = LicensePlate.parse(raw);

      expect(plate.format).toBe('MERCOSUL');
      expect(plate.value).toBe(raw);
    }
  });
});

describe('randomEmail', () => {
  it('should produce lowercase e-mails on the reserved example.com domain when called 100 times', () => {
    for (const email of samples(randomEmail)) {
      expect(email).toMatch(/^[a-z0-9-]+@example\.com$/);
      expect(email.length).toBeLessThanOrEqual(254);
    }
  });
});

describe('randomPhone', () => {
  it('should produce 10 or 11 digits with a valid area code when called 100 times', () => {
    for (const phone of samples(randomPhone)) {
      expect(phone).toMatch(/^\d{10,11}$/);
      expect(Number(phone.slice(0, 2))).toBeGreaterThanOrEqual(11);
    }
  });

  it('should start the subscriber number with 9 when the phone is a mobile number', () => {
    for (const phone of samples(randomPhone).filter((value) => value.length === 11)) {
      expect(phone[2]).toBe('9');
    }
  });
});

describe('generators randomness', () => {
  it.each([
    ['validCpf', validCpf],
    ['validCnpj', validCnpj],
    ['invalidCpf', invalidCpf],
    ['invalidCnpj', invalidCnpj],
    ['oldLicensePlate', oldLicensePlate],
    ['mercosulLicensePlate', mercosulLicensePlate],
    ['randomEmail', randomEmail],
    ['randomPhone', randomPhone],
  ])('should produce distinct values when %s is called repeatedly', (_name, generate) => {
    expect(new Set(samples(generate)).size).toBeGreaterThan(1);
  });
});
