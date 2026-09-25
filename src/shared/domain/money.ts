import Decimal from 'decimal.js';

import { normalize, toDecimal } from './decimal';
import { ValidationError } from './domain-error';
import { Quantity } from './quantity';

// Money (glossário §6; agregados.md §2): BRL em decimal com 2 casas, nunca negativo (PRD-002 RN-020; PRD-003 RN-032),
// máximo 9999999999.99 — decimal(12,2) das colunas de preço/valor (modelo-de-dados.md; PRD-005 RN-063).
// Aritmética via decimal.js (sem float); arredondamento ROUND_HALF_UP na criação e na multiplicação
// (contrato-api.md: dinheiro como decimal com 2 casas, ex. 330.00). Strings só em notação decimal simples ("330.00"),
// o formato que `toFixed()` devolve e que os repositórios trocam com o Prisma.

const SCALE = 2;
const MAX = new Decimal('9999999999.99');

export class Money {
  private constructor(private readonly amount: Decimal) {
    Object.freeze(this);
  }

  /** Cria o valor validando e arredondando para 2 casas; `field` identifica o campo no Problem Details (422). */
  static of(value: number | string | Decimal, field = 'amount'): Money {
    const parsed = toDecimal(value);
    if (parsed === undefined) {
      throw new ValidationError('valor monetário inválido', field);
    }
    if (parsed.lessThan(0)) {
      throw new ValidationError('valor monetário não pode ser negativo', field);
    }
    const normalized = normalize(parsed, SCALE);
    if (normalized.greaterThan(MAX)) {
      throw new ValidationError(`valor monetário excede o máximo de ${MAX.toFixed(SCALE)}`, field);
    }
    return new Money(normalized);
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  /** Soma (total do orçamento); resultado sujeito ao mesmo limite máximo. */
  add(other: Money): Money {
    return Money.of(this.amount.plus(other.amount));
  }

  /** Multiplica por fator ou `Quantity` (subtotal de item); resultado arredondado em 2 casas. */
  multiply(factor: number | string | Decimal | Quantity): Money {
    const multiplier = factor instanceof Quantity ? factor.toDecimal() : toDecimal(factor);
    if (multiplier === undefined) {
      throw new ValidationError('fator de multiplicação inválido');
    }
    return Money.of(this.amount.times(multiplier));
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isGreaterThan(other: Money): boolean {
    return this.amount.greaterThan(other.amount);
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.amount.greaterThanOrEqualTo(other.amount);
  }

  equals(other: Money): boolean {
    return this.amount.equals(other.amount);
  }

  toNumber(): number {
    return this.amount.toNumber();
  }

  /** Sempre 2 casas ("330.00") — formato usado pelos repositórios (Prisma Decimal). */
  toFixed(): string {
    return this.amount.toFixed(SCALE, Decimal.ROUND_HALF_UP);
  }

  toString(): string {
    return this.toFixed();
  }

  /** O JSON da API leva número (contrato-api.md). */
  toJSON(): number {
    return this.toNumber();
  }

  toDecimal(): Decimal {
    return new Decimal(this.amount);
  }
}
