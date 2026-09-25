import { SetMetadata } from '@nestjs/common';

import { type Role } from '../domain/role';

// Autorização por papel em cada rota administrativa (ADR-004; glossário §6). Sem @Roles(): qualquer membro da equipe;
// MANAGER passa em tudo da equipe (RolesGuard).
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
