import { UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type JwtService, type JwtSignOptions } from '@nestjs/jwt';

import { type PasswordHash } from '../../../../src/modules/identity/domain/password-hash';
import { AuthService } from '../../../../src/modules/identity/services/auth.service';
import { PasswordHasher } from '../../../../src/modules/identity/services/password-hasher';
import { JWT_ISSUER } from '../../../../src/modules/identity/services/token.constants';
import { FixedClock } from '../../../../src/shared/clock';
import { type Env } from '../../../../src/shared/config/env';
import { Role } from '../../../../src/shared/domain/role';
import {
  aUser,
  createLoggerStub,
  createPublisherStub,
  CUSTOMER_ID,
  FIXED_NOW,
  isUserAuthenticated,
  USER_ID,
} from '../fakes/builders';
import { InMemoryUserRepository } from '../fakes/in-memory-user.repository';
import { createTestJwtService, OTHER_JWT_SECRET, TEST_JWT_SECRET, unixSeconds } from '../fakes/jwt';

// Emissão e validação do JWT de acesso (ADR-004; PRD-005 RN-061/RN-070; estrategia-de-testes.md §2 identity).
// Relógio fixo: `iat`/`exp` são afirmados com valores exatos e a verificação usa o mesmo instante.
const EXPIRES_MIN = 60;
const EXPIRES_SECONDS = EXPIRES_MIN * 60;
const ISSUED_AT = unixSeconds(FIXED_NOW);
const PASSWORD = 'correct-password';
const EMAIL = 'mechanic@test.oficina.local';
const INVALID_TOKEN = new UnauthorizedException('Token inválido ou expirado');
const LOGIN_FAILED_MESSAGE = 'Falha de autenticação';

