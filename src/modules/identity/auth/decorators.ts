import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { AuthenticatedRequest, AuthUser, TrackingActor } from './auth.types';
import { Role } from './roles';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const ALLOW_TRACKING_TOKEN_KEY = 'allowTrackingToken';

/** Libera a rota da autenticação (por padrão TODAS as rotas exigem login). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restringe a rota aos perfis informados. Sem o decorator, qualquer usuário logado acessa. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Injeta no controller o usuário logado (`AuthUser`) ou um campo dele: `@CurrentUser('userId')`. */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const { user } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return field ? user?.[field] : user;
  },
);

/** Aceita, além do login, o token de acompanhamento (`aud=tracking`). Sem isso ele é recusado (401). */
export const AllowTrackingToken = () =>
  SetMetadata(ALLOW_TRACKING_TOKEN_KEY, true);

/**
 * Injeta quem acessa `/tracking`: o token de acompanhamento ou o login do cliente.
 * JWT de equipe não entra em `/tracking` (403, ADR-011).
 */
export const CurrentTrackingActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TrackingActor => {
    const { user, tracking } = ctx
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (tracking) {
      return { kind: 'token', serviceOrderId: tracking.serviceOrderId };
    }
    if (user?.role === Role.CUSTOMER) {
      return { kind: 'customer', customerId: user.userId };
    }
    throw new ForbiddenException(
      'Você não tem permissão para acessar este recurso',
    );
  },
);
