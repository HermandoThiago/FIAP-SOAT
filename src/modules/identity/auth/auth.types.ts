import type { Request } from 'express';
import { Role } from './roles';

export interface AuthUser {
  userId: string;
  role: Role;
}

/** Credencial do token de acompanhamento (`aud=tracking`): vale para uma única OS (ADR-011). */
export interface TrackingClaims {
  serviceOrderId: string;
}

export type AuthenticatedRequest = Request & {
  user: AuthUser;
  tracking?: TrackingClaims;
};

/** Quem acessa `/tracking`: o token de uma OS ou o login de um cliente. */
export type TrackingActor =
  | { kind: 'token'; serviceOrderId: string }
  | { kind: 'customer'; customerId: string };
