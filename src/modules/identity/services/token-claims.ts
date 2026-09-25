// Claims dos JWTs do identity depois do verifyAsync (ADR-004; ADR-011; PRD-005 RN-061). A biblioteca só garante
// assinatura, emissor, `exp` (quando existe) e que a audiência esperada está ENTRE as do token; o resto é conferido aqui,
// claim a claim, por isso os tipos são `unknown` até a checagem (sem `any`, sem cast).

/** Claims temporais e de audiência, comuns ao token de acesso e ao de acompanhamento. */
export interface TimedClaims {
  aud?: unknown;
  iat?: unknown;
  exp?: unknown;
}

/** Token de acesso (`sub` = id do usuário; `customerId` só para CUSTOMER). */
export interface AccessTokenClaims extends TimedClaims {
  sub?: unknown;
  roles?: unknown;
  customerId?: unknown;
}

/** Token de acompanhamento (`sub` = id da OS). */
export interface TrackingTokenClaims extends TimedClaims {
  sub?: unknown;
}

/** Instante em segundos desde a época, como nos claims `iat`/`exp` (RFC 7519 §2, NumericDate). */
export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * seguranca.md A07 ("tokens eternos"): `exp` e `iat` obrigatórios e numéricos; `aud` exatamente a string esperada — um
 * token com `aud: ["api", "tracking"]` satisfaz a biblioteca nos dois guards e é recusado aqui; e a vida do token
 * (`exp - iat`) no máximo a que o identity emite, para que um token assinado com validade maior que a nossa seja
 * rejeitado mesmo antes de expirar (o `maxAge` do verifyAsync só limita a idade contada desde `iat`).
 */
export function hasExpectedAudienceAndLifetime(
  claims: TimedClaims,
  audience: string,
  maxLifetimeSeconds: number,
): boolean {
  return (
    typeof claims.exp === 'number' &&
    typeof claims.iat === 'number' &&
    claims.aud === audience &&
    claims.exp - claims.iat <= maxLifetimeSeconds
  );
}
