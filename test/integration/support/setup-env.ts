// Trava de segurança: sem o banco descartável pronto, o `.env` (banco de desenvolvimento) seria usado.
if (process.env['INTEGRATION_DB_READY'] !== '1') {
  throw new Error(
    'Banco de integração não preparado: rode com `npm run test:integration`.',
  );
}

process.env['JWT_SECRET'] ??= 'integration-test-secret-with-at-least-32-chars';
process.env['SEED_PASSWORD'] = 'Integration#Pass123';
process.env['NODE_ENV'] = 'test';
