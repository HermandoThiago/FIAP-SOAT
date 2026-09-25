import { ValidationError } from './domain-error';
import { maskLicensePlate } from './masking';

// Placa do veículo (glossário §3; agregados.md §2): padrão antigo `AAA9999` ou Mercosul `AAA9A99`, normalizada em
// maiúsculas sem hífen/espaço (ADR-009 Parte 2; PRD-001 RN-004; PRD-005 RN-063).

export type LicensePlateFormat = 'OLD' | 'MERCOSUL';

const OLD_PATTERN = /^[A-Z]{3}[0-9]{4}$/;
const MERCOSUL_PATTERN = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
const IGNORED_CHARACTERS = /[-\s]/g;

export class LicensePlate {
  private constructor(
    readonly value: string,
    readonly format: LicensePlateFormat,
  ) {}

  /** Placa fora dos dois padrões (ou entrada que não seja string) → 422 `licensePlate`. */
  static parse(raw: string): LicensePlate {
    if (typeof raw !== 'string') {
      throw new ValidationError('placa fora do padrão', 'licensePlate');
    }
    const value = raw.toUpperCase().replace(IGNORED_CHARACTERS, '');
    if (OLD_PATTERN.test(value)) {
      return new LicensePlate(value, 'OLD');
    }
    if (MERCOSUL_PATTERN.test(value)) {
      return new LicensePlate(value, 'MERCOSUL');
    }
    throw new ValidationError('placa fora do padrão', 'licensePlate');
  }

  /** `ABC-1234` (antiga) / `ABC1D23` (Mercosul, sem hífen). */
  formatted(): string {
    return this.format === 'OLD' ? `${this.value.slice(0, 3)}-${this.value.slice(3)}` : this.value;
  }

  /** Exposição ao cliente e aos logs (PRD-001 RN-008): `ABC1***`. */
  masked(): string {
    return maskLicensePlate(this.value);
  }

  equals(other: LicensePlate): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
