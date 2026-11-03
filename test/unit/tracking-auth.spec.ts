import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  ALLOW_TRACKING_TOKEN_KEY,
  CurrentTrackingActor,
  JwtAuthGuard,
  Role,
  RolesGuard,
} from '../../src/modules/identity/auth';
import { TrackingTokenService } from '../../src/modules/identity/services';

describe('tracking token authentication', () => {
  const jwt = new JwtService({
    secret: 'a-test-secret-with-more-than-32-characters',
    signOptions: { algorithm: 'HS256' },
  });
  const orderId = '11111111-1111-4111-8111-111111111111';

  const contextFor = (request: object, allowTracking: boolean) => {
    const handler = () => undefined;
    Reflect.defineMetadata(ALLOW_TRACKING_TOKEN_KEY, allowTracking, handler);
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => class {},
    } as unknown as ExecutionContext;
  };

  describe('TrackingTokenService', () => {
    it('should issue a token with aud=tracking and the order as subject', async () => {
      const token = await new TrackingTokenService(jwt).issue(orderId);

      const payload = jwt.decode<{
        sub: string;
        aud: string;
        exp: number;
        iat: number;
      }>(token);
      expect(payload.sub).toBe(orderId);
      expect(payload.aud).toBe('tracking');
      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('JwtAuthGuard', () => {
    const guard = new JwtAuthGuard(jwt, new Reflector());

    it('should set request.tracking when a tracking token hits a route that allows it', async () => {
      const token = await new TrackingTokenService(jwt).issue(orderId);
      const request: Record<string, unknown> = {
        headers: { authorization: `Bearer ${token}` },
      };

      await expect(guard.canActivate(contextFor(request, true))).resolves.toBe(
        true,
      );

      expect(request['tracking']).toEqual({ serviceOrderId: orderId });
      expect(request['user']).toBeUndefined();
    });

    it('should throw UnauthorizedException when a tracking token hits a route that does not allow it', async () => {
      const token = await new TrackingTokenService(jwt).issue(orderId);
      const request = { headers: { authorization: `Bearer ${token}` } };

      await expect(
        guard.canActivate(contextFor(request, false)),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should set request.user when a regular access token is used on a tracking route', async () => {
      const token = await jwt.signAsync(
        { role: Role.CUSTOMER },
        { subject: 'customer-id' },
      );
      const request: Record<string, unknown> = {
        headers: { authorization: `Bearer ${token}` },
      };

      await guard.canActivate(contextFor(request, true));

      expect(request['user']).toEqual({
        userId: 'customer-id',
        role: Role.CUSTOMER,
      });
      expect(request['tracking']).toBeUndefined();
    });
  });

  describe('RolesGuard', () => {
    it('should let the tracking token pass a route that requires roles', () => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const request = { tracking: { serviceOrderId: orderId } };

      expect(
        new RolesGuard(reflector).canActivate(contextFor(request, true)),
      ).toBe(true);
    });
  });

  describe('CurrentTrackingActor', () => {
    const resolve = (request: object) => {
      class Host {
        handler(@CurrentTrackingActor() _actor: unknown) {}
      }
      const args = Reflect.getMetadata(
        '__routeArguments__',
        Host,
        'handler',
      ) as Record<
        string,
        { factory: (data: unknown, ctx: ExecutionContext) => unknown }
      >;
      return Object.values(args)[0].factory(
        undefined,
        contextFor(request, true),
      );
    };

    it('should resolve a token actor from the tracking claims', () => {
      expect(resolve({ tracking: { serviceOrderId: orderId } })).toEqual({
        kind: 'token',
        serviceOrderId: orderId,
      });
    });

    it('should resolve a customer actor from the CUSTOMER login', () => {
      expect(
        resolve({ user: { userId: 'customer-id', role: Role.CUSTOMER } }),
      ).toEqual({
        kind: 'customer',
        customerId: 'customer-id',
      });
    });

    it.each([Role.ADMIN, Role.ATTENDANT, Role.MECHANIC])(
      'should throw ForbiddenException when a %s staff token reaches /tracking',
      (role) => {
        expect(() => resolve({ user: { userId: 'staff-id', role } })).toThrow(
          ForbiddenException,
        );
      },
    );
  });
});
