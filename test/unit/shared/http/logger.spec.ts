import { type IncomingMessage, type ServerResponse } from 'node:http';

import { type LogFn, type Logger as PinoLogger } from 'pino';
import { type Options } from 'pino-http';

import { buildLoggerParams, REQUEST_ID_HEADER } from '../../../../src/shared/http/logger';

// Logs estruturados com requestId e máscara de PII (visao-geral.md §6; ADR-009).
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CPF_DIGITS = '52998224725';
const CPF_MASKED = '***.982.247-**';

type LoggerEnv = Parameters<typeof buildLoggerParams>[0];

function pinoOptions(env: LoggerEnv = { APP_ENV: 'test', LOG_LEVEL: 'silent' }): Options {
  const { pinoHttp } = buildLoggerParams(env);
  if (pinoHttp === undefined || Array.isArray(pinoHttp) || 'write' in pinoHttp) {
    throw new Error('expected pino-http options');
  }
  return pinoHttp;
}

function requireDefined<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`expected ${what} to be configured`);
  }
  return value;
}

function fakeRequest(headers: Record<string, string | string[] | undefined> = {}): IncomingMessage {
  return { headers, method: 'GET', url: '/api/v1/customers' } as unknown as IncomingMessage;
}

function fakeResponse(statusCode = 200): { res: ServerResponse; setHeader: jest.Mock<void, [string, string]> } {
  const setHeader = jest.fn<void, [string, string]>();
  return { res: { statusCode, setHeader } as unknown as ServerResponse, setHeader };
}

