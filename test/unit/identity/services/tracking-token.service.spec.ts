import { UnauthorizedException } from '@nestjs/common';
import { type JwtService, type JwtSignOptions } from '@nestjs/jwt';

import { JWT_ISSUER, TRACKING_TOKEN_TTL_DAYS } from '../../../../src/modules/identity/services/token.constants';
import { TrackingTokenService } from '../../../../src/modules/identity/services/tracking-token.service';
import { FixedClock } from '../../../../src/shared/clock';
import { Role } from '../../../../src/shared/domain/role';
import { FIXED_NOW, SERVICE_ORDER_ID, USER_ID } from '../fakes/builders';
import { createTestJwtService, OTHER_JWT_SECRET, unixSeconds } from '../fakes/jwt';

// Token de acompanhamento (ADR-011): aud=tracking, sub=serviceOrderId, 7 dias. Relógio fixo em FIXED_NOW.
const DAY_SECONDS = 24 * 60 * 60;
const TTL_SECONDS = TRACKING_TOKEN_TTL_DAYS * DAY_SECONDS;
const ISSUED_AT = unixSeconds(FIXED_NOW);
const INVALID_TOKEN = new UnauthorizedException('Token de acompanhamento inválido ou expirado');

interface Claims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

interface TokenShape {
  payload?: Record<string, unknown>;
  subject?: string | null;
  audience?: string | string[] | null;
  /** `null` = sem o claim. */
  iat?: number | null;
  /** `null` = sem o claim. */
  exp?: number | null;
}

/** Token com os mesmos claims que issue() emite em FIXED_NOW; cada teste negativo muda UMA coisa. */
function signTrackingToken(jwt: JwtService, shape: TokenShape = {}): Promise<string> {
  const { payload = {}, subject = SERVICE_ORDER_ID, audience = 'tracking', iat = ISSUED_AT } = shape;
  const exp = shape.exp === undefined ? ISSUED_AT + TTL_SECONDS : shape.exp;
  const options: JwtSignOptions = {
    ...(subject === null ? {} : { subject }),
    ...(audience === null ? {} : { audience }),
    ...(iat === null ? { noTimestamp: true } : {}),
  };
  return jwt.signAsync({ ...payload, ...(iat === null ? {} : { iat }), ...(exp === null ? {} : { exp }) }, options);
}

function createService(jwt = createTestJwtService(), clock = new FixedClock(FIXED_NOW)): TrackingTokenService {
  return new TrackingTokenService(jwt, clock);
}

describe('TrackingTokenService', () => {
  describe('issue', () => {
    it('should sign a token for the service order with iat and exp 7 days apart when issued', async () => {
      const jwt = createTestJwtService();

      const { token, expiresAt } = await createService(jwt).issue(SERVICE_ORDER_ID);

      expect(TRACKING_TOKEN_TTL_DAYS).toBe(7);
      expect(expiresAt).toEqual(new Date(FIXED_NOW.getTime() + TTL_SECONDS * 1000));
      const claims = jwt.decode<Claims>(token);
      expect(claims.sub).toBe(SERVICE_ORDER_ID);
      expect(claims.aud).toBe('tracking');
      expect(claims.iss).toBe(JWT_ISSUER);
      expect(claims.iat).toBe(ISSUED_AT);
      expect(claims.exp).toBe(ISSUED_AT + TTL_SECONDS);
    });
  });

  describe('validate', () => {
    it('should return the service order id when the token was issued by the service', async () => {
      const service = createService();
      const { token } = await service.issue(SERVICE_ORDER_ID);

      await expect(service.validate(token)).resolves.toEqual({ serviceOrderId: SERVICE_ORDER_ID });
    });

    it('should accept the token when its claims match what issue produces', async () => {
      // Linha de base dos testes negativos abaixo: cada um muda só uma coisa neste token.
      const jwt = createTestJwtService();

      await expect(createService(jwt).validate(await signTrackingToken(jwt))).resolves.toEqual({
        serviceOrderId: SERVICE_ORDER_ID,
      });
    });

    it('should still accept the token when it is one second from expiring', async () => {
      const jwt = createTestJwtService();
      const almostExpired = new FixedClock(new Date(FIXED_NOW.getTime() + (TTL_SECONDS - 1) * 1000));

      await expect(createService(jwt, almostExpired).validate(await signTrackingToken(jwt))).resolves.toEqual({
        serviceOrderId: SERVICE_ORDER_ID,
      });
    });

    it('should reject the token when it was signed with another secret', async () => {
      const forged = await signTrackingToken(createTestJwtService(OTHER_JWT_SECRET));

      await expect(createService().validate(forged)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it is expired', async () => {
      const jwt = createTestJwtService();
      const eightDaysAgo = new FixedClock(new Date(FIXED_NOW.getTime() - 8 * DAY_SECONDS * 1000));
      const { token } = await createService(jwt, eightDaysAgo).issue(SERVICE_ORDER_ID);

      await expect(createService(jwt).validate(token)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it was issued more than 7 days ago even though exp is in the future', async () => {
      const jwt = createTestJwtService();
      const stale = await signTrackingToken(jwt, { iat: ISSUED_AT - 8 * DAY_SECONDS, exp: ISSUED_AT + DAY_SECONDS });

      await expect(createService(jwt).validate(stale)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when its lifetime is 365 days', async () => {
      const jwt = createTestJwtService();
      const yearLong = await signTrackingToken(jwt, { exp: ISSUED_AT + 365 * DAY_SECONDS });

      await expect(createService(jwt).validate(yearLong)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when the audience is api', async () => {
      const jwt = createTestJwtService();
      const accessToken = await signTrackingToken(jwt, {
        payload: { roles: [Role.CUSTOMER] },
        subject: USER_ID,
        audience: 'api',
      });

      await expect(createService(jwt).validate(accessToken)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when the audience is an array that includes tracking', async () => {
      const jwt = createTestJwtService();
      const multiAudience = await signTrackingToken(jwt, { audience: ['tracking', 'api'] });

      await expect(createService(jwt).validate(multiAudience)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it has no audience', async () => {
      const jwt = createTestJwtService();
      const noAudience = await signTrackingToken(jwt, { audience: null });

      await expect(createService(jwt).validate(noAudience)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it has no subject', async () => {
      const jwt = createTestJwtService();
      const noSubject = await signTrackingToken(jwt, { subject: null });

      await expect(createService(jwt).validate(noSubject)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it has no exp', async () => {
      const jwt = createTestJwtService();
      const eternal = await signTrackingToken(jwt, { exp: null });

      await expect(createService(jwt).validate(eternal)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it has no iat', async () => {
      const jwt = createTestJwtService();
      const noIssuedAt = await signTrackingToken(jwt, { iat: null });

      await expect(createService(jwt).validate(noIssuedAt)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it is not a JWT at all', async () => {
      await expect(createService().validate('garbage')).rejects.toThrow(INVALID_TOKEN);
    });
  });
});