interface Claims {
  sub: string;
  roles: Role[];
  customerId?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

interface TokenShape {
  payload?: Record<string, unknown>;
  issuer?: string;
  audience?: string | string[] | null;
  /** `null` = sem o claim. */
  iat?: number | null;
  /** `null` = sem o claim. */
  exp?: number | null;
}

/** Token com os mesmos claims que o login emite em FIXED_NOW; cada teste negativo muda UMA coisa. */
function signAccessToken(jwt: JwtService, shape: TokenShape = {}): Promise<string> {
  const {
    payload = { roles: [Role.MANAGER] },
    audience = 'api',
    iat = ISSUED_AT,
    exp = ISSUED_AT + EXPIRES_SECONDS,
  } = shape;
  const options: JwtSignOptions = {
    subject: USER_ID,
    ...(shape.issuer === undefined ? {} : { issuer: shape.issuer }),
    ...(audience === null ? {} : { audience }),
    ...(iat === null ? { noTimestamp: true } : {}),
  };
  return jwt.signAsync({ ...payload, ...(iat === null ? {} : { iat }), ...(exp === null ? {} : { exp }) }, options);
}

function createConfig(expiresMin = EXPIRES_MIN): ConfigService<Env, true> {
  return { get: () => expiresMin } as unknown as ConfigService<Env, true>;
}

describe('AuthService', () => {
  const hasher = new PasswordHasher(4);
  let passwordHash: PasswordHash;

  beforeAll(async () => {
    passwordHash = await hasher.hash(PASSWORD);
  });

  function setup(): {
    service: AuthService;
    repository: InMemoryUserRepository;
    jwt: JwtService;
    published: ReturnType<typeof createPublisherStub>['published'];
    warn: ReturnType<typeof createLoggerStub>['warn'];
  } {
    const repository = new InMemoryUserRepository();
    const jwt = createTestJwtService();
    const { publisher, published } = createPublisherStub();
    const { logger, warn } = createLoggerStub();
    const service = new AuthService(
      repository.asRepository(),
      hasher,
      jwt,
      createConfig(),
      publisher,
      logger,
      new FixedClock(FIXED_NOW),
    );
    return { service, repository, jwt, published, warn };
  }

  describe('login', () => {
    it('should return a signed access token with iat and exp from the clock when the credentials are valid', async () => {
      const { service, repository, jwt } = setup();
      await repository.insert(aUser({ passwordHash, roles: [Role.ATTENDANT, Role.MANAGER] }));

      const result = await service.login(EMAIL, PASSWORD);

      expect(result.expiresIn).toBe(EXPIRES_SECONDS);
      expect(result.roles).toEqual([Role.ATTENDANT, Role.MANAGER]);
      const claims = jwt.decode<Claims>(result.accessToken);
      expect(claims.sub).toBe(USER_ID);
      expect(claims.roles).toEqual([Role.ATTENDANT, Role.MANAGER]);
      expect(claims.iss).toBe(JWT_ISSUER);
      expect(claims.aud).toBe('api');
      expect(claims.iat).toBe(ISSUED_AT);
      expect(claims.exp).toBe(ISSUED_AT + EXPIRES_SECONDS);
      expect(claims.customerId).toBeUndefined();
    });

    it('should include the customerId claim when the user is a CUSTOMER', async () => {
      const { service, repository, jwt } = setup();
      await repository.insert(aUser({ passwordHash, roles: [Role.CUSTOMER], customerId: CUSTOMER_ID }));

      const result = await service.login(EMAIL, PASSWORD);

      expect(result.roles).toEqual([Role.CUSTOMER]);
      expect(jwt.decode<Claims>(result.accessToken).customerId).toBe(CUSTOMER_ID);
    });

    it('should normalize the e-mail when it has different casing and spaces', async () => {
      const { service, repository } = setup();
      await repository.insert(aUser({ passwordHash }));

      await expect(service.login('  Mechanic@Test.Oficina.LOCAL ', PASSWORD)).resolves.toMatchObject({
        roles: [Role.MECHANIC],
      });
    });

    it('should publish the UserAuthenticated event pulled from the aggregate when the login succeeds', async () => {
      const { service, repository, published, warn } = setup();
      await repository.insert(aUser({ passwordHash }));

      await service.login(EMAIL, PASSWORD);

      expect(published).toHaveLength(1);
      const event = published[0];
      expect(isUserAuthenticated(event)).toBe(true);
      expect(event).toMatchObject({
        name: 'UserAuthenticated',
        aggregateId: USER_ID,
        occurredAt: FIXED_NOW,
        payload: { userId: USER_ID, roles: [Role.MECHANIC] },
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it.each([
      ['the e-mail is malformed', 'not-an-email', PASSWORD, true],
      ['the user does not exist', 'nobody@test.oficina.local', PASSWORD, true],
      ['the password is wrong', EMAIL, 'wrong-password', true],
      ['the user is inactive', EMAIL, PASSWORD, false],
    ])('should reject with the same generic 401 when %s', async (_case, email, password, active) => {
      const { service, repository, published, warn } = setup();
      await repository.insert(aUser({ passwordHash, active }));

      await expect(service.login(email, password)).rejects.toThrow(
        new UnauthorizedException('E-mail ou senha inválidos'),
      );
      expect(published).toEqual([]);
      expect(warn).toHaveBeenCalledTimes(1);
      const [fields, message] = warn.mock.calls[0];
      expect(message).toBe(LOGIN_FAILED_MESSAGE);
      // Sem o motivo da falha nem a senha (RN-070; seguranca.md A09): só o evento e, se houver, o e-mail mascarado.
      expect(Object.keys(fields).every((key) => key === 'event' || key === 'email')).toBe(true);
      expect(JSON.stringify(fields)).not.toContain(password);
    });

    it('should log login_failed with the masked e-mail when the password is wrong', async () => {
      const { service, repository, warn } = setup();
      await repository.insert(aUser({ passwordHash }));

      await expect(service.login(EMAIL, 'wrong-password')).rejects.toThrow(UnauthorizedException);

      expect(warn).toHaveBeenCalledWith(
        { event: 'login_failed', email: 'm***@test.oficina.local' },
        LOGIN_FAILED_MESSAGE,
      );
    });

    it('should log login_failed without the e-mail when it is malformed', async () => {
      const { service, warn } = setup();

      await expect(service.login('not-an-email', PASSWORD)).rejects.toThrow(UnauthorizedException);

      expect(warn).toHaveBeenCalledWith({ event: 'login_failed' }, LOGIN_FAILED_MESSAGE);
    });
  });

  describe('validateToken', () => {
    it('should return the authenticated user when the token was issued by login', async () => {
      const { service, repository } = setup();
      await repository.insert(aUser({ passwordHash, roles: [Role.CUSTOMER], customerId: CUSTOMER_ID }));
      const { accessToken } = await service.login(EMAIL, PASSWORD);

      await expect(service.validateToken(accessToken)).resolves.toEqual({
        id: USER_ID,
        roles: [Role.CUSTOMER],
        customerId: CUSTOMER_ID,
      });
    });

    it('should not include customerId when the token belongs to a team user', async () => {
      const { service, repository } = setup();
      await repository.insert(aUser({ passwordHash }));
      const { accessToken } = await service.login(EMAIL, PASSWORD);

      await expect(service.validateToken(accessToken)).resolves.toEqual({ id: USER_ID, roles: [Role.MECHANIC] });
    });

    it('should accept the token when its claims match what login issues', async () => {
      // Linha de base dos testes negativos abaixo: cada um muda só uma coisa neste token.
      const { service, jwt } = setup();

      await expect(service.validateToken(await signAccessToken(jwt))).resolves.toEqual({
        id: USER_ID,
        roles: [Role.MANAGER],
      });
    });

    it('should reject the token when the signature was made with another secret', async () => {
      const { service } = setup();
      const forged = await signAccessToken(createTestJwtService(OTHER_JWT_SECRET));

      await expect(service.validateToken(forged)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it is expired', async () => {
      const { service, jwt } = setup();
      const expired = await signAccessToken(jwt, { iat: ISSUED_AT - 2 * EXPIRES_SECONDS, exp: ISSUED_AT - 1 });

      await expect(service.validateToken(expired)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it is older than JWT_EXPIRES_MIN even though exp is in the future', async () => {
      const { service, jwt } = setup();
      const stale = await signAccessToken(jwt, { iat: ISSUED_AT - 2 * EXPIRES_SECONDS, exp: ISSUED_AT + 60 });

      await expect(service.validateToken(stale)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when its lifetime exceeds JWT_EXPIRES_MIN', async () => {
      const { service, jwt } = setup();
      const longLived = await signAccessToken(jwt, { exp: ISSUED_AT + 2 * EXPIRES_SECONDS });

      await expect(service.validateToken(longLived)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when the audience is tracking', async () => {
      const { service, jwt } = setup();
      const tracking = await signAccessToken(jwt, { audience: 'tracking' });

      await expect(service.validateToken(tracking)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it has no audience', async () => {
      const { service, jwt } = setup();
      const noAudience = await signAccessToken(jwt, { audience: null });

      await expect(service.validateToken(noAudience)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when the audience is an array that includes api', async () => {
      const { service, jwt } = setup();
      const multiAudience = await signAccessToken(jwt, { audience: ['api', 'tracking'] });

      await expect(service.validateToken(multiAudience)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it has no exp', async () => {
      const { service, jwt } = setup();
      const eternal = await signAccessToken(jwt, { exp: null });

      await expect(service.validateToken(eternal)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it has no iat', async () => {
      const { service, jwt } = setup();
      const noIssuedAt = await signAccessToken(jwt, { iat: null });

      await expect(service.validateToken(noIssuedAt)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when the issuer is not ours', async () => {
      const { service } = setup();
      const foreign = await signAccessToken(createTestJwtService(TEST_JWT_SECRET), { issuer: 'someone-else' });

      await expect(service.validateToken(foreign)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when the roles claim is missing', async () => {
      const { service, jwt } = setup();
      const noRoles = await signAccessToken(jwt, { payload: {} });

      await expect(service.validateToken(noRoles)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when the roles claim has an unknown role', async () => {
      const { service, jwt } = setup();
      const unknownRole = await signAccessToken(jwt, { payload: { roles: ['ADMIN'] } });

      await expect(service.validateToken(unknownRole)).rejects.toThrow(INVALID_TOKEN);
    });

    it('should reject the token when it is not a JWT at all', async () => {
      const { service } = setup();

      await expect(service.validateToken('garbage')).rejects.toThrow(INVALID_TOKEN);
    });
  });
});
