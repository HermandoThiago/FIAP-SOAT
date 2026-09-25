import { Controller, ForbiddenException, Get, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Public } from '../../../../src/shared/auth/public.decorator';
import { Roles } from '../../../../src/shared/auth/roles.decorator';
import { RolesGuard } from '../../../../src/shared/auth/roles.guard';
import { TrackingRoute } from '../../../../src/shared/auth/tracking.decorator';
import { Role } from '../../../../src/shared/domain/role';
import { createExecutionContext } from './fakes/execution-context';

// Autorização por papel (ADR-004; contrato-api.md §1): sem @Roles() qualquer membro da equipe; MANAGER passa em tudo.
class SampleController {
  @Public()
  @Get('public')
  publicRoute(): void {}

  @TrackingRoute()
  @Get('tracking')
  trackingRoute(): void {}

  @Get('any-team')
  anyTeamRoute(): void {}

  @Roles(Role.MECHANIC)
  @Get('mechanic-only')
  mechanicRoute(): void {}

  @Roles(Role.ATTENDANT, Role.MECHANIC)
  @Get('attendant-or-mechanic')
  attendantOrMechanicRoute(): void {}
}

@Roles(Role.MANAGER)
@Controller('managers')
class ManagerController {
  @Get()
  managerRoute(): void {}

  @Roles(Role.ATTENDANT)
  @Get('override')
  attendantRoute(): void {}
}

const guard = new RolesGuard(new Reflector());

function contextFor(controller: typeof SampleController | typeof ManagerController, handler: string, roles?: Role[]) {
  return createExecutionContext(controller, handler, {
    headers: {},
    ...(roles ? { user: { id: 'user-1', roles } } : {}),
  }).context;
}

describe('RolesGuard', () => {
  it('should skip the check when the route is public', () => {
    expect(guard.canActivate(contextFor(SampleController, 'publicRoute'))).toBe(true);
  });

  it('should skip the check when the route is a tracking route', () => {
    expect(guard.canActivate(contextFor(SampleController, 'trackingRoute'))).toBe(true);
  });

  it('should reject with 401 when no user was authenticated', () => {
    expect(() => guard.canActivate(contextFor(SampleController, 'anyTeamRoute'))).toThrow(UnauthorizedException);
  });

  it.each([[Role.ATTENDANT], [Role.MECHANIC], [Role.MANAGER]])(
    'should allow any team member (%s) when the route has no @Roles()',
    (role) => {
      expect(guard.canActivate(contextFor(SampleController, 'anyTeamRoute', [role]))).toBe(true);
    },
  );

  it('should reject with 403 when the route has no @Roles() and the user has no team role', () => {
    expect(() => guard.canActivate(contextFor(SampleController, 'anyTeamRoute', [Role.CUSTOMER]))).toThrow(
      new ForbiddenException('Papel insuficiente para esta operação'),
    );
  });

  it.each([
    [SampleController, 'mechanicRoute'],
    [SampleController, 'attendantOrMechanicRoute'],
    [ManagerController, 'managerRoute'],
    [ManagerController, 'attendantRoute'],
  ])('should always allow a MANAGER when the route %p.%s requires other roles', (controller, handler) => {
    expect(guard.canActivate(contextFor(controller, handler, [Role.MANAGER]))).toBe(true);
  });

  it('should allow the user when one of their roles matches the required roles', () => {
    expect(guard.canActivate(contextFor(SampleController, 'attendantOrMechanicRoute', [Role.ATTENDANT]))).toBe(true);
    expect(guard.canActivate(contextFor(SampleController, 'mechanicRoute', [Role.ATTENDANT, Role.MECHANIC]))).toBe(
      true,
    );
  });

  it('should reject with 403 when none of the user roles match the required roles', () => {
    expect(() => guard.canActivate(contextFor(SampleController, 'mechanicRoute', [Role.ATTENDANT]))).toThrow(
      ForbiddenException,
    );
  });

  it('should use the class-level @Roles() when the handler has none', () => {
    expect(() => guard.canActivate(contextFor(ManagerController, 'managerRoute', [Role.ATTENDANT]))).toThrow(
      ForbiddenException,
    );
  });

  it('should let the handler-level @Roles() override the class-level one when both exist', () => {
    expect(guard.canActivate(contextFor(ManagerController, 'attendantRoute', [Role.ATTENDANT]))).toBe(true);
  });
});
