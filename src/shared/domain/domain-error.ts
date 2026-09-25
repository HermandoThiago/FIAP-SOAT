// Erros de domínio (glossário §6): o filtro Problem Details traduz ValidationError → 422 e
// InvalidTransitionError → 409 (contrato-api.md §4/§5). Textos em português (ADR-013).

export abstract class DomainError extends Error {
  protected constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Violação de invariante ou de validação de negócio → 422 (ex.: CPF inválido, estoque insuficiente). */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message, 'VALIDATION_ERROR');
  }
}

/** Comando de negócio inválido para o status atual da OS → 409 (PRD-004 §2; ADR-010). */
export class InvalidTransitionError extends DomainError {
  constructor(
    readonly fromStatus: string,
    readonly toStatus: string,
  ) {
    super(`transição inválida de ${fromStatus} para ${toStatus}`, 'INVALID_TRANSITION');
  }
}
