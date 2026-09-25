import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '../../modules/identity/services/auth.service';
import { TrackingTokenService } from '../../modules/identity/services/tracking-token.service';
import { Role } from '../domain/role';
import { extractBearerToken } from './bearer-token';
import { type AuthenticatedRequest, type AuthenticatedUser, type TrackingCredential } from './principal';

// Guard de rota de /tracking/** (via @TrackingRoute() — ADR-011; PRD-005 RF-066): aceita o token de acompanhamento
// (`aud=tracking`, uma OS) ou o login do cliente (`aud=api`, papel CUSTOMER); JWT de equipe → 403; o resto → 401
// genérico. O guard não lê o JWT: tenta o validador de acompanhamento e, se ele recusar, o validador de login —
// os dois serviços exportados pelo identity são o único ponto que conhece o formato do token.
@Injectable()
export class TrackingAuthGuard implements CanActivate {
  constructor(
    private readonly trackingTokenService: TrackingTokenService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Não autenticado');
    }
    request.tracking = (await this.asTrackingToken(token)) ?? (await this.asCustomerLogin(token));
    return true;
  }

  private async asTrackingToken(token: string): Promise<TrackingCredential | undefined> {
    try {
      const { serviceOrderId } = await this.trackingTokenService.validate(token);
      return { kind: 'TRACKING_TOKEN', serviceOrderId };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return undefined;
      }
      throw error;
    }
  }

  private async asCustomerLogin(token: string): Promise<TrackingCredential> {
    let user: AuthenticatedUser;
    try {
      user = await this.authService.validateToken(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    if (!user.roles.includes(Role.CUSTOMER) || !user.customerId) {
      throw new ForbiddenException('Credencial de equipe não acessa o acompanhamento do cliente');
    }
    return { kind: 'CUSTOMER_LOGIN', userId: user.id, customerId: user.customerId };
  }
}
