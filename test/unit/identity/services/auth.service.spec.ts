import { UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { type PasswordHash } from '../../../../src/modules/identity/domain/password-hash';
import { AuthService } from '../../../../src/modules/identity/services/auth.service';
import { PasswordHasher } from '../../../../src/modules/identity/services/password-hasher';
import { JWT_ISSUER } from '../../../../src/modules/identity/services/token.constants';
import { FixedClock } from '../../../../src/shared/clock';
import { type Env } from '../../../../src/shared/config/env';
import { Role } from '../../../../src/shared/domain/role';
import { aUser, createPublisherStub, CUSTOMER_ID, FIXED_NOW, isUserAuthenticated, USER_ID } from '../fakes/builders';
import { InMemoryUserRepository } from '../fakes/in-memory-user.repository';

// Emissão e validação do JWT de acesso (ADR-004; PRD-005 RN-061; estrategia-de-testes.md §2 identity).
const SECRET = 'unit-test-jwt-secret-with-at-least-32-characters';
const OTHER_SECRET = 'another-jwt-secret-with-at-least-32-characters!';
const EXPIRES_MIN = 60;
const PASSWORD = 'correct-password';

interface Claims {
  sub: string;
  roles: Role[];
  customerId?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function createJwtService(secret = SECRET): JwtService {
  return new JwtService({
    secret,
    signOptions: { algorithm: 'HS256', issuer: JWT_ISSUER },
    verifyOptions: { algorithms: ['HS256'], issuer: JWT_ISSUER },
  });
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
  } {
    const repository = new InMemoryUserRepository();
    const jwt = createJwtService();
    const { publisher, published } = createPublisherStub();
    const service = new AuthService(
      repository.asRepository(),
      hasher,
      jwt,
      createConfig(),
      publisher,
      new FixedClock(FIXED_NOW),
    );
    return { service, repository, jwt, published };
  }

  describe('login', () => {
    it('should return a signed access token with the expected claims when the credentials are valid', async () => {
      const { service, repository, jwt } = setup();
      await repository.insert(aUser({ passwordHash, roles: [Role.ATTENDANT, Role.MANAGER] }));

      const result = await service.login('mechanic@test.oficina.local', PASSWORD);

      expect(result.expiresIn).toBe(EXPIRES_MIN * 60);
      expect(result.roles).toEqual([Role.ATTENDANT, Role.MANAGER]);
      const claims = jwt.decode<Claims>(result.accessToken);
      expect(claims.sub).toBe(USER_ID);
      expect(claims.roles).toEqual([Role.ATTENDANT, Role.MANAGER]);
      expect(claims.iss).toBe(JWT_ISSUER);
      expect(claims.aud).toBe('api');
      expect(claims.exp - claims.iat).toBe(EXPIRES_MIN * 60);
      expect(claims.customerId).toBeUndefined();
    });

    it('should include the customerId claim when the user is a CUSTOMER', async () => {
      const { service, repository, jwt } = setup();
      await repository.insert(aUser({ passwordHash, roles: [Role.CUSTOMER], customerId: CUSTOMER_ID }));

      const result = await service.login('mechanic@test.oficina.local', PASSWORD);

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

    it('should publish UserAuthenticated when the login succeeds', async () => {
      const { service, repository, published } = setup();
      await repository.insert(aUser({ passwordHash }));

      await service.login('mechanic@test.oficina.local', PASSWORD);

      expect(published).toHaveLength(1);
      const event = published[0];
      expect(isUserAuthenticated(event)).toBe(true);
      expect(event).toMatchObject({
        name: 'UserAuthenticated',
        aggregateId: USER_ID,
        occurredAt: FIXED_NOW,
        payload: { userId: USER_ID, roles: [Role.MECHANIC] },
      });
    });

    it.each([
      ['the e-mail is malformed', 'not-an-email', PASSWORD, true],
      ['the user does not exist', 'nobody@test.oficina.local', PASSWORD, true],
      ['the password is wrong', 'mechanic@test.oficina.local', 'wrong-password', true],
      ['the user is inactive', 'mechanic@test.oficina.local', PASSWORD, false],
    ])('should reject with the same generic 401 when %s', async (_case, email, password, active) => {
      const { service, repository, published } = setup();
      await repository.insert(aUser({ passwordHash, active }));

      await expect(service.login(email, password)).rejects.toThrow(
        new UnauthorizedException('E-mail ou senha inválidos'),
      );
      expect(published).toEqual([]);
    });
  });

  describe('validateToken', () => {
    it('should return the authenticated user when the token is valid', async () => {
      const { service, repository } = setup();
      await repository.insert(aUser({ passwordHash, roles: [Role.CUSTOMER], customerId: CUSTOMER_ID }));
      const { accessToken } = await service.login('mechanic@test.oficina.local', PASSWORD);

      await expect(service.validateToken(accessToken)).resolves.toEqual({
        id: USER_ID,
        roles: [Role.CUSTOMER],
        customerId: CUSTOMER_ID,
      });
    });

    it('should not include customerId when the token belongs to a team user', async () => {
      const { service, repository } = setup();
      await repository.insert(aUser({ passwordHash }));
      const { accessToken } = await service.login('mechanic@test.oficina.local', PASSWORD);

      await expect(service.validateToken(accessToken)).resolves.toEqual({ id: USER_ID, roles: [Role.MECHANIC] });
    });

    it('should reject the token when the signature was made with another secret', async () => {
      const { service } = setup();
      const forged = await createJwtService(OTHER_SECRET).signAsync(
        { roles: [Role.MANAGER] },
        { subject: USER_ID, audience: 'api', expiresIn: '1h' },
      );

      await expect(service.validateToken(forged)).rejects.toThrow(
        new UnauthorizedException('Token inválido ou expirado'),
      );
    });

    it('should reject the token when it is expired', async () => {
      const { service, jwt } = setup();
      const expired = await jwt.signAsync(
        { roles: [Role.MANAGER] },
        { subject: USER_ID, audience: 'api', expiresIn: '-1s' },
      );

      await expect(service.validateToken(expired)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject the token when the audience is tracking', async () => {
      const { service, jwt } = setup();
      const tracking = await jwt.signAsync({}, { subject: USER_ID, audience: 'tracking', expiresIn: '7d' });

      await expect(service.validateToken(tracking)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject the token when the issuer is not ours', async () => {
      const { service } = setup();
      const foreign = await new JwtService({ secret: SECRET }).signAsync(
        { roles: [Role.MANAGER] },
        { subject: USER_ID, audience: 'api', issuer: 'someone-else', expiresIn: '1h' },
      );

      await expect(service.validateToken(foreign)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject the token when the roles claim is missing', async () => {
      const { service, jwt } = setup();
      const noRoles = await jwt.signAsync({}, { subject: USER_ID, audience: 'api', expiresIn: '1h' });

      await expect(service.validateToken(noRoles)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject the token when it is not a JWT at all', async () => {
      const { service } = setup();

      await expect(service.validateToken('garbage')).rejects.toThrow(UnauthorizedException);
    });
  });
});
