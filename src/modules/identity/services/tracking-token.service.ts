import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type Clock, CLOCK } from '../../../shared/clock';
import {
  JWT_ALGORITHM,
  JWT_ISSUER,
  TRACKING_AUDIENCE,
  TRACKING_TOKEN_TTL_DAYS,
  type TrackingTokenClaims,
} from './token.constants';

const TTL_MS = TRACKING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
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
    const expiresAt = new Date(this.clock.now().getTime() + TTL_MS);
    // `exp` vem do relógio injetável (determinístico nos testes), por isso não usamos `expiresIn`.
    const token = await this.jwt.signAsync(
      { exp: Math.floor(expiresAt.getTime() / 1000) },
      { subject: serviceOrderId, audience: TRACKING_AUDIENCE },
    );
    return { token, expiresAt };
  }

  /** Rejeita assinatura inválida, expirado e `aud` errado (ex.: token de login) com 401 genérico. */
  async validate(token: string): Promise<{ serviceOrderId: string }> {
    let claims: TrackingTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<TrackingTokenClaims>(token, {
        audience: TRACKING_AUDIENCE,
        issuer: JWT_ISSUER,
        algorithms: [JWT_ALGORITHM],
      });
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    return { serviceOrderId: claims.sub };
  }
}
