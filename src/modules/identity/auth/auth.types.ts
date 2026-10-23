import type { Request } from 'express';
import { Role } from './roles';

export interface AuthUser {
  userId: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user: AuthUser };
