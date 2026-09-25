import { DomainError, InvalidTransitionError, ValidationError } from '../../../../src/shared/domain/domain-error';

// Subclasse própria, como as que os módulos criarão (ex.: estoque insuficiente — PRD-002).
class SampleDomainError extends DomainError {
  constructor() {
    super('estoque insuficiente', 'SAMPLE_ERROR');
  }
}

describe('ValidationError', () => {
  it('should expose the message, the field and the code when created with a field', () => {
    const error = new ValidationError('CPF com dígito verificador inválido', 'document');

    expect(error.message).toBe('CPF com dígito verificador inválido');
    expect(error.field).toBe('document');
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should leave the field undefined when created without one', () => {
    const error = new ValidationError('orçamento sem itens');

    expect(error.field).toBeUndefined();
  });

  it('should use the subclass name as name when created', () => {
    expect(new ValidationError('inválido').name).toBe('ValidationError');
  });

  it('should be an instance of DomainError and Error when checked with instanceof', () => {
    const error = new ValidationError('inválido');

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('InvalidTransitionError', () => {
  it('should build the Portuguese transition message when created with both statuses', () => {
    const error = new InvalidTransitionError('RECEIVED', 'COMPLETED');

    expect(error.message).toBe('transição inválida de RECEIVED para COMPLETED');
  });

  it('should expose the statuses and the code when created', () => {
    const error = new InvalidTransitionError('DELIVERED', 'CANCELLED');

    expect(error.fromStatus).toBe('DELIVERED');
    expect(error.toStatus).toBe('CANCELLED');
    expect(error.code).toBe('INVALID_TRANSITION');
  });

  it('should use the subclass name as name when created', () => {
    expect(new InvalidTransitionError('RECEIVED', 'COMPLETED').name).toBe('InvalidTransitionError');
  });

  it('should not be a ValidationError when checked with instanceof', () => {
    const error = new InvalidTransitionError('RECEIVED', 'COMPLETED');

    expect(error).toBeInstanceOf(DomainError);
    expect(error).not.toBeInstanceOf(ValidationError);
  });
});

describe('DomainError subclasses', () => {
  it('should take the concrete class name when a custom subclass is created', () => {
    const error = new SampleDomainError();

    expect(error.name).toBe('SampleDomainError');
    expect(error.code).toBe('SAMPLE_ERROR');
    expect(error.message).toBe('estoque insuficiente');
  });

  it('should keep the prototype chain when a custom subclass is created', () => {
    const error = new SampleDomainError();

    expect(error).toBeInstanceOf(SampleDomainError);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ValidationError);
  });
});
