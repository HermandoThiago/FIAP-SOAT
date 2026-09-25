import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { type AuthService } from '../../../../src/modules/identity/services/auth.service';
import { type TrackingTokenService } from '../../../../src/modules/identity/services/tracking-token.service';
import { type AuthenticatedUser } from '../../../../src/shared/auth/principal';
import { TrackingAuthGuard } from '../../../../src/shared/auth/tracking-auth.guard';
import { Role } from '../../../../src/shared/domain/role';
import { TrackingProbeController } from '../../../support/auth';
import { bearer, createExecutionContext } from './fakes/execution-context';

// Guard de /tracking/** (ADR-011; PRD-005 RF-066): token de acompanhamento ou login CUSTOMER; equipe → 403.
// O ExecutionContext falso aponta para a rota de sondagem compartilhada (@TrackingRoute em test/support/auth.ts).

const SERVICE_ORDER_ID = '2f109cde-cc93-44a8-89bf-6554894ff689';
const TRACKING_TOKEN = 'tracking-token';
const CUSTOMER_TOKEN = 'customer-token';
const TEAM_TOKEN = 'team-token';
const CUSTOMER_USER: AuthenticatedUser = { id: 'user-2', roles: [Role.CUSTOMER], customerId: 'customer-1' };
const TEAM_USER: AuthenticatedUser = { id: 'user-1', roles: [Role.MECHANIC] };

const unauthorized = () => new UnauthorizedException('rejected by the validator');

/** Validadores falsos: só os tokens conhecidos passam; o resto é recusado com 401 (como os serviços reais). */
function createGuard(): { guard: TrackingAuthGuard; validate: jest.Mock; validateToken: jest.Mock } {
  const validate = jest.fn((token: string) =>
    token === TRACKING_TOKEN ? Promise.resolve({ serviceOrderId: SERVICE_ORDER_ID }) : Promise.reject(unauthorized()),
  );
  const validateToken = jest.fn((token: string) => {
    if (token === CUSTOMER_TOKEN) {
      return Promise.resolve(CUSTOMER_USER);
    }
    if (token === TEAM_TOKEN) {
      return Promise.resolve(TEAM_USER);
    }
    return Promise.reject(unauthorized());
  });
  const guard = new TrackingAuthGuard(
    { validate } as unknown as TrackingTokenService,
    { validateToken } as unknown as AuthService,
  );
  return { guard, validate, validateToken };
}

describe('TrackingAuthGuard', () => {
  it('should set a TRACKING_TOKEN credential when the tracking token is valid', async () => {
    const { guard, validateToken } = createGuard();
    const { context, request } = createExecutionContext(TrackingProbeController, 'probe', bearer(TRACKING_TOKEN));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.tracking).toEqual({ kind: 'TRACKING_TOKEN', serviceOrderId: SERVICE_ORDER_ID });
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('should set a CUSTOMER_LOGIN credential when the token is a CUSTOMER login', async () => {
    const { guard } = createGuard();
    const { context, request } = createExecutionContext(TrackingProbeController, 'probe', bearer(CUSTOMER_TOKEN));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.tracking).toEqual({ kind: 'CUSTOMER_LOGIN', userId: 'user-2', customerId: 'customer-1' });
  });

  it('should reject with 403 when the token is a team JWT', async () => {
    const { guard } = createGuard();
    const { context, request } = createExecutionContext(TrackingProbeController, 'probe', bearer(TEAM_TOKEN));

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Credencial de equipe não acessa o acompanhamento do cliente'),
    );
    expect(request.tracking).toBeUndefined();
  });

  it('should reject with 401 when the Authorization header is missing', async () => {
    const { guard, validate, validateToken } = createGuard();
    const { context } = createExecutionContext(TrackingProbeController, 'probe');

    await expect(guard.canActivate(context)).rejects.toThrow(new UnauthorizedException('Não autenticado'));
    expect(validate).not.toHaveBeenCalled();
    expect(validateToken).not.toHaveBeenCalled();
  });

  it('should reject with 401 when the token is invalid for both validators', async () => {
    const { guard, validate, validateToken } = createGuard();
    const { context } = createExecutionContext(TrackingProbeController, 'probe', bearer('unknown-audience-token'));

    await expect(guard.canActivate(context)).rejects.toThrow(new UnauthorizedException('Token inválido ou expirado'));
    expect(validate).toHaveBeenCalledWith('unknown-audience-token');
    expect(validateToken).toHaveBeenCalledWith('unknown-audience-token');
  });

  it('should propagate the error when the tracking validator fails unexpectedly', async () => {
    const { guard, validate } = createGuard();
    validate.mockRejectedValueOnce(new Error('database down'));
    const { context } = createExecutionContext(TrackingProbeController, 'probe', bearer(TRACKING_TOKEN));

    await expect(guard.canActivate(context)).rejects.toThrow('database down');
  });
});
