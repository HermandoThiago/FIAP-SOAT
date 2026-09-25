import { startTestDatabase, type TestDatabase } from './test-database';

declare global {
  // eslint-disable-next-line no-var
  var __TEST_DATABASE__: TestDatabase | undefined;
}

// Sobe o PostgreSQL de teste uma vez por execução do Jest (projeto `integration`) e expõe a URL aos testes.
export default async function globalSetup(): Promise<void> {
  const database = await startTestDatabase();
  globalThis.__TEST_DATABASE__ = database;
  process.env.DATABASE_URL = database.url;
}
