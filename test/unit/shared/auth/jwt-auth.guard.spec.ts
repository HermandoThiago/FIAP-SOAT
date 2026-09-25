import { ForbiddenException, Get, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type AuthService } from '../../../../src/modules/identity/services/auth.service';
import { JwtAuthGuard } from '../../../../src/shared/auth/jwt-auth.guard';
import { type AuthenticatedUser } from '../../../../src/shared/auth/principal';
import { Public } from '../../../../src/shared/auth/public.decorator';
import { TrackingRoute } from '../../../../src/shared/auth/tracking.decorator';
import { Role } from '../../../../src/shared/domain/role';
import { bearer, createExecutionContext } from './fakes/execution-context';

// Guard global das rotas administrativas (ADR-004; ADR-011): allowlist @Public(), rotas @TrackingRoute(), 401/403.
class SampleController {
  @Public()
  @Get('public')
  publicRoute(): void {}

  @TrackingRoute()
  @Get('tracking')
  trackingRoute(): void {}

  @Get('admin')
  adminRoute(): void {}
}

const TEAM_USER: AuthenticatedUser = { id: 'user-1', roles: [Role.ATTENDANT] };
const CUSTOMER_USER: AuthenticatedUser = { id: 'user-2', roles: [Role.CUSTOMER], customerId: 'customer-1' };

function createGuard(user: AuthenticatedUser | Error): { guard: JwtAuthGuard; validateToken: jest.Mock } {
  const validateToken = jest.fn();
  if (user instanceof Error) {
    validateToken.mockRejectedValue(user);
  } else {
    validateToken.mockResolvedValue(user);
  }
  const authService = { validateToken } as unknown as AuthService;
  return { guard: new JwtAuthGuard(new Reflector(), authService), validateToken };
}

describe('JwtAuthGuard', () => {
  it('should allow the request without validating a token when the route is public', async () => {
    const { guard, validateToken } = createGuard(TEAM_USER);
    const { context } = createExecutionContext(SampleController, 'publicRoute');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('should allow the request without validating a token when the route is a tracking route', async () => {
    const { guard, validateToken } = createGuard(TEAM_USER);
    const { context } = createExecutionContext(SampleController, 'trackingRoute');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('should reject with 401 when the Authorization header is missing', async () => {
    const { guard } = createGuard(TEAM_USER);
    const { context } = createExecutionContext(SampleController, 'adminRoute');

    await expect(guard.canActivate(context)).rejects.toThrow(new UnauthorizedException('Não autenticado'));
  });

  it('should reject with 401 when the Authorization scheme is not Bearer', async () => {
    const { guard, validateToken } = createGuard(TEAM_USER);
    const { context } = createExecutionContext(SampleController, 'adminRoute', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('should reject with 401 when the token is invalid or expired', async () => {
    const { guard } = createGuard(new UnauthorizedException('Token inválido ou expirado'));
    const { context } = createExecutionContext(SampleController, 'adminRoute', bearer('bad-token'));

    await expect(guard.canActivate(context)).rejects.toThrow(new UnauthorizedException('Token inválido ou expirado'));
  });

  it('should reject with 403 when the token belongs to a CUSTOMER', async () => {
    const { guard } = createGuard(CUSTOMER_USER);
    const { context, request } = createExecutionContext(SampleController, 'adminRoute', bearer('customer-token'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Acesso restrito à equipe da oficina'),
    );
    expect(request.user).toBeUndefined();
  });

  it('should allow the request and set request.user when the token belongs to a team member', async () => {
    const { guard, validateToken } = createGuard(TEAM_USER);
    const { context, request } = createExecutionContext(SampleController, 'adminRoute', bearer('team-token'));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validateToken).toHaveBeenCalledWith('team-token');
    expect(request.user).toEqual(TEAM_USER);
  });
});
