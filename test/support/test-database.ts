import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// Banco dos testes de integração/BDD (ADR-006): PostgreSQL 16 real via Testcontainers, com as migrações do Prisma
// aplicadas antes da suíte. Sem Docker (ex.: CI restrito), aponte TEST_DATABASE_URL para um PostgreSQL 16 vazio.
export interface TestDatabase {
  url: string;
  stop(): Promise<void>;
}

export const POSTGRES_IMAGE = 'postgres:16-alpine';

export async function startTestDatabase(): Promise<TestDatabase> {
  const external = process.env.TEST_DATABASE_URL;
  if (external) {
    applyMigrations(external);
    return { url: external, stop: () => Promise.resolve() };
  }

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('oficina_test')
    .withUsername('oficina')
    .withPassword('oficina')
    .start();
  const url = container.getConnectionUri();
  applyMigrations(url);
  return { url, stop: () => container.stop().then(() => undefined) };
}

function applyMigrations(databaseUrl: string): void {
  const prismaCli = resolve(__dirname, '../../node_modules/prisma/build/index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
