import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';

import { type AuthenticatedUser } from '../../../shared/auth/principal';
import { type Clock, CLOCK } from '../../../shared/clock';
import { type Env } from '../../../shared/config/env';
import { ValidationError } from '../../../shared/domain/domain-error';
import { Email } from '../../../shared/domain/email';
import { Role } from '../../../shared/domain/role';
import { DomainEventPublisher } from '../../../shared/events/domain-event-publisher';
import { PasswordHash } from '../domain/password-hash';
import { UserRepository } from '../repositories/user.repository';
import { PasswordHasher } from './password-hasher';
import { type AccessTokenClaims, hasExpectedAudienceAndLifetime, toUnixSeconds } from './token-claims';
import { API_AUDIENCE, JWT_ALGORITHM, JWT_ISSUER } from './token.constants';

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
// (`aud=api`); a validação é stateless (não consulta o banco). `iat`/`exp` e o relógio da verificação vêm do CLOCK
// injetado (determinístico nos testes; SystemClock em produção).
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly events: DomainEventPublisher,
    private readonly logger: PinoLogger,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.logger.setContext(AuthService.name);
  }

  /**
   * RF-060: e-mail inválido, usuário inexistente, senha errada ou usuário inativo (regra do agregado: User.authenticate)
   * → 401 com a mesma mensagem genérica. A falha vira evento de segurança no log (PRD-005 RN-070; seguranca.md A09):
   * e-mail mascarado (ou omitido se inválido), sem senha e sem o motivo.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const parsedEmail = parseEmail(email);
    const user = parsedEmail ? await this.users.findByEmail(parsedEmail) : null;
    const passwordMatches = await this.passwordHasher.verify(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    const now = this.clock.now();
    if (!user || !passwordMatches || !user.authenticate(now)) {
      this.logger.warn(
        { event: 'login_failed', ...(parsedEmail ? { email: parsedEmail.masked() } : {}) },
        'Falha de autenticação',
      );
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const expiresIn = this.config.get('JWT_EXPIRES_MIN', { infer: true }) * 60;
    const iat = toUnixSeconds(now);
    const accessToken = await this.jwt.signAsync(
      { roles: user.roles, ...(user.isCustomer() ? { customerId: user.customerId } : {}), iat, exp: iat + expiresIn },
      { subject: user.id, audience: API_AUDIENCE },
    );
    await this.events.publishAll(user.pullDomainEvents());
    return { accessToken, expiresIn, roles: user.roles };
  }

  /**
   * Verifica assinatura, `iss`, `aud=api` (string exata), `iat`/`exp` presentes, expiração e vida ≤ JWT_EXPIRES_MIN
   * (PRD-005 RN-061; seguranca.md A07); qualquer falha → 401 genérico.
   */
  async validateToken(token: string): Promise<AuthenticatedUser> {
    const expiresMin = this.config.get('JWT_EXPIRES_MIN', { infer: true });
    let claims: AccessTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        audience: API_AUDIENCE,
        issuer: JWT_ISSUER,
        algorithms: [JWT_ALGORITHM],
        maxAge: `${expiresMin}m`,
        clockTimestamp: toUnixSeconds(this.clock.now()),
      });
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    if (
      !hasExpectedAudienceAndLifetime(claims, API_AUDIENCE, expiresMin * 60) ||
      typeof claims.sub !== 'string' ||
      !isRoleList(claims.roles)
    ) {
      throw new UnauthorizedException(INVALID_TOKEN);
    }
    return {
      id: claims.sub,
      roles: claims.roles,
      ...(typeof claims.customerId === 'string' ? { customerId: claims.customerId } : {}),
    };
  }
}

/** E-mail fora do formato não é erro de validação no login (seria pista de enumeração): vira "usuário inexistente". */
function parseEmail(raw: string): Email | undefined {
  try {
    return Email.parse(raw);
  } catch (error) {
    if (error instanceof ValidationError) {
      return undefined;
    }
    throw error;
  }
}

function isRoleList(value: unknown): value is Role[] {
  const known = new Set<string>(Object.values(Role));
  return Array.isArray(value) && value.length > 0 && value.every((role) => typeof role === 'string' && known.has(role));
}
