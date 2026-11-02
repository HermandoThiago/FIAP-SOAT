import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';

export const SEED_PASSWORD = 'Integration#Pass123';

/**
 * Sobe um PostgreSQL 16 descartável (Testcontainers — ADR-006), aplica as migrações e o seed.
 * `INTEGRATION_DATABASE_URL` aponta para um banco já existente e vazio (ex.: serviço do CI) e dispensa o Docker.
 * Nunca usa o `DATABASE_URL` do `.env`, para não tocar no banco de desenvolvimento.
 */
export default async function globalSetup() {
  let databaseUrl = process.env['INTEGRATION_DATABASE_URL'];

  if (!databaseUrl) {
    const container = await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start();
    (globalThis as { __PG_CONTAINER__?: unknown }).__PG_CONTAINER__ = container;
    databaseUrl = container.getConnectionUri();
  }

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    SEED_PASSWORD,
  };

  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npx tsx src/scripts/seed.ts', { env, stdio: 'inherit' });

  process.env['DATABASE_URL'] = databaseUrl;
  process.env['INTEGRATION_DB_READY'] = '1';
}
