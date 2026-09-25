import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { type Logger } from 'nestjs-pino';

import { DomainError, InvalidTransitionError, ValidationError } from '../../../../src/shared/domain/domain-error';
import { type ProblemDetails } from '../../../../src/shared/http/problem-details';
import { ProblemDetailsFilter } from '../../../../src/shared/http/problem-details.filter';
import { RequestValidationException } from '../../../../src/shared/http/validation';

// Filtro global (contrato-api.md §5; seguranca.md A05): testado com ArgumentsHost, Request, Response e Logger falsos.
interface FakeRequest {
  id?: string;
  method: string;
  path: string;
  url: string;
  originalUrl?: string;
}

interface FakeResponse {
  status: jest.Mock<FakeResponse, [number]>;
  type: jest.Mock<FakeResponse, [string]>;
  json: jest.Mock<FakeResponse, [ProblemDetails]>;
}

interface Outcome {
  status: number | undefined;
  contentType: string | undefined;
  body: ProblemDetails;
  logger: { error: jest.Mock<void, unknown[]> };
}

const DEFAULT_REQUEST: FakeRequest = {
  id: 'req-123',
  method: 'GET',
  path: '/api/v1/customers',
  url: '/api/v1/customers?page=1',
  originalUrl: '/api/v1/customers?page=1',
};

class SampleDomainError extends DomainError {
  constructor() {
    super('estoque insuficiente', 'SAMPLE_ERROR');
  }
}

function createResponse(): FakeResponse {
  const response: FakeResponse = {
    status: jest.fn<FakeResponse, [number]>(() => response),
    type: jest.fn<FakeResponse, [string]>(() => response),
    json: jest.fn<FakeResponse, [ProblemDetails]>(() => response),
  };
  return response;
}

function handle(exception: unknown, request: FakeRequest = DEFAULT_REQUEST): Outcome {
  const logger = { error: jest.fn<void, unknown[]>() };
  const response = createResponse();
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new ProblemDetailsFilter(logger as unknown as Logger).catch(exception, host);

  return {
    status: response.status.mock.calls[0]?.[0],
    contentType: response.type.mock.calls[0]?.[0],
    body: response.json.mock.calls[0][0],
    logger,
  };
}

