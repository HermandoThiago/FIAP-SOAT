import { startTestDatabase, type TestDatabase } from './test-database';
import { applyTestEnv } from './test-env';

declare global {
  var __TEST_DATABASE__: TestDatabase | undefined;
}

// Sobe o PostgreSQL de teste uma vez por execução do Jest (projeto `integration`), aplica as migrações e define o
// ambiente de teste antes de qualquer arquivo de teste importar o AppModule (a validação de env roda no import).
export default async function globalSetup(): Promise<void> {
  const database = await startTestDatabase();
  globalThis.__TEST_DATABASE__ = database;
  process.env.DATABASE_URL = database.url;
  applyTestEnv();
}
