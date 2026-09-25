import { AfterAll, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import { type INestApplication } from '@nestjs/common';

import { startTestDatabase, type TestDatabase } from '../../support/test-database';
import { applyTestEnv } from '../../support/test-env';
import { registerApp, releaseApp } from './world';

// Subir o PostgreSQL (Testcontainers ou TEST_DATABASE_URL) e a aplicação pode passar de 5 s (padrão do Cucumber).
setDefaultTimeout(120_000);

let database: TestDatabase | undefined;
let app: INestApplication | undefined;

// Uma instância da API por execução, sobre o banco de teste com as migrações aplicadas (ADR-006).
BeforeAll(async () => {
  database = await startTestDatabase();
  process.env.DATABASE_URL = database.url;
  applyTestEnv();
  // ConfigModule.forRoot({ validate }) roda no import do AppModule: o ambiente de teste precisa estar definido antes,
  // senão a validação falha sem .env (CI) ou congela APP_ENV/LOG_LEVEL do .env local. Por isso o import é tardio.
  const { createTestApp } = await import('../../support/test-app');
  app = await createTestApp();
  registerApp(app);
});

AfterAll(async () => {
  releaseApp();
  await app?.close();
  await database?.stop();
});
