// Parâmetros dos JWTs emitidos pelo identity (ADR-004; ADR-011; PRD-005 RN-061). Compartilhados entre o JwtModule
// (identity.module.ts), o AuthService e o TrackingTokenService — ninguém fora do identity conhece o formato do token.

/** Nome provisório da aplicação como emissor (E-01 define o nome definitivo). */
export const JWT_ISSUER = 'oficina-api';
export const JWT_ALGORITHM = 'HS256';
/** Audiência do token de acesso (login de equipe ou cliente). */
export const API_AUDIENCE = 'api';
/** Audiência do token de acompanhamento (uma OS, 7 dias — ADR-011). */
export const TRACKING_AUDIENCE = 'tracking';
export const TRACKING_TOKEN_TTL_DAYS = 7;
