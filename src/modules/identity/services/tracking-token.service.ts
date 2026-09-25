import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type Clock, CLOCK } from '../../../shared/clock';
import { hasExpectedAudienceAndLifetime, toUnixSeconds, type TrackingTokenClaims } from './token-claims';
import { JWT_ALGORITHM, JWT_ISSUER, TRACKING_AUDIENCE, TRACKING_TOKEN_TTL_DAYS } from './token.constants';

const TTL_SECONDS = TRACKING_TOKEN_TTL_DAYS * 24 * 60 * 60;
const INVALID_TOKEN = 'Token de acompanhamento inválido ou expirado';

// Serviço de aplicação exportado (glossário §9: issue, validate — ADR-011): token de acompanhamento de UMA OS
// (`aud=tracking`, `sub=serviceOrderId`, 7 dias), emitido em POST /service-orders/{id}/quote/send e aceito em
// /tracking/**. Mesmo emissor/segredo do token de acesso; a audiência é o que separa os dois (PRD-005 RN-061).
@Injectable()
export class TrackingTokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async issue(serviceOrderId: string): Promise<{ token: string; expiresAt: Date }> {
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000);
    // `iat` e `exp` vêm do relógio injetável (determinístico nos testes), por isso não usamos `expiresIn`.
    const token = await this.jwt.signAsync(
      { iat: toUnixSeconds(now), exp: toUnixSeconds(expiresAt) },
      { subject: serviceOrderId, audience: TRACKING_AUDIENCE },
    );
    return { token, expiresAt };
  }

  /**
   * Rejeita com 401 genérico: assinatura inválida, expirado, `aud` diferente de `tracking` (ex.: token de login ou
   * audiência múltipla), sem `iat`/`exp`/`sub` ou vida maior que os 7 dias emitidos (seguranca.md A07).
   */
  async validate(token: string): Promise<{ serviceOrderId: string }> {
    let claims: TrackingTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<TrackingTokenClaims>(token, {
        audience: TRACKING_AUDIENCE,
        issuer: JWT_ISSUER,
        algorithms: [JWT_ALGORITHM],
        maxAge: `${TRACKING_TOKEN_TTL_DAYS}d`,
        clockTimestamp: toUnixSeconds(this.clock.now()),
      });
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    if (
      !hasExpectedAudienceAndLifetime(claims, TRACKING_AUDIENCE, TTL_SECONDS) ||
      typeof claims.sub !== 'string' ||
      claims.sub.length === 0
    ) {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    return { serviceOrderId: claims.sub };
  }
}
