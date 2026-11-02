import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth.types';
import { ROLES_KEY } from './decorators';
import { Role } from './roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const { user, tracking } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    // O token de acompanhamento não tem papel: o JwtAuthGuard já o limitou às rotas que o aceitam.
    if (tracking) return true;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso',
      );
    }
    return true;
  }
}
