import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { type AuthenticatedUser } from '../../../shared/auth/principal';
import { type Clock, CLOCK } from '../../../shared/clock';
import { type Env } from '../../../shared/config/env';
import { ValidationError } from '../../../shared/domain/domain-error';
import { Email } from '../../../shared/domain/email';
import { Role } from '../../../shared/domain/role';
import { DomainEventPublisher } from '../../../shared/events/domain-event-publisher';
import { UserAuthenticated } from '../domain/events';
import { PasswordHash } from '../domain/password-hash';
import { type User } from '../domain/user';
import { UserRepository } from '../repositories/user.repository';
import { PasswordHasher } from './password-hasher';
import { type AccessTokenClaims, API_AUDIENCE, JWT_ALGORITHM, JWT_ISSUER } from './token.constants';

export interface LoginResult {
  accessToken: string;
  /** Validade em segundos (contrato-api.md §3.1: `expiresIn`). */
  expiresIn: number;
  roles: Role[];
}

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';
const INVALID_TOKEN = 'Token inválido ou expirado';

// Hash bcrypt (custo 12) de uma senha descartável: conferido quando o e-mail não existe, para o tempo de resposta não
// revelar se o usuário está cadastrado (PRD-005 RN-069/seguranca.md A07). Não é segredo.
const DUMMY_PASSWORD_HASH = PasswordHash.fromHash('$2b$12$vEjBbn7TjhXJb7lg6zQCnesJ5Ejo4YgCF2fgWxeHRjBo70PLcMxEC');

// Serviço de aplicação exportado (glossário §9: login, validateToken — ADR-004). Emite e valida o JWT HS256 de acesso
// (`aud=api`); a validação é stateless (não consulta o banco).
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly events: DomainEventPublisher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** RF-060: e-mail inválido, usuário inexistente, inativo ou senha errada → 401 com a mesma mensagem genérica. */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.findByRawEmail(email);
    const passwordMatches = await this.passwordHasher.verify(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !user.active || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const expiresIn = this.config.get('JWT_EXPIRES_MIN', { infer: true }) * 60;
    const accessToken = await this.jwt.signAsync(
      { roles: user.roles, ...(user.isCustomer() ? { customerId: user.customerId } : {}) },
      { subject: user.id, audience: API_AUDIENCE, expiresIn },
    );
    await this.events.publish(new UserAuthenticated({ userId: user.id, roles: user.roles }, this.clock.now()));
    return { accessToken, expiresIn, roles: user.roles };
  }

  /** Verifica assinatura, `exp`, `iss` e `aud=api` (PRD-005 RN-061); qualquer falha → 401 genérico. */
  async validateToken(token: string): Promise<AuthenticatedUser> {
    let claims: AccessTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        audience: API_AUDIENCE,
        issuer: JWT_ISSUER,
        algorithms: [JWT_ALGORITHM],
      });
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    if (typeof claims.sub !== 'string' || !isRoleList(claims.roles)) {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    return {
      id: claims.sub,
      roles: claims.roles,
      ...(typeof claims.customerId === 'string' ? { customerId: claims.customerId } : {}),
    };
  }

  private async findByRawEmail(raw: string): Promise<User | null> {
    try {
      return await this.users.findByEmail(Email.parse(raw));
    } catch (error) {
      if (error instanceof ValidationError) {
        return null;
      }
      throw error;
    }
  }
}

function isRoleList(value: unknown): value is Role[] {
  const known = new Set<string>(Object.values(Role));
  return Array.isArray(value) && value.length > 0 && value.every((role) => typeof role === 'string' && known.has(role));
}
