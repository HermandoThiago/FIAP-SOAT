import {
  UnprocessableEntityException,
  type ValidationError as ClassValidatorError,
  ValidationPipe,
} from '@nestjs/common';

import { type FieldError } from './problem-details';

// Validação sintática dos DTOs (class-validator) → 422 com `errors[].field` (contrato-api.md §4/§5; PRD-005 RN-063).
export function flattenValidationErrors(errors: ClassValidatorError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    const nested = error.children?.length ? flattenValidationErrors(error.children, field) : [];
    return [...own, ...nested];
  });
}

export class RequestValidationException extends UnprocessableEntityException {
  constructor(readonly errors: FieldError[]) {
    super({ message: 'Dados inválidos', errors });
  }
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors) => new RequestValidationException(flattenValidationErrors(errors)),
  });
}
