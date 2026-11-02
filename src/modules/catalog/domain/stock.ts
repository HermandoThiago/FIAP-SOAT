/**
 * Regras do estoque (ADR-012, CLAUDE.md regra 6), em TypeScript puro.
 * Invariantes: `quantidade >= 0` e `0 <= reservada <= quantidade`; disponível = quantidade − reservada.
 * Cada função devolve o novo saldo ou lança `StockRuleError`; quem grava (o serviço) persiste o saldo e a
 * movimentação na mesma transação. Contas em milésimos (inteiros) para evitar erro de ponto flutuante nas
 * quantidades de 3 casas decimais.
 */
export interface StockLevel {
  quantidade: number;
  reservada: number;
}

export interface StockResult {
  level: StockLevel;
  /** Quantidade positiva a registrar na movimentação (o tipo define o sentido). */
  movimentada: number;
}

export type StockRuleCode =
  'INSUFFICIENT' | 'RESERVED_EXCEEDS_STOCK' | 'NO_CHANGE' | 'INCONSISTENT';

export class StockRuleError extends Error {
  constructor(
    readonly code: StockRuleCode,
    message: string,
  ) {
    super(message);
  }
}

type NumberLike = number | { toString(): string };

const SCALE = 1000;

export const toMilli = (value: NumberLike) => Math.round(Number(value) * SCALE);
const fromMilli = (milli: number) => milli / SCALE;

export function availableQuantity(level: StockLevel): number {
  return fromMilli(toMilli(level.quantidade) - toMilli(level.reservada));
}

function result(quantidade: number, reservada: number, movimentada: number) {
  return {
    level: {
      quantidade: fromMilli(quantidade),
      reservada: fromMilli(reservada),
    },
    movimentada: fromMilli(movimentada),
  } satisfies StockResult;
}

function assertPositive(quantity: number) {
  if (!(toMilli(quantity) > 0)) {
    throw new StockRuleError(
      'NO_CHANGE',
      'A quantidade da movimentação deve ser maior que zero',
    );
  }
}

/** Entrada de mercadoria: aumenta o saldo físico. */
export function receive(level: StockLevel, quantity: number): StockResult {
  assertPositive(quantity);
  const q = toMilli(quantity);
  return result(toMilli(level.quantidade) + q, toMilli(level.reservada), q);
}

/** Saída manual (perda, uso interno): só tira do que está disponível, nunca do reservado. */
export function issue(level: StockLevel, quantity: number): StockResult {
  assertPositive(quantity);
  const q = toMilli(quantity);
  const available = toMilli(level.quantidade) - toMilli(level.reservada);
  if (q > available) {
    throw new StockRuleError(
      'INSUFFICIENT',
      `Estoque insuficiente: disponível ${fromMilli(available)}`,
    );
  }
  return result(toMilli(level.quantidade) - q, toMilli(level.reservada), q);
}

/**
 * Ajuste de inventário: define o novo saldo físico (contagem). Não pode ficar abaixo do reservado e deve
 * mudar o saldo. A movimentação guarda o módulo da diferença.
 */
export function adjust(level: StockLevel, newQuantity: number): StockResult {
  const target = toMilli(newQuantity);
  const current = toMilli(level.quantidade);
  const reserved = toMilli(level.reservada);
  if (target < 0) {
    throw new StockRuleError(
      'INSUFFICIENT',
      'O novo saldo não pode ser negativo',
    );
  }
  if (target < reserved) {
    throw new StockRuleError(
      'RESERVED_EXCEEDS_STOCK',
      `O novo saldo não pode ficar abaixo da quantidade reservada (${fromMilli(reserved)})`,
    );
  }
  if (target === current) {
    throw new StockRuleError('NO_CHANGE', 'O novo saldo é igual ao atual');
  }
  return result(target, reserved, Math.abs(target - current));
}

/** Reserva na aprovação do orçamento: precisa de saldo disponível. */
export function reserve(level: StockLevel, quantity: number): StockResult {
  assertPositive(quantity);
  const q = toMilli(quantity);
  const available = toMilli(level.quantidade) - toMilli(level.reservada);
  if (q > available) {
    throw new StockRuleError(
      'INSUFFICIENT',
      `Estoque insuficiente: disponível ${fromMilli(available)}`,
    );
  }
  return result(toMilli(level.quantidade), toMilli(level.reservada) + q, q);
}

/** Libera uma reserva sem baixar o saldo. */
export function release(level: StockLevel, quantity: number): StockResult {
  assertPositive(quantity);
  const q = toMilli(quantity);
  if (q > toMilli(level.reservada)) {
    throw new StockRuleError(
      'INCONSISTENT',
      `Não há ${fromMilli(q)} reservado para liberar (reservado ${level.reservada})`,
    );
  }
  return result(toMilli(level.quantidade), toMilli(level.reservada) - q, q);
}

/** Baixa na finalização da OS: consome o que estava reservado (saldo e reserva diminuem juntos). */
export function withdrawReserved(
  level: StockLevel,
  quantity: number,
): StockResult {
  assertPositive(quantity);
  const q = toMilli(quantity);
  if (q > toMilli(level.reservada)) {
    throw new StockRuleError(
      'INCONSISTENT',
      `A baixa de ${fromMilli(q)} excede a quantidade reservada (${level.reservada})`,
    );
  }
  return result(toMilli(level.quantidade) - q, toMilli(level.reservada) - q, q);
}
