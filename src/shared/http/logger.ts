import { randomUUID } from 'node:crypto';

import { type IncomingMessage, type ServerResponse } from 'node:http';
import { type Params } from 'nestjs-pino';

import { type Env } from '../config/env';
import { maskPii, maskPiiDeep } from './pii-mask';

export const REQUEST_ID_HEADER = 'x-request-id';

// Logs estruturados (pino) com requestId e máscara de PII (visao-geral.md §6; ADR-009). Em APP_ENV=dev, saída legível.
export function buildLoggerParams(env: Pick<Env, 'APP_ENV' | 'LOG_LEVEL'>): Params {
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
        res.setHeader(REQUEST_ID_HEADER, requestId);
        return requestId;
      },
      customProps: (req: IncomingMessage) => ({ requestId: (req as IncomingMessage & { id?: string }).id }),
      customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method ?? ''} ${maskPii(req.url ?? '')} ${res.statusCode}`,
      customErrorMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method ?? ''} ${maskPii(req.url ?? '')} ${res.statusCode}`,
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[REDACTED]',
      },
      serializers: {
        req: (req: { id?: string; method?: string; url?: string; remoteAddress?: string }) => ({
          id: req.id,
          method: req.method,
          url: maskPii(req.url ?? ''),
          remoteAddress: req.remoteAddress,
        }),
        res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
      },
      hooks: {
        logMethod(args, method) {
          // Mascara CPF/CNPJ/placa em qualquer mensagem ou objeto logado pela aplicação.
          method.apply(this, args.map((arg: unknown) => maskPiiDeep(arg)) as Parameters<typeof method>);
        },
      },
      transport:
        env.APP_ENV === 'dev'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
          : undefined,
    },
  };
}
