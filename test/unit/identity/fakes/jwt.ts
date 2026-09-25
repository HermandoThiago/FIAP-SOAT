import { JwtService } from '@nestjs/jwt';

import { JWT_ALGORITHM, JWT_ISSUER } from '../../../../src/modules/identity/services/token.constants';

// JwtService dos testes unitários com a mesma configuração do IdentityModule (HS256, emissor); segredos fictícios.
export const TEST_JWT_SECRET = 'unit-test-jwt-secret-with-at-least-32-characters';
export const OTHER_JWT_SECRET = 'another-jwt-secret-with-at-least-32-characters!';

export function createTestJwtService(secret = TEST_JWT_SECRET): JwtService {
  return new JwtService({
    secret,
    signOptions: { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER },
    verifyOptions: { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER },
  });
}

/** Instante em segundos desde a época, como nos claims `iat`/`exp`. */
export function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
