// Variáveis de ambiente dos testes de integração/BDD — valores fictícios, distintos do .env.example (seguranca.md).
export const TEST_JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-characters';
export const TEST_ADMIN_EMAIL = 'manager@test.oficina.local';
export const TEST_ADMIN_PASSWORD = 'manager-test-password';

export function applyTestEnv(): void {
  process.env.APP_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_MIN = '60';
  process.env.ADMIN_EMAIL = TEST_ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set by the integration global setup');
  }
}
