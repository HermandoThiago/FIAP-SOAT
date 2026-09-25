import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';

// Gera o openapi.json sem subir o servidor nem conectar ao banco (ADR-005: artefato do CI, não versionado).
// Uso: npm run openapi:export [-- caminho/de/saida.json]   (padrão: reports/openapi.json)
async function main(): Promise<void> {
  // Valores fictícios só para a validação de ambiente passar: nada aqui abre conexão.
  process.env.APP_ENV ??= 'dev';
  process.env.DATABASE_URL ??= 'postgresql://openapi:openapi@localhost:5432/openapi';
  process.env.JWT_SECRET ??= 'openapi-export-only-secret-with-32-chars!';
  process.env.ADMIN_EMAIL ??= 'openapi@oficina.local';
  process.env.ADMIN_PASSWORD ??= 'openapi-export';
  process.env.LOG_LEVEL ??= 'silent';

  const { AppModule } = await import('../src/app.module');
  const { buildOpenApiDocument, API_PREFIX } = await import('../src/app.setup');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health', 'ready'] });
  const document = buildOpenApiDocument(app);

  const output = resolve(process.argv[2] ?? 'reports/openapi.json');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(document, null, 2));
  process.stdout.write(`OpenAPI document written to ${output} (${Object.keys(document.paths).length} paths)\n`);
  await app.close();
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
