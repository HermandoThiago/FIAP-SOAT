import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthService } from '../../modules/identity/services/auth.service';
import { Role } from '../domain/role';
import { extractBearerToken } from './bearer-token';
import { type AuthenticatedRequest } from './principal';
import { isPublicRoute, isTrackingRoute } from './route-metadata';

// Guard global (APP_GUARD, registrado no IdentityModule) das rotas administrativas (ADR-004; PRD-005 RF-061):
// @Public() passa; @TrackingRoute() passa (quem autentica é o TrackingAuthGuard); o resto exige um JWT `aud=api`
// válido. A validação do token fica toda no AuthService — o guard é o único ponto que conhece o transporte
// (evolucao-fases.md: trocar por RS256/JWKS do Cognito muda só o identity).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (isPublicRoute(this.reflector, context) || isTrackingRoute(this.reflector, context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Não autenticado');
    }
    const user = await this.authService.validateToken(token);
    // ADR-011: CUSTOMER só acessa /tracking/**; nas rotas administrativas recebe 403.
    if (user.roles.includes(Role.CUSTOMER)) {
      throw new ForbiddenException('Acesso restrito à equipe da oficina');
    }
    request.user = user;
    return true;
  }
}
