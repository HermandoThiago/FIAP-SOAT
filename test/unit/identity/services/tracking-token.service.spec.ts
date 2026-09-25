import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JWT_ISSUER, TRACKING_TOKEN_TTL_DAYS } from '../../../../src/modules/identity/services/token.constants';
import { TrackingTokenService } from '../../../../src/modules/identity/services/tracking-token.service';
import { FixedClock } from '../../../../src/shared/clock';
import { Role } from '../../../../src/shared/domain/role';
import { SERVICE_ORDER_ID, USER_ID } from '../fakes/builders';

// Token de acompanhamento (ADR-011): aud=tracking, sub=serviceOrderId, 7 dias.
const SECRET = 'unit-test-jwt-secret-with-at-least-32-characters';
const OTHER_SECRET = 'another-jwt-secret-with-at-least-32-characters!';
const SEVEN_DAYS_MS = TRACKING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

interface Claims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function createJwtService(secret = SECRET): JwtService {
  return new JwtService({
    secret,
    signOptions: { algorithm: 'HS256', issuer: JWT_ISSUER },
    verifyOptions: { algorithms: ['HS256'], issuer: JWT_ISSUER },
  });
}

describe('TrackingTokenService', () => {
  describe('issue', () => {
    it('should sign a token for the service order that expires in 7 days when issued', async () => {
      const now = new Date();
      const jwt = createJwtService();
      const service = new TrackingTokenService(jwt, new FixedClock(now));

      const { token, expiresAt } = await service.issue(SERVICE_ORDER_ID);

      expect(expiresAt).toEqual(new Date(now.getTime() + SEVEN_DAYS_MS));
      const claims = jwt.decode<Claims>(token);
      expect(claims.sub).toBe(SERVICE_ORDER_ID);
      expect(claims.aud).toBe('tracking');
      expect(claims.iss).toBe(JWT_ISSUER);
      expect(claims.exp).toBe(Math.floor(expiresAt.getTime() / 1000));
      expect(TRACKING_TOKEN_TTL_DAYS).toBe(7);
    });
  });

  describe('validate', () => {
    it('should return the service order id when the token is valid', async () => {
      const service = new TrackingTokenService(createJwtService(), new FixedClock(new Date()));
      const { token } = await service.issue(SERVICE_ORDER_ID);

      await expect(service.validate(token)).resolves.toEqual({ serviceOrderId: SERVICE_ORDER_ID });
    });

    it('should reject the token when it was signed with another secret', async () => {
      const service = new TrackingTokenService(createJwtService(), new FixedClock(new Date()));
      const forged = await new TrackingTokenService(createJwtService(OTHER_SECRET), new FixedClock(new Date())).issue(
        SERVICE_ORDER_ID,
      );

      await expect(service.validate(forged.token)).rejects.toThrow(
        new UnauthorizedException('Token de acompanhamento inválido ou expirado'),
      );
    });

    it('should reject the token when it is expired', async () => {
      const jwt = createJwtService();
      const eightDaysAgo = new FixedClock(new Date(Date.now() - SEVEN_DAYS_MS - 24 * 60 * 60 * 1000));
      const { token } = await new TrackingTokenService(jwt, eightDaysAgo).issue(SERVICE_ORDER_ID);

      await expect(new TrackingTokenService(jwt, new FixedClock(new Date())).validate(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject the token when the audience is api', async () => {
      const jwt = createJwtService();
      const service = new TrackingTokenService(jwt, new FixedClock(new Date()));
      const accessToken = await jwt.signAsync(
        { roles: [Role.CUSTOMER] },
        { subject: USER_ID, audience: 'api', expiresIn: '1h' },
      );

      await expect(service.validate(accessToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject the token when it has no subject', async () => {
      const jwt = createJwtService();
      const service = new TrackingTokenService(jwt, new FixedClock(new Date()));
      const noSubject = await jwt.signAsync({}, { audience: 'tracking', expiresIn: '1h' });

      await expect(service.validate(noSubject)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject the token when it is not a JWT at all', async () => {
      const service = new TrackingTokenService(createJwtService(), new FixedClock(new Date()));

      await expect(service.validate('garbage')).rejects.toThrow(UnauthorizedException);
    });
  });
});