describe('buildLoggerParams', () => {
  describe('level and transport', () => {
    it('should use the configured level when LOG_LEVEL is set', () => {
      expect(pinoOptions({ APP_ENV: 'prod', LOG_LEVEL: 'debug' }).level).toBe('debug');
    });

    it('should enable the pino-pretty transport when APP_ENV is dev', () => {
      expect(pinoOptions({ APP_ENV: 'dev', LOG_LEVEL: 'info' }).transport).toMatchObject({ target: 'pino-pretty' });
    });

    it.each(['test', 'prod'] as const)('should not configure a transport when APP_ENV is %s', (appEnv) => {
      expect(pinoOptions({ APP_ENV: appEnv, LOG_LEVEL: 'info' }).transport).toBeUndefined();
    });

    it('should redact the authorization and cookie headers when configured', () => {
      const { redact } = pinoOptions();

      expect(redact).toMatchObject({ censor: '[REDACTED]' });
      expect(redact).toHaveProperty(
        'paths',
        expect.arrayContaining(['req.headers.authorization', 'req.headers.cookie']),
      );
    });
  });

  describe('genReqId', () => {
    it('should reuse the incoming x-request-id when the header is present', () => {
      const genReqId = requireDefined(pinoOptions().genReqId, 'genReqId');
      const { res, setHeader } = fakeResponse();

      const requestId = genReqId(fakeRequest({ [REQUEST_ID_HEADER]: 'req-123' }), res);

      expect(requestId).toBe('req-123');
      expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'req-123');
    });

    it('should take the first value when the header is repeated', () => {
      const genReqId = requireDefined(pinoOptions().genReqId, 'genReqId');
      const { res } = fakeResponse();

      expect(genReqId(fakeRequest({ [REQUEST_ID_HEADER]: ['req-1', 'req-2'] }), res)).toBe('req-1');
    });

    it('should generate a UUID v4 and set the response header when the header is absent', () => {
      const genReqId = requireDefined(pinoOptions().genReqId, 'genReqId');
      const { res, setHeader } = fakeResponse();

      const requestId = genReqId(fakeRequest(), res);

      expect(requestId).toMatch(UUID_V4);
      expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, requestId);
    });

    it('should generate a UUID v4 when the header is empty', () => {
      const genReqId = requireDefined(pinoOptions().genReqId, 'genReqId');
      const { res } = fakeResponse();

      expect(genReqId(fakeRequest({ [REQUEST_ID_HEADER]: '' }), res)).toMatch(UUID_V4);
    });

    it('should generate distinct ids when called for different requests', () => {
      const genReqId = requireDefined(pinoOptions().genReqId, 'genReqId');

      const first = genReqId(fakeRequest(), fakeResponse().res);
      const second = genReqId(fakeRequest(), fakeResponse().res);

      expect(first).not.toBe(second);
    });
  });

  describe('serializers and messages', () => {
    it('should mask the URL and keep only safe fields when serializing the request', () => {
      const serializers = requireDefined(pinoOptions().serializers, 'serializers');
      const req = {
        id: 'req-123',
        method: 'GET',
        url: `/api/v1/customers?document=${CPF_DIGITS}`,
        remoteAddress: '127.0.0.1',
        headers: { authorization: 'Bearer x' },
      };

      const serialized: unknown = serializers.req(req);

      expect(serialized).toEqual({
        id: 'req-123',
        method: 'GET',
        url: `/api/v1/customers?document=${CPF_MASKED}`,
        remoteAddress: '127.0.0.1',
      });
    });

    it('should keep only the status code when serializing the response', () => {
      const serializers = requireDefined(pinoOptions().serializers, 'serializers');

      const serialized: unknown = serializers.res({ statusCode: 201, headers: { 'set-cookie': 'x' } });

      expect(serialized).toEqual({ statusCode: 201 });
    });

    it('should mask the URL when building the success message', () => {
      const customSuccessMessage = requireDefined(pinoOptions().customSuccessMessage, 'customSuccessMessage');
      const req = { method: 'GET', url: '/api/v1/vehicles/ABC1D23', headers: {} } as unknown as IncomingMessage;

      expect(customSuccessMessage(req, fakeResponse(200).res, 12)).toBe('GET /api/v1/vehicles/ABC1*** 200');
    });

    it('should mask the URL when building the error message', () => {
      const customErrorMessage = requireDefined(pinoOptions().customErrorMessage, 'customErrorMessage');
      const req = { method: 'POST', url: `/api/v1/customers/${CPF_DIGITS}`, headers: {} } as unknown as IncomingMessage;

      expect(customErrorMessage(req, fakeResponse(500).res, new Error('boom'))).toBe(
        `POST /api/v1/customers/${CPF_MASKED} 500`,
      );
    });

    it('should fall back to empty strings when the request has no method or URL', () => {
      const options = pinoOptions();
      const customSuccessMessage = requireDefined(options.customSuccessMessage, 'customSuccessMessage');
      const serializers = requireDefined(options.serializers, 'serializers');
      const req = { headers: {} } as unknown as IncomingMessage;

      const serialized: unknown = serializers.req({ id: 'req-123' });

      expect(customSuccessMessage(req, fakeResponse(204).res, 3)).toBe('  204');
      expect(serialized).toEqual({ id: 'req-123', method: undefined, url: '', remoteAddress: undefined });
    });

    it('should expose the request id as requestId when adding custom props', () => {
      const customProps = requireDefined(pinoOptions().customProps, 'customProps');
      const req = { id: 'req-123', headers: {} } as unknown as IncomingMessage;

      expect(customProps(req, fakeResponse().res)).toEqual({ requestId: 'req-123' });
    });
  });

  describe('logMethod hook', () => {
    it('should mask PII in every argument when a log method is called', () => {
      const logMethod = requireDefined(pinoOptions().hooks?.logMethod, 'hooks.logMethod');
      const method = jest.fn<void, unknown[], unknown>();
      const context = {} as unknown as PinoLogger;
      const args = [
        { document: CPF_DIGITS, nested: { plate: 'ABC-1D23' } },
        `Cliente ${CPF_DIGITS} cadastrado`,
      ] as unknown as Parameters<LogFn>;

      logMethod.call(context, args, method, 30);

      expect(method).toHaveBeenCalledTimes(1);
      expect(method).toHaveBeenCalledWith(
        { document: CPF_MASKED, nested: { plate: 'ABC1***' } },
        `Cliente ${CPF_MASKED} cadastrado`,
      );
    });

    it('should invoke the log method with the logger as this when the hook runs', () => {
      const logMethod = requireDefined(pinoOptions().hooks?.logMethod, 'hooks.logMethod');
      const method = jest.fn<void, unknown[], unknown>();
      const context = {} as unknown as PinoLogger;

      logMethod.call(context, ['mensagem sem PII'] as unknown as Parameters<LogFn>, method, 30);

      expect(method.mock.contexts[0]).toBe(context);
      expect(method).toHaveBeenCalledWith('mensagem sem PII');
    });
  });
});

describe('buildLoggerParams — error serializer', () => {
  it('should mask PII in the message and stack when serializing an error', () => {
    const serializers = requireDefined(pinoOptions().serializers, 'serializers');
    const error = new Error(`documento ${CPF_DIGITS} e placa ABC1D23`);

    const serialized = serializers.err(error) as { type: string; message: string; stack?: string };

    expect(serialized.type).toBe('Error');
    expect(serialized.message).toBe(`documento ${CPF_MASKED} e placa ABC1***`);
    expect(serialized.stack).toContain(CPF_MASKED);
    expect(serialized.stack).not.toContain(CPF_DIGITS);
  });
});
