import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import {
  RequestContext,
  RequestContextInterceptor,
  Role,
  RolesGuard,
  ROLES_KEY,
} from '../../src/modules/identity/auth';

describe('RequestContext', () => {
  const user = { userId: 'user-id', role: Role.ADMIN };

  it('should expose the user only inside run()', () => {
    const ctx = new RequestContext();

    expect(ctx.user).toBeUndefined();
    ctx.run(user, () => {
      expect(ctx.user).toEqual(user);
      expect(ctx.userId).toBe('user-id');
    });
    expect(ctx.user).toBeUndefined();
  });

  it('should throw UnauthorizedException when there is no authenticated user', () => {
    const ctx = new RequestContext();

    expect(() => ctx.userId).toThrow(UnauthorizedException);
    expect(() => ctx.run(undefined, () => ctx.requireUser())).toThrow(
      UnauthorizedException,
    );
  });

  it('should keep concurrent requests isolated from each other', async () => {
    const ctx = new RequestContext();
    const read = (u: typeof user, delay: number) =>
      ctx.run(
        u,
        () =>
          new Promise<string>((resolve) =>
            setTimeout(() => resolve(ctx.userId), delay),
          ),
      );

    const [a, b] = await Promise.all([
      read({ ...user, userId: 'a' }, 20),
      read({ ...user, userId: 'b' }, 5),
    ]);

    expect([a, b]).toEqual(['a', 'b']);
  });
});

describe('RequestContextInterceptor', () => {
  it('should run the handler inside the context of the request user', async () => {
    const ctx = new RequestContext();
    const interceptor = new RequestContextInterceptor(ctx);
    const user = { userId: 'user-id', role: Role.MECHANIC };
    const executionContext = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
    const next: CallHandler = {
      handle: () =>
        new Observable((s) => {
          s.next(ctx.userId);
          s.complete();
        }),
    };

    const result = await firstValueFrom(
      interceptor.intercept(executionContext, next),
    );

    expect(result).toBe('user-id');
  });

  it('should still call the handler when the request has no user (public route)', async () => {
    const interceptor = new RequestContextInterceptor(new RequestContext());
    const executionContext = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;

    await expect(
      firstValueFrom(
        interceptor.intercept(executionContext, { handle: () => of('ok') }),
      ),
    ).resolves.toBe('ok');
  });
});

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);
  const contextWith = (request: object) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.resetAllMocks());

  it('should allow any authenticated caller when the route declares no roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextWith({}))).toBe(true);
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(contextWith({}))).toBe(true);
  });

  it('should allow a user whose role is listed', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MECHANIC]);

    expect(
      guard.canActivate(contextWith({ user: { role: Role.MECHANIC } })),
    ).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });

  it('should throw ForbiddenException when the role is not listed or there is no user', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(contextWith({ user: { role: Role.CUSTOMER } })),
    ).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWith({}))).toThrow(
      ForbiddenException,
    );
  });

  it('should let the tracking token through, since the JWT guard already restricted it', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(
      guard.canActivate(contextWith({ tracking: { serviceOrderId: 'x' } })),
    ).toBe(true);
  });
});
