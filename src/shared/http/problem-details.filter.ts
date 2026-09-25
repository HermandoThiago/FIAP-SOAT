import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { Logger } from 'nestjs-pino';

import { DomainError, InvalidTransitionError, ValidationError } from '../domain/domain-error';
import { type FieldError, type ProblemDetails, problemTypeFor } from './problem-details';

interface HttpExceptionBody {
  message?: string | string[];
  errors?: FieldError[];
}

// Filtro global: toda resposta de erro sai como Problem Details (contrato-api.md §5), sem stack trace (seguranca.md A05).
// Erros de domínio: ValidationError → 422; InvalidTransitionError → 409 (contrato-api.md §4).
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { id?: string }>();
    const response = ctx.getResponse<Response>();

    const problem = this.toProblem(exception, request);
    if (problem.status >= 500) {
      this.logger.error({ err: exception, requestId: request.id, path: request.originalUrl }, 'Unhandled error');
    }
    response.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown, request: Request & { id?: string }): ProblemDetails {
    const base = { instance: request.originalUrl ?? request.url, requestId: request.id };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const parsed: HttpExceptionBody = typeof body === 'string' ? { message: body } : body;
      const message = Array.isArray(parsed.message) ? parsed.message.join('; ') : parsed.message;
      const detail = translateFrameworkMessage(status, message, request);
      return { ...problemTypeFor(status), status, detail, ...base, errors: parsed.errors };
    }

    if (exception instanceof InvalidTransitionError) {
      const status = HttpStatus.CONFLICT;
      return { ...problemTypeFor(status), status, detail: exception.message, ...base };
    }

    if (exception instanceof ValidationError) {
      const status = HttpStatus.UNPROCESSABLE_ENTITY;
      const errors = exception.field ? [{ field: exception.field, message: exception.message }] : undefined;
      return { ...problemTypeFor(status), status, detail: exception.message, ...base, errors };
    }

    if (exception instanceof DomainError) {
      const status = HttpStatus.UNPROCESSABLE_ENTITY;
      return { ...problemTypeFor(status), status, detail: exception.message, ...base };
    }

    if (isBodyParserError(exception)) {
      const status = exception.status;
      return { ...problemTypeFor(status), status, detail: bodyParserDetail(exception.type), ...base };
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return { ...problemTypeFor(status), status, detail: 'Erro inesperado. Tente novamente mais tarde.', ...base };
  }
}

// Mensagens padrão do Nest/Express em inglês (ex.: "Unauthorized", "Forbidden resource", "Cannot GET /x") → português
// (ADR-013; contrato-api.md §5). Mensagens escritas pela aplicação passam intactas.
const NEST_DEFAULT_MESSAGES = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Forbidden resource',
  'Not Found',
  'Method Not Allowed',
  'Conflict',
  'Payload Too Large',
  'Unsupported Media Type',
  'Unprocessable Entity',
  'Too Many Requests',
  'Internal Server Error',
  'Service Unavailable',
]);

function translateFrameworkMessage(status: HttpStatus, message: string | undefined, request: Request): string {
  if (message === undefined || message === '' || NEST_DEFAULT_MESSAGES.has(message)) {
    return problemTypeFor(status).title;
  }
  if (status === HttpStatus.NOT_FOUND && message.startsWith('Cannot ')) {
    return `Rota não encontrada: ${request.method} ${request.path}`;
  }
  if (status === HttpStatus.BAD_REQUEST && /JSON/i.test(message)) {
    return 'JSON malformado';
  }
  if (status === HttpStatus.BAD_REQUEST && message.startsWith('Failed to decode param')) {
    return 'Parâmetro de rota inválido';
  }
  return message;
}

interface BodyParserError {
  status: number;
  type: string;
}

// Erros do body-parser do Express (JSON malformado, corpo grande demais) chegam como erros comuns com `status`/`type`.
function isBodyParserError(exception: unknown): exception is BodyParserError {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'status' in exception &&
    'type' in exception &&
    typeof (exception as BodyParserError).status === 'number' &&
    (exception as BodyParserError).status >= 400 &&
    (exception as BodyParserError).status < 500
  );
}

function bodyParserDetail(type: string): string {
  switch (type) {
    case 'entity.parse.failed':
      return 'JSON malformado';
    case 'entity.too.large':
      return 'Corpo da requisição muito grande';
    default:
      return 'Requisição inválida';
  }
}
