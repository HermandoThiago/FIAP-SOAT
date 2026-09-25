import Decimal from 'decimal.js';

import { normalize, toDecimal } from './decimal';
import { ValidationError } from './domain-error';

// Quantity (glossário §6; agregados.md §2): decimal(10,3) ≥ 0 — insumos fracionários (PRD-002 Q3) ou inteiro para peças
// contáveis (`isWhole()`). Aritmética via decimal.js (sem float); entrada arredondada para 3 casas com ROUND_HALF_UP;
// máximo 9999999.999 (7 dígitos inteiros, modelo-de-dados.md). Strings só em notação decimal simples ("2.500").

const SCALE = 3;
const MAX = new Decimal('9999999.999');

export class Quantity {
  private constructor(private readonly value: Decimal) {
    Object.freeze(this);
  }

  /** Cria a quantidade validando e arredondando para 3 casas; `field` identifica o campo no Problem Details (422). */
  static of(value: number | string | Decimal, field = 'quantity'): Quantity {
    const parsed = toDecimal(value);
    if (parsed === undefined) {
      throw new ValidationError('quantidade inválida', field);
    }
    if (parsed.lessThan(0)) {
      throw new ValidationError('quantidade não pode ser negativa', field);
    }
    const normalized = normalize(parsed, SCALE);
    if (normalized.greaterThan(MAX)) {
      throw new ValidationError(`quantidade excede o máximo de ${MAX.toFixed(SCALE)}`, field);
    }
    return new Quantity(normalized);
  }

  static zero(): Quantity {
    return new Quantity(new Decimal(0));
  }

  /** Sem parte fracionária — exigido para peças contáveis. */
  isWhole(): boolean {
    return this.value.isInteger();
  }

  add(other: Quantity): Quantity {
    return Quantity.of(this.value.plus(other.value));
  }

  subtract(other: Quantity): Quantity {
    const result = this.value.minus(other.value);
    if (result.lessThan(0)) {
      throw new ValidationError('quantidade não pode ficar negativa', 'quantity');
    }
    return new Quantity(normalize(result, SCALE));
  }

  isGreaterThan(other: Quantity): boolean {
    return this.value.greaterThan(other.value);
  }

  isGreaterThanOrEqual(other: Quantity): boolean {
    return this.value.greaterThanOrEqualTo(other.value);
  }

  isPositive(): boolean {
    return this.value.greaterThan(0);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  equals(other: Quantity): boolean {
    return this.value.equals(other.value);
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  /** Sempre 3 casas ("2.500") — formato usado pelos repositórios (Prisma Decimal). */
  toFixed(): string {
    return this.value.toFixed(SCALE, Decimal.ROUND_HALF_UP);
  }

  toString(): string {
    return this.toFixed();
  }

  /** O JSON da API leva número (contrato-api.md). */
  toJSON(): number {
    return this.toNumber();
  }

  toDecimal(): Decimal {
    return new Decimal(this.value);
  }
}
