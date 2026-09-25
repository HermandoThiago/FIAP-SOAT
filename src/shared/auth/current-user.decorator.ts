import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedRequest, type AuthenticatedUser, type TrackingCredential } from './principal';

// Parâmetros de handler: o usuário autenticado pelo JwtAuthGuard e a credencial aceita pelo TrackingAuthGuard.
// Ausência indica rota sem o guard correspondente (erro de configuração), nunca uma condição normal.
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) {
    throw new UnauthorizedException('Não autenticado');
  }
  return user;
});

export const TrackingPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TrackingCredential => {
    const tracking = context.switchToHttp().getRequest<AuthenticatedRequest>().tracking;
    if (!tracking) {
      throw new UnauthorizedException('Não autenticado');
    }
    return tracking;
  },
);
