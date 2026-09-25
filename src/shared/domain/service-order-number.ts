import { ValidationError } from './domain-error';

// Número da OS (glossário §2; ADR-009 Decisão): rótulo legível `OS-AAAA-NNNNNN`, único, com sequência anual. A sequência
// vem do banco (`service_orders.service_order_number_seq`); o VO só formata e valida. As rotas da API usam o UUID.
// Invariante única (parse e generate): ano de 4 dígitos em 2000..9999 e sequência inteira em 1..999999.

const PATTERN = /^OS-(\d{4})-(\d{6})$/;
const SEQUENCE_DIGITS = 6;
const MIN_YEAR = 2000;
const MAX_YEAR = 9999;
const MIN_SEQUENCE = 1;
const MAX_SEQUENCE = 999_999;

export class ServiceOrderNumber {
  private constructor(
    readonly value: string,
    readonly year: number,
    readonly sequence: number,
  ) {}

  /**
   * Aceita só o formato exato `OS-AAAA-NNNNNN` (maiúsculas, sem espaços) e as mesmas faixas de `generate()`;
   * fora deles → 422 `number`. Entrada que não seja string cai na mesma validação (nunca TypeError).
   */
  static parse(raw: string): ServiceOrderNumber {
    const match = typeof raw === 'string' ? PATTERN.exec(raw) : null;
    if (match === null) {
      throw new ValidationError('número da OS inválido', 'number');
    }
    // O formato é exato, então `generate()` reconstrói o mesmo texto — e aplica as faixas de ano e sequência.
    return ServiceOrderNumber.generate(Number(match[1]), Number(match[2]));
  }

  /** Monta `OS-2026-000042` a partir do ano (4 dígitos, 2000..9999) e da sequência anual (inteiro 1..999999). */
  static generate(year: number, sequence: number): ServiceOrderNumber {
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new ValidationError('ano do número da OS inválido', 'number');
    }
    if (!Number.isInteger(sequence) || sequence < MIN_SEQUENCE || sequence > MAX_SEQUENCE) {
      throw new ValidationError('sequência do número da OS inválida', 'number');
    }
    const value = `OS-${year}-${String(sequence).padStart(SEQUENCE_DIGITS, '0')}`;
    return new ServiceOrderNumber(value, year, sequence);
  }

  equals(other: ServiceOrderNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
