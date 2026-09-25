import Decimal from 'decimal.js';

// Helpers de decimal compartilhados por `Money` e `Quantity` (glossário §6): converter a entrada em `Decimal` e
// normalizar o resultado. Funções puras, sem framework; cada VO continua dono das suas regras (sinal, limites, escala).

// Só notação decimal simples ("330.00", "+2.5", "-0.001"): sem expoente, espaços, vírgula ou separador de milhar —
// o formato que `toFixed()` devolve e que os repositórios trocam com o Prisma.
const DECIMAL_STRING = /^[+-]?\d+(\.\d+)?$/;

/** `number` finito, string em notação decimal simples ou `Decimal` finito → `Decimal`; qualquer outra entrada → `undefined`. */
export function toDecimal(value: unknown): Decimal | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Decimal(value) : undefined;
  }
  if (typeof value === 'string') {
    return DECIMAL_STRING.test(value) ? new Decimal(value) : undefined;
  }
  // `isDecimal` reconhece também o Decimal empacotado pelo Prisma (mesma lib, cópia distinta).
  if (Decimal.isDecimal(value)) {
    return value.isFinite() ? new Decimal(value) : undefined;
  }
  return undefined;
}

/** Arredonda em `scale` casas (ROUND_HALF_UP); "-0" e negativos que arredondam para zero viram zero positivo. */
export function normalize(value: Decimal, scale: number): Decimal {
  const rounded = value.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
  return rounded.isZero() ? new Decimal(0) : rounded;
}
