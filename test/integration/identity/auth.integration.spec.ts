import { randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { TrackingTokenService } from '../../../src/modules/identity/services/tracking-token.service';
import { Role } from '../../../src/shared/domain/role';
import { type ProblemDetails } from '../../../src/shared/http/problem-details';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { API_BASE, bearer, loginAs, loginAsAdmin, signToken } from '../../support/auth';
import { createCustomer, deleteTestCustomers } from '../../support/customers';
import { randomEmail } from '../../support/generators';
import { createTestApp, httpServer } from '../../support/test-app';
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from '../../support/test-env';

// Login, guards e cadastro de usuários de ponta a ponta (PRD-005 §4; estrategia-de-testes.md §2 identity;
// ADR-004/011) sobre o PostgreSQL de teste. O MANAGER vem do bootstrap (RF-062); o resto é criado e apagado aqui.
const LOGIN = `${API_BASE}/auth/login`;
const USERS = `${API_BASE}/users`;

interface LoginBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  roles: Role[];
}

interface UserBody {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  customerId?: string;
  active: boolean;
  createdAt: string;
  passwordHash?: string;
}

interface UserPayload {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  customerId?: string;
}

describe('identity (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { not: TEST_ADMIN_EMAIL } } });
    await deleteTestCustomers(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  function teamUser(roles: Role[]): UserPayload {
    return { name: 'Usuário de teste', email: randomEmail(), password: 'test-password-1', roles };
  }

  /** MANAGER cadastra um usuário com os papéis dados e devolve o token desse usuário logado. */
  async function loginAsNewUser(roles: Role[]): Promise<string> {
    const adminToken = await loginAsAdmin(app);
    const payload = teamUser(roles);
    await request(httpServer(app)).post(USERS).set(bearer(adminToken)).send(payload).expect(201);
    return loginAs(app, payload.email, payload.password);
  }

  describe('POST /auth/login', () => {
    it('should answer 200 with the access token and roles when the admin credentials are valid', async () => {
      const response = await request(httpServer(app))
        .post(LOGIN)
        .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
        .expect(200);
      const body = response.body as LoginBody;

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.tokenType).toBe('Bearer');
      expect(body.expiresIn).toBe(3600);
      expect(body.roles).toEqual([Role.MANAGER]);
    });

    it('should answer a generic Problem Details 401 when the password is wrong', async () => {
      const response = await request(httpServer(app))
        .post(LOGIN)
        .send({ email: TEST_ADMIN_EMAIL, password: 'wrong-password' })
        .expect(401);

      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({
        type: 'https://oficina.local/errors/unauthorized',
        title: 'Não autenticado',
        status: 401,
        detail: 'E-mail ou senha inválidos',
        instance: LOGIN,
      });
    });

    it('should answer the same 401 when the e-mail does not exist', async () => {
      const response = await request(httpServer(app))
        .post(LOGIN)
        .send({ email: 'nobody@test.oficina.local', password: 'wrong-password' })
        .expect(401);

      expect((response.body as ProblemDetails).detail).toBe('E-mail ou senha inválidos');
    });

    it('should answer 422 pointing to the email field when the e-mail is malformed', async () => {
      const response = await request(httpServer(app))
        .post(LOGIN)
        .send({ email: 'not-an-email', password: 'whatever' })
        .expect(422);
      const body = response.body as ProblemDetails;

      expect(body.title).toBe('Dados inválidos');
      expect(body.errors).toEqual([{ field: 'email', message: 'e-mail inválido' }]);
    });
  });

  describe('POST /users — authentication', () => {
    it('should answer 401 when no token is sent', async () => {
      const response = await request(httpServer(app))
        .post(USERS)
        .send(teamUser([Role.MECHANIC]))
        .expect(401);

      expect(response.body).toMatchObject({ status: 401, detail: 'Não autenticado' });
    });

    it('should answer 401 when the token is expired', async () => {
      const admin = await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN_EMAIL } });
      const expired = await signToken(
        app,
        { roles: [Role.MANAGER] },
        { subject: admin.id, audience: 'api', expiresIn: '-1s' },
      );

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(expired))
        .send(teamUser([Role.MECHANIC]))
        .expect(401);

      expect(response.body).toMatchObject({ status: 401, detail: 'Token inválido ou expirado' });
    });

    it('should answer 401 when the token signature is wrong', async () => {
      const forged = await new JwtService({ secret: 'forged-secret-with-at-least-32-characters!!' }).signAsync(
        { roles: [Role.MANAGER] },
        { subject: randomUUID(), audience: 'api', issuer: 'oficina-api', expiresIn: '1h' },
      );

      await request(httpServer(app))
        .post(USERS)
        .set(bearer(forged))
        .send(teamUser([Role.MECHANIC]))
        .expect(401);
    });

    it('should answer 401 when the token is a tracking token', async () => {
      // ADR-011: aud=tracking só entra em /tracking/**; numa rota administrativa é recusado como qualquer token inválido.
      const { token } = await app.get(TrackingTokenService).issue(randomUUID());

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send(teamUser([Role.MECHANIC]))
        .expect(401);

      expect(response.body).toMatchObject({ status: 401, detail: 'Token inválido ou expirado' });
    });
  });

  describe('POST /users — team users', () => {
    it('should answer 201 with Location and without passwordHash when a MANAGER creates a MECHANIC', async () => {
      const token = await loginAsAdmin(app);
      const payload = teamUser([Role.MECHANIC]);

      const response = await request(httpServer(app)).post(USERS).set(bearer(token)).send(payload).expect(201);
      const body = response.body as UserBody;

      expect(response.headers.location).toBe(`${USERS}/${body.id}`);
      expect(body).toEqual({
        id: expect.any(String) as string,
        name: payload.name,
        email: payload.email,
        roles: [Role.MECHANIC],
        active: true,
        createdAt: expect.any(String) as string,
      });
      expect(body.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('$2b$');
      await expect(loginAs(app, payload.email, payload.password)).resolves.toEqual(expect.any(String));
    });

    it('should answer 409 when the e-mail is already registered', async () => {
      const token = await loginAsAdmin(app);
      const payload = teamUser([Role.ATTENDANT]);
      await request(httpServer(app)).post(USERS).set(bearer(token)).send(payload).expect(201);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send({ ...payload, email: payload.email.toUpperCase() })
        .expect(409);

      expect(response.body).toMatchObject({
        type: 'https://oficina.local/errors/conflict',
        status: 409,
        detail: 'E-mail já cadastrado',
      });
    });

    it('should answer 403 when an ATTENDANT tries to create a MECHANIC', async () => {
      const attendantToken = await loginAsNewUser([Role.ATTENDANT]);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(attendantToken))
        .send(teamUser([Role.MECHANIC]))
        .expect(403);

      expect(response.body).toMatchObject({
        type: 'https://oficina.local/errors/forbidden',
        status: 403,
        detail: 'Apenas MANAGER pode criar usuários da equipe',
      });
    });

    it('should answer 403 when an ATTENDANT mixes CUSTOMER with a team role', async () => {
      const attendantToken = await loginAsNewUser([Role.ATTENDANT]);
      const customerId = await createCustomer(prisma);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(attendantToken))
        .send({ ...teamUser([Role.CUSTOMER, Role.MANAGER]), customerId })
        .expect(403);

      expect(response.body).toMatchObject({ status: 403, detail: 'Apenas MANAGER pode criar usuários da equipe' });
    });

    it('should answer 403 from the RolesGuard when a MECHANIC calls POST /users', async () => {
      // Prova @Roles(ATTENDANT, MANAGER) + RolesGuard depois do JwtAuthGuard: o MECHANIC nem chega ao UsersService.
      const mechanicToken = await loginAsNewUser([Role.MECHANIC]);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(mechanicToken))
        .send(teamUser([Role.MECHANIC]))
        .expect(403);

      expect(response.body).toMatchObject({
        type: 'https://oficina.local/errors/forbidden',
        status: 403,
        detail: 'Papel insuficiente para esta operação',
      });
    });

    it('should answer 422 with the offending fields when the payload is invalid', async () => {
      const token = await loginAsAdmin(app);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send({ name: '', email: 'nope', password: 'short', roles: ['ADMIN'], customerId: 'not-a-uuid' })
        .expect(422);
      const body = response.body as ProblemDetails;

      expect(body.title).toBe('Dados inválidos');
      expect(body.errors?.map((error) => error.field)).toEqual(
        expect.arrayContaining(['name', 'email', 'password', 'roles', 'customerId']),
      );
    });

    it('should answer 422 with a single name error when the name is missing', async () => {
      const token = await loginAsAdmin(app);
      const { name: _name, ...payload } = teamUser([Role.MECHANIC]);

      const response = await request(httpServer(app)).post(USERS).set(bearer(token)).send(payload).expect(422);

      expect((response.body as ProblemDetails).errors).toEqual([{ field: 'name', message: 'nome obrigatório' }]);
    });

    it('should answer 422 pointing to password when it exceeds 72 bytes', async () => {
      const token = await loginAsAdmin(app);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send({ ...teamUser([Role.MECHANIC]), password: 'é'.repeat(40) })
        .expect(422);

      expect((response.body as ProblemDetails).errors).toEqual([
        { field: 'password', message: 'senha deve ter no máximo 72 bytes' },
      ]);
    });

    it('should answer 422 pointing to customerId when a team user carries a customerId', async () => {
      const token = await loginAsAdmin(app);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send({ ...teamUser([Role.MECHANIC]), customerId: randomUUID() })
        .expect(422);

      expect((response.body as ProblemDetails).errors).toEqual([
        { field: 'customerId', message: 'customerId só é permitido para o papel CUSTOMER' },
      ]);
    });
  });

  describe('POST /users — customer login (ADR-011)', () => {
    it('should create the CUSTOMER user and let it log in but not use administrative routes when a MANAGER registers it', async () => {
      const adminToken = await loginAsAdmin(app);
      const customerId = await createCustomer(prisma);
      const payload = { ...teamUser([Role.CUSTOMER]), customerId };

      const created = await request(httpServer(app)).post(USERS).set(bearer(adminToken)).send(payload).expect(201);
      expect(created.body).toMatchObject({ roles: [Role.CUSTOMER], customerId });

      const login = await request(httpServer(app))
        .post(LOGIN)
        .send({ email: payload.email, password: payload.password })
        .expect(200);
      const loginBody = login.body as LoginBody;
      expect(loginBody.roles).toEqual([Role.CUSTOMER]);

      const forbidden = await request(httpServer(app))
        .post(USERS)
        .set(bearer(loginBody.accessToken))
        .send(teamUser([Role.MECHANIC]))
        .expect(403);
      expect(forbidden.body).toMatchObject({ status: 403, detail: 'Acesso restrito à equipe da oficina' });
    });

    it('should answer 409 when the customer already has an access user', async () => {
      // Índice parcial users_customer_id_key: o P2002 chega pelo driver adapter (constraint.index), não por meta.target.
      const adminToken = await loginAsAdmin(app);
      const customerId = await createCustomer(prisma);
      await request(httpServer(app))
        .post(USERS)
        .set(bearer(adminToken))
        .send({ ...teamUser([Role.CUSTOMER]), customerId })
        .expect(201);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(adminToken))
        .send({ ...teamUser([Role.CUSTOMER]), customerId })
        .expect(409);

      expect(response.body).toMatchObject({
        type: 'https://oficina.local/errors/conflict',
        status: 409,
        detail: 'Cliente já possui usuário de acesso',
      });
    });

    it('should answer 404 when the customerId does not exist', async () => {
      const token = await loginAsAdmin(app);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send({ ...teamUser([Role.CUSTOMER]), customerId: randomUUID() })
        .expect(404);

      expect(response.body).toMatchObject({
        type: 'https://oficina.local/errors/not-found',
        status: 404,
        detail: 'Cliente não encontrado',
      });
    });

    it('should answer 404 when the customer is inactive', async () => {
      const token = await loginAsAdmin(app);
      const customerId = await createCustomer(prisma, { active: false });

      await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send({ ...teamUser([Role.CUSTOMER]), customerId })
        .expect(404);
    });

    it('should answer 422 pointing to customerId when the CUSTOMER role comes without customerId', async () => {
      const token = await loginAsAdmin(app);

      const response = await request(httpServer(app))
        .post(USERS)
        .set(bearer(token))
        .send(teamUser([Role.CUSTOMER]))
        .expect(422);

      expect((response.body as ProblemDetails).errors).toEqual([
        { field: 'customerId', message: 'customerId é obrigatório para o papel CUSTOMER' },
      ]);
    });
  });
});