describe('ProblemDetailsFilter', () => {
  describe('response envelope', () => {
    it('should answer with the problem+json content type when any error is handled', () => {
      const { contentType } = handle(new NotFoundException());

      expect(contentType).toBe('application/problem+json');
    });

    it('should use the original URL as instance when the request has one', () => {
      const { body } = handle(new NotFoundException());

      expect(body.instance).toBe('/api/v1/customers?page=1');
    });

    it('should fall back to the request URL as instance when originalUrl is absent', () => {
      const { body } = handle(new NotFoundException(), { ...DEFAULT_REQUEST, originalUrl: undefined });

      expect(body.instance).toBe('/api/v1/customers?page=1');
    });

    it('should expose the request id when the request has one', () => {
      const { body } = handle(new NotFoundException());

      expect(body.requestId).toBe('req-123');
    });

    it('should leave the request id undefined when the request has none', () => {
      const { body } = handle(new NotFoundException(), { ...DEFAULT_REQUEST, id: undefined });

      expect(body.requestId).toBeUndefined();
    });

    it('should send the problem status as HTTP status when responding', () => {
      const { status, body } = handle(new UnauthorizedException());

      expect(status).toBe(401);
      expect(body.status).toBe(401);
    });
  });

  describe('HttpException', () => {
    it('should translate the default Nest 404 message when the route does not exist', () => {
      const { body } = handle(new NotFoundException('Cannot GET /x'), {
        ...DEFAULT_REQUEST,
        method: 'GET',
        path: '/x',
      });

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/not-found',
        title: 'Recurso não encontrado',
        status: 404,
        detail: 'Rota não encontrada: GET /x',
      });
    });

    it('should answer JSON malformado when a BadRequestException mentions JSON', () => {
      const { body } = handle(new BadRequestException('Unexpected token } in JSON at position 12'));

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/bad-request',
        title: 'Requisição inválida',
        status: 400,
        detail: 'JSON malformado',
      });
    });

    it('should answer Parâmetro de rota inválido when Express fails to decode a param', () => {
      const { body } = handle(new BadRequestException("Failed to decode param '%E0%A4%A'"));

      expect(body).toMatchObject({ status: 400, detail: 'Parâmetro de rota inválido' });
    });

    it('should preserve the errors list when the exception body carries one', () => {
      const errors = [{ field: 'document', message: 'CPF inválido' }];

      const { body } = handle(new RequestValidationException(errors));

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/validation',
        title: 'Dados inválidos',
        status: 422,
        detail: 'Dados inválidos',
        errors,
      });
    });

    it('should keep the application message when an UnauthorizedException has one', () => {
      const { body } = handle(new UnauthorizedException('Credenciais inválidas'));

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/unauthorized',
        title: 'Não autenticado',
        status: 401,
        detail: 'Credenciais inválidas',
      });
    });

    it('should join the messages with a semicolon when the exception carries a list', () => {
      const { body } = handle(new BadRequestException(['nome obrigatório', 'e-mail inválido']));

      expect(body.detail).toBe('nome obrigatório; e-mail inválido');
    });

    it('should not include errors when the exception body has none', () => {
      const { body } = handle(new UnauthorizedException('Credenciais inválidas'));

      expect(body.errors).toBeUndefined();
    });

    it('should use the plain text as detail when the HttpException body is a string', () => {
      const { body } = handle(new HttpException('Serviço em manutenção', 503));

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/service-unavailable',
        title: 'Serviço indisponível',
        status: 503,
        detail: 'Serviço em manutenção',
      });
    });

    it('should log the error when the HttpException has a 5xx status', () => {
      const exception = new InternalServerErrorException();

      const { body, logger } = handle(exception);

      expect(body.status).toBe(500);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('domain errors', () => {
    it('should answer 422 with the field error when a ValidationError has a field', () => {
      const { body } = handle(new ValidationError('CPF com dígito verificador inválido', 'document'));

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/validation',
        title: 'Dados inválidos',
        status: 422,
        detail: 'CPF com dígito verificador inválido',
        errors: [{ field: 'document', message: 'CPF com dígito verificador inválido' }],
      });
    });

    it('should answer 422 without errors when a ValidationError has no field', () => {
      const { body } = handle(new ValidationError('orçamento sem itens'));

      expect(body).toMatchObject({ status: 422, detail: 'orçamento sem itens' });
      expect(body.errors).toBeUndefined();
    });

    it('should answer 409 with the transition message when an InvalidTransitionError is thrown', () => {
      const { body } = handle(new InvalidTransitionError('RECEIVED', 'COMPLETED'));

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/conflict',
        title: 'Conflito',
        status: 409,
        detail: 'transição inválida de RECEIVED para COMPLETED',
      });
      expect(body.errors).toBeUndefined();
    });

    it('should answer 422 when a custom DomainError subclass is thrown', () => {
      const { body } = handle(new SampleDomainError());

      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/validation',
        title: 'Dados inválidos',
        status: 422,
        detail: 'estoque insuficiente',
      });
      expect(body.errors).toBeUndefined();
    });

    it('should not log when the error is a domain error', () => {
      const { logger } = handle(new ValidationError('inválido'));

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('body-parser errors', () => {
    it('should answer 413 when the body parser rejects a body that is too large', () => {
      const { status, body } = handle({ status: 413, type: 'entity.too.large' });

      expect(status).toBe(413);
      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/payload-too-large',
        title: 'Corpo da requisição muito grande',
        status: 413,
        detail: 'Corpo da requisição muito grande',
      });
    });

    it('should answer JSON malformado when the body parser fails to parse the body', () => {
      const { body } = handle({ status: 400, type: 'entity.parse.failed' });

      expect(body).toMatchObject({ status: 400, detail: 'JSON malformado' });
    });

    it('should answer a generic detail when the body parser error type is unknown', () => {
      const { body } = handle({ status: 415, type: 'encoding.unsupported' });

      expect(body).toMatchObject({ status: 415, detail: 'Requisição inválida' });
    });
  });

  describe('unexpected errors', () => {
    it('should answer 500 with a generic detail when the error is unknown', () => {
      const { status, body } = handle(new Error('boom: connection refused'));

      expect(status).toBe(500);
      expect(body).toMatchObject({
        type: 'https://oficina.local/errors/internal',
        title: 'Erro interno',
        status: 500,
        detail: 'Erro inesperado. Tente novamente mais tarde.',
        instance: '/api/v1/customers?page=1',
        requestId: 'req-123',
      });
    });

    it('should not leak the message or the stack when the error is unknown', () => {
      const { body } = handle(new Error('boom: connection refused'));

      const serialized = JSON.stringify(body);
      expect(body).not.toHaveProperty('stack');
      expect(serialized).not.toContain('boom');
      expect(serialized).not.toContain('at ');
    });

    it('should log the error with the request context when the error is unknown', () => {
      const exception = new Error('boom');

      const { logger } = handle(exception);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        { err: exception, requestId: 'req-123', path: '/api/v1/customers?page=1' },
        'Unhandled error',
      );
    });

    it('should answer 500 when a non-Error value is thrown', () => {
      const { status, body } = handle('boom');

      expect(status).toBe(500);
      expect(body.detail).toBe('Erro inesperado. Tente novamente mais tarde.');
    });

    it('should not log when the error maps to a 4xx status', () => {
      const { logger } = handle(new NotFoundException());

      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});

describe('ProblemDetailsFilter — default framework messages', () => {
  it.each([
    [new UnauthorizedException(), 401, 'Não autenticado'],
    [new ForbiddenException(), 403, 'Acesso negado'],
    [new NotFoundException(), 404, 'Recurso não encontrado'],
    [new ConflictException(), 409, 'Conflito'],
    [new BadRequestException(), 400, 'Requisição inválida'],
  ])(
    'should translate the default Nest message to Portuguese when %s carries no application message',
    (exception, status, detail) => {
      const { body } = handle(exception);

      expect(body.status).toBe(status);
      expect(body.detail).toBe(detail);
    },
  );

  it('should translate "Forbidden resource" when a guard denies access without a custom message', () => {
    const { body } = handle(new ForbiddenException('Forbidden resource'));

    expect(body.detail).toBe('Acesso negado');
  });
});
