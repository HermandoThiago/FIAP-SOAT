import { SetMetadata } from '@nestjs/common';
import { Role } from './roles';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Libera a rota da autenticação (por padrão TODAS as rotas exigem login). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restringe a rota aos perfis informados. Sem o decorator, qualquer usuário logado acessa. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
