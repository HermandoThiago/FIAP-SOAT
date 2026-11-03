import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { CustomersController } from '../../src/modules/customers/controllers/customers.controller';
import {
  CustomersService,
  VehiclesService,
} from '../../src/modules/customers/services';
import {
  JwtAuthGuard,
  Role,
  RolesGuard,
} from '../../src/modules/identity/auth';
import { AuthController } from '../../src/modules/identity/controllers/auth.controller';
import { AuthService } from '../../src/modules/identity/services';
import { setupSwagger } from '../../src/shared/swagger';

describe('Swagger Bearer authentication', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;
  let accessToken: string;
  const customers = { customers: [], total: 0, page: 1, pageSize: 20 };
  const authService = { login: jest.fn() };

  beforeAll(async () => {
    // Real HTTP controllers and JWT guards; no database or credential validation.
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'swagger-test-only-secret-not-for-production',
          signOptions: { algorithm: 'HS256', expiresIn: '5m' },
        }),
      ],
      controllers: [AuthController, CustomersController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: CustomersService,
          useValue: { findAll: jest.fn().mockResolvedValue(customers) },
        },
        { provide: VehiclesService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    accessToken = moduleRef.get(JwtService).sign({
      sub: 'swagger-test-user',
      role: Role.ADMIN,
    });
    authService.login.mockResolvedValue({ accessToken, tokenType: 'Bearer' });
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    document = setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should register the HTTP Bearer scheme referenced by administrative routes', () => {
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(document.paths['/customers'].get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths['/auth/register'].post?.security).toEqual([
      { bearer: [] },
    ]);
  });

  it('should leave the login operation without a Bearer requirement', () => {
    expect(document.security).toBeUndefined();
    expect(document.paths['/auth/login'].post?.security ?? []).toEqual([]);
  });

  it('should serve the Swagger UI and OpenAPI JSON without authentication', async () => {
    await request(app.getHttpServer()).get('/docs/').expect(200);
    const response = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(response.body.components.securitySchemes.bearer.scheme).toBe(
      'bearer',
    );
  });

  it('should reject requests without a token or with an invalid Bearer token', async () => {
    await request(app.getHttpServer()).get('/customers').expect(401);
    await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should accept the login token in the documented Authorization header', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'swagger@example.com', senha: 'SwaggerTestOnly123!' })
      .expect(200);
    expect(login.body.accessToken).toBe(accessToken);

    const response = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(response.body).toEqual(customers);
  });
});
