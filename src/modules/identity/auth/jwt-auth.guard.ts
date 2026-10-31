import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from './auth.types';
import { ALLOW_TRACKING_TOKEN_KEY, IS_PUBLIC_KEY } from './decorators';
import { Role } from './roles';
import { TRACKING_AUDIENCE } from './tracking-audience';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de acesso ausente');
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        role?: Role;
        aud?: string | string[];
      }>(token, { algorithms: ['HS256'] });

      if (payload.aud === TRACKING_AUDIENCE) {
        // Token de acompanhamento só vale nas rotas que o aceitam explicitamente.
        const allowed = this.reflector.getAllAndOverride<boolean>(
          ALLOW_TRACKING_TOKEN_KEY,
          [context.getHandler(), context.getClass()],
        );
        if (!allowed) throw new Error('tracking token on a non-tracking route');

        request.tracking = { serviceOrderId: payload.sub };
      } else {
        request.user = { userId: payload.sub, role: payload.role as Role };
      }
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado');
    }

    return true;
  }
}
