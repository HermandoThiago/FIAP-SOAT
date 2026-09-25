import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { type Env } from './shared/config/env';

export const API_PREFIX = 'api/v1';
export const DOCS_PATH = 'docs';
export const OPENAPI_JSON_PATH = 'docs/openapi.json';

// Configuração comum ao main.ts, aos testes de integração e ao script de exportação do OpenAPI:
// prefixo /api/v1 (contrato-api.md), logger pino, Swagger só em APP_ENV=dev (ADR-005).
export function setupApp(app: INestApplication): INestApplication {
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health', 'ready'] });
  app.enableShutdownHooks();
  // Sem fingerprint do framework nas respostas (seguranca.md A05 / plano-analise-vulnerabilidades.md §6).
  const express = app.getHttpAdapter().getInstance() as { disable(setting: string): void };
  express.disable('x-powered-by');

  const config = app.get(ConfigService<Env, true>);
  if (config.get('APP_ENV', { infer: true }) === 'dev') {
    SwaggerModule.setup(DOCS_PATH, app, () => buildOpenApiDocument(app), {
      jsonDocumentUrl: OPENAPI_JSON_PATH,
      swaggerOptions: { persistAuthorization: true },
    });
  }
  return app;
}

// Code-first (ADR-005): título, versão, bearerAuth e tags por módulo são obrigatórios.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle('Sistema de Gestão da Oficina — API')
    .setDescription(
      'Back-end monolítico da oficina mecânica (FIAP Pós Tech SOAT — Tech Challenge Fase 1, grupo 49). ' +
        'Rotas administrativas exigem JWT (ADR-004); /tracking/** aceita o token de acompanhamento ou o login do cliente (ADR-011). ' +
        'Erros seguem o formato Problem Details (RFC 9457).',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
    .addTag('health', 'Liveness e readiness')
    .addTag('identity', 'Autenticação e usuários (JWT HS256, papéis)')
    .addTag('customers', 'Clientes (CPF/CNPJ) e veículos (placa)')
    .addTag('catalog', 'Serviços, peças/insumos e movimentações de estoque')
    .addTag('service-orders', 'Ordens de serviço, itens, orçamento e transições de status')
    .addTag('tracking', 'Acompanhamento pelo cliente (token de acompanhamento ou login CUSTOMER)')
    .addTag('metrics', 'Tempo médio de execução');
  return SwaggerModule.createDocument(app, builder.build());
}
