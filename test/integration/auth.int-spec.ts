import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  PASSWORD,
  SEED_EMAILS,
  bearer,
  createDb,
  createTestApp,
  login,
  randomCpf,
  uniqueEmail,
} from './support/app';

describe('Auth e papéis (integração)', () => {
  let app: INestApplication<App>;
  const db = createDb();

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await db.$disconnect();
  });

  const http = () => request(app.getHttpServer());

  describe('POST /auth/login', () => {
    it('should return access and refresh tokens when the credentials are valid', async () => {
      const tokens = await login(app, SEED_EMAILS.admin);

      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });

    it('should answer 401 when the password is wrong', async () => {
      await http()
        .post('/auth/login')
        .send({ email: SEED_EMAILS.admin, senha: 'senha-incorreta-123' })
        .expect(401);
    });

    it('should answer 401 with the same message when the e-mail does not exist', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: uniqueEmail('ghost'), senha: PASSWORD })
        .expect(401);

      expect(res.body.message).toBe('E-mail ou senha incorretos');
    });
  });

  describe('autenticação e autorização', () => {
    it('should answer 401 when a protected route is called without token', async () => {
      await http().get('/customers').expect(401);
    });

    it('should answer 401 when the token is invalid', async () => {
      await http()
        .get('/customers')
        .set('Authorization', bearer('token.invalido.aqui'))
        .expect(401);
    });

    it('should answer 403 when the role is not allowed on the route', async () => {
      const { accessToken } = await login(app, SEED_EMAILS.mechanic);

      await http()
        .post('/customers')
        .set('Authorization', bearer(accessToken))
        .send({})
        .expect(403);
    });

    it('should answer 403 when a customer calls a staff route', async () => {
      const { accessToken } = await login(app, 'cliente@oficina.local');

      await http()
        .get('/service-orders')
        .set('Authorization', bearer(accessToken))
        .expect(403);
    });

    it('should keep /auth/login public', async () => {
      // sem Authorization: não pode responder 401 por falta de token (aqui, 422/400 de validação)
      const res = await http().post('/auth/login').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('refresh token', () => {
    it('should rotate the refresh token and reject the reuse of the old one', async () => {
      const first = await login(app, SEED_EMAILS.attendant);

      const rotated = await http()
        .post('/auth/refresh')
        .set('Authorization', bearer(first.accessToken))
        .send({ refreshToken: first.refreshToken })
        .expect(200);
      expect(rotated.body.refreshToken).not.toBe(first.refreshToken);

      // reuso do token antigo derruba toda a família (inclusive o novo)
      await http()
        .post('/auth/refresh')
        .set('Authorization', bearer(first.accessToken))
        .send({ refreshToken: first.refreshToken })
        .expect(401);
      await http()
        .post('/auth/refresh')
        .set('Authorization', bearer(first.accessToken))
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(401);
    });

    it('should revoke the session on logout', async () => {
      const tokens = await login(app, SEED_EMAILS.attendant);

      await http()
        .post('/auth/logout')
        .set('Authorization', bearer(tokens.accessToken))
        .send({ refreshToken: tokens.refreshToken })
        .expect(204);
      await http()
        .post('/auth/refresh')
        .set('Authorization', bearer(tokens.accessToken))
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/register', () => {
    it('should create a user that can log in, and never expose the password', async () => {
      const admin = await login(app, SEED_EMAILS.admin);
      const perfil = await db.perfil.findUniqueOrThrow({
        where: { perfilNome: 'Cliente' },
      });
      const email = uniqueEmail('register');

      const res = await http()
        .post('/auth/register')
        .set('Authorization', bearer(admin.accessToken))
        .send({
          usuarioNome: 'Cliente Registrado',
          usuarioEmail: email,
          usuarioDocumento: randomCpf(),
          usuarioTipoDocumento: 'CPF',
          senha: PASSWORD,
          perfilId: perfil.perfilId,
        })
        .expect(201);

      expect(JSON.stringify(res.body)).not.toMatch(/senha|hash/i);
      await login(app, email);
    });

    it('should answer 409 when the e-mail is already registered', async () => {
      const admin = await login(app, SEED_EMAILS.admin);
      const perfil = await db.perfil.findUniqueOrThrow({
        where: { perfilNome: 'Cliente' },
      });

      await http()
        .post('/auth/register')
        .set('Authorization', bearer(admin.accessToken))
        .send({
          usuarioNome: 'Duplicado',
          usuarioEmail: SEED_EMAILS.admin,
          usuarioDocumento: randomCpf(),
          usuarioTipoDocumento: 'CPF',
          senha: PASSWORD,
          perfilId: perfil.perfilId,
        })
        .expect(409);
    });

    it('should answer 403 when an attendant tries to create an admin', async () => {
      const attendant = await login(app, SEED_EMAILS.attendant);
      const perfil = await db.perfil.findUniqueOrThrow({
        where: { perfilNome: 'Admin' },
      });

      await http()
        .post('/auth/register')
        .set('Authorization', bearer(attendant.accessToken))
        .send({
          usuarioNome: 'Novo Admin',
          usuarioEmail: uniqueEmail('admin'),
          usuarioDocumento: randomCpf(),
          usuarioTipoDocumento: 'CPF',
          senha: PASSWORD,
          perfilId: perfil.perfilId,
        })
        .expect(403);
    });
  });
});
