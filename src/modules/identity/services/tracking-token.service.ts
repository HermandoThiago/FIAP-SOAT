import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TRACKING_AUDIENCE } from '../auth';

const TRACKING_TTL = process.env['TRACKING_TOKEN_EXPIRES_IN'] ?? '7d';

/** Token de acompanhamento (ADR-011): JWT `aud=tracking`, `sub=serviceOrderId`, válido para uma só OS. */
@Injectable()
export class TrackingTokenService {
  constructor(private readonly jwt: JwtService) {}

  issue(serviceOrderId: string): Promise<string> {
    return this.jwt.signAsync(
      {},
      {
        subject: serviceOrderId,
        audience: TRACKING_AUDIENCE,
        expiresIn: TRACKING_TTL as '7d',
      },
    );
  }
}
