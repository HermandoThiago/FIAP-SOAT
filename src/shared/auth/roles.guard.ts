import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { isTeamRole, Role } from '../domain/role';
import { type AuthenticatedRequest } from './principal';
import { ROLES_KEY } from './roles.decorator';
import { isPublicRoute, isTrackingRoute } from './route-metadata';

// Guard global que roda depois do JwtAuthGuard (ADR-004; contrato-api.md §1): sem @Roles() qualquer membro da equipe
// passa; MANAGER inclui tudo da equipe; senão o usuário precisa de ao menos um dos papéis exigidos.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (isPublicRoute(this.reflector, context) || isTrackingRoute(this.reflector, context)) {
      return true;
    }
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      throw new UnauthorizedException('Não autenticado');
    }
    if (user.roles.includes(Role.MANAGER)) {
      return true;
    }
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowed = required?.length ? required.some((role) => user.roles.includes(role)) : user.roles.some(isTeamRole);
    if (!allowed) {
      throw new ForbiddenException('Papel insuficiente para esta operação');
    }
    return true;
  }
}
