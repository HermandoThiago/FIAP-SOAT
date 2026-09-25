import { type Request } from 'express';

import { type Role } from '../domain/role';

/** Usuário autenticado pelo JwtAuthGuard (JWT `aud=api`), injetado em `request.user` (ADR-004). */
export interface AuthenticatedUser {
  id: string;
  roles: Role[];
  /** Presente só quando o papel é CUSTOMER (ADR-011). */
  customerId?: string;
}

/** Credencial aceita pelo TrackingAuthGuard em /tracking/** (ADR-011), injetada em `request.tracking`. */
export type TrackingCredential =
  { kind: 'TRACKING_TOKEN'; serviceOrderId: string } | { kind: 'CUSTOMER_LOGIN'; userId: string; customerId: string };

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tracking?: TrackingCredential;
}
