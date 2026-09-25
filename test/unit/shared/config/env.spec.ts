import { validateEnv } from '../../../../src/shared/config/env';

// Configuração 12-factor validada na subida (visao-geral.md §6). Valores fictícios, distintos do .env.example.
const VALID_ENV: Record<string, unknown> = {
  DATABASE_URL: 'postgresql://oficina:oficina@localhost:5432/oficina_test',
  JWT_SECRET: 'unit-test-jwt-secret-with-at-least-32-characters',
  ADMIN_EMAIL: 'manager@test.oficina.local',
  ADMIN_PASSWORD: 'unit-test-manager-password',
};

function failureMessage(config: Record<string, unknown>): string {
  try {
    validateEnv(config);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected validateEnv to throw');
}

describe('validateEnv', () => {
  describe('defaults', () => {
    it('should apply the documented defaults when the optional variables are absent', () => {
      const env = validateEnv(VALID_ENV);

      expect(env).toMatchObject({ APP_ENV: 'dev', PORT: 8080, LOG_LEVEL: 'info', JWT_EXPIRES_MIN: 60 });
    });

    it('should keep the required values untouched when they are valid', () => {
      const env = validateEnv(VALID_ENV);

      expect(env).toMatchObject(VALID_ENV);
    });
  });

  describe('coercion', () => {
    it('should coerce PORT to a number when it is given as a string', () => {
      const env = validateEnv({ ...VALID_ENV, PORT: '3000' });

      expect(env.PORT).toBe(3000);
    });

    it('should coerce JWT_EXPIRES_MIN to a number when it is given as a string', () => {
      const env = validateEnv({ ...VALID_ENV, JWT_EXPIRES_MIN: '15' });

      expect(env.JWT_EXPIRES_MIN).toBe(15);
    });

    it.each(['dev', 'test', 'prod'])('should accept APP_ENV %p when it belongs to the enum', (appEnv) => {
      const env = validateEnv({ ...VALID_ENV, APP_ENV: appEnv });

      expect(env.APP_ENV).toBe(appEnv);
    });

    it('should accept DATABASE_URL when it uses the short postgres scheme', () => {
      const url = 'postgres://oficina:oficina@localhost:5432/oficina_test';

      const env = validateEnv({ ...VALID_ENV, DATABASE_URL: url });

      expect(env.DATABASE_URL).toBe(url);
    });
  });

  describe('rejections', () => {
    it('should reject JWT_SECRET when it has fewer than 32 characters', () => {
      const message = failureMessage({ ...VALID_ENV, JWT_SECRET: 'a'.repeat(31) });

      expect(message).toContain('JWT_SECRET: JWT_SECRET must have at least 32 characters');
    });

    it('should reject DATABASE_URL when it is not a PostgreSQL connection string', () => {
      const message = failureMessage({ ...VALID_ENV, DATABASE_URL: 'mysql://oficina:oficina@localhost:3306/oficina' });

      expect(message).toContain('DATABASE_URL: DATABASE_URL must be a PostgreSQL connection string');
    });

    it('should reject ADMIN_PASSWORD when it has fewer than 8 characters', () => {
      const message = failureMessage({ ...VALID_ENV, ADMIN_PASSWORD: '1234567' });

      expect(message).toContain('ADMIN_PASSWORD: ADMIN_PASSWORD must have at least 8 characters');
    });

    it.each([
      ['ADMIN_EMAIL', 'not-an-email'],
      ['APP_ENV', 'staging'],
      ['LOG_LEVEL', 'verbose'],
      ['PORT', 'abc'],
      ['PORT', '0'],
      ['PORT', '70000'],
      ['PORT', '80.5'],
      ['JWT_EXPIRES_MIN', '0'],
      ['JWT_EXPIRES_MIN', '-5'],
      ['JWT_EXPIRES_MIN', '1.5'],
      ['DATABASE_URL', ''],
    ])('should reject %s when the value is %p', (name, value) => {
      expect(() => validateEnv({ ...VALID_ENV, [name]: value })).toThrow(`Invalid environment configuration`);
      expect(failureMessage({ ...VALID_ENV, [name]: value })).toContain(`- ${name}:`);
    });

    it('should list the required variables when the configuration is empty', () => {
      const message = failureMessage({});

      expect(message).toContain('- DATABASE_URL:');
      expect(message).toContain('- JWT_SECRET:');
      expect(message).toContain('- ADMIN_EMAIL:');
      expect(message).toContain('- ADMIN_PASSWORD:');
    });

    it('should list every invalid variable at once when several are invalid', () => {
      const invalid = {
        APP_ENV: 'staging',
        PORT: 'abc',
        LOG_LEVEL: 'verbose',
        DATABASE_URL: 'mysql://oficina:oficina@localhost:3306/oficina',
        JWT_SECRET: 'short',
        JWT_EXPIRES_MIN: '0',
        ADMIN_EMAIL: 'not-an-email',
        ADMIN_PASSWORD: 'short',
      };

      const message = failureMessage(invalid);

      const listed = message.split('\n').filter((line) => line.startsWith('  - '));
      expect(listed).toHaveLength(Object.keys(invalid).length);
      for (const name of Object.keys(invalid)) {
        expect(message).toContain(`- ${name}:`);
      }
    });
  });
});
