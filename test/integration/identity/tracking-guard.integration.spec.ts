import { randomUUID } from 'node:crypto';

import { Controller, Get, type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { IdentityModule } from '../../../src/modules/identity/identity.module';
import { TrackingTokenService } from '../../../src/modules/identity/services/tracking-token.service';
import { TrackingPrincipal } from '../../../src/shared/auth/current-user.decorator';
import { type TrackingCredential } from '../../../src/shared/auth/principal';
import { TrackingRoute } from '../../../src/shared/auth/tracking.decorator';
import { Role } from '../../../src/shared/domain/role';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { API_BASE, bearer, loginAs, loginAsAdmin, signToken } from '../../support/auth';
import { randomEmail, randomPhone, validCpf } from '../../support/generators';
import { createTestApp, httpServer } from '../../support/test-app';
import { TEST_ADMIN_EMAIL } from '../../support/test-env';

// TrackingAuthGuard de ponta a ponta (ADR-011; PRD-005 RF-066) numa rota de sondagem registrada só neste teste:
// devolve a credencial injetada em request.tracking. IdentityModule entra no módulo raiz do teste para o guard
// resolver AuthService/TrackingTokenService, como fará o módulo service-orders ao importá-lo.
@TrackingRoute()
@Controller('tracking-probe')
class TrackingProbeController {
  @Get()
  probe(@TrackingPrincipal() credential: TrackingCredential): TrackingCredential {
    return credential;
  }
}

const PROBE = `${API_BASE}/tracking-probe`;
const SERVICE_ORDER_ID = randomUUID();

describe('TrackingAuthGuard (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [TrackingProbeController], imports: [IdentityModule] });
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { not: TEST_ADMIN_EMAIL } } });
    await prisma.customer.deleteMany({ where: { name: { startsWith: 'Cliente fictício' } } });
    await app.close();
  });

  it('should answer 200 with the TRACKING_TOKEN credential when the tracking token is valid', async () => {
    const { token } = await app.get(TrackingTokenService).issue(SERVICE_ORDER_ID);

    const response = await request(httpServer(app)).get(PROBE).set(bearer(token)).expect(200);

    expect(response.body).toEqual({ kind: 'TRACKING_TOKEN', serviceOrderId: SERVICE_ORDER_ID });
  });

  it('should answer 200 with the CUSTOMER_LOGIN credential when the token is a CUSTOMER login', async () => {
    const customerId = randomUUID();
    await prisma.customer.create({
      data: {
        id: customerId,
        customerType: 'INDIVIDUAL',
        document: validCpf(),
        name: 'Cliente fictício do acompanhamento',
        email: randomEmail(),
        phone: randomPhone(),
      },
    });
    const adminToken = await loginAsAdmin(app);
    const customerUser = { name: 'Cliente de teste', email: randomEmail(), password: 'customer-pass-1' };
    const created = await request(httpServer(app))
      .post(`${API_BASE}/users`)
      .set(bearer(adminToken))
      .send({ ...customerUser, roles: [Role.CUSTOMER], customerId })
      .expect(201);
    const customerToken = await loginAs(app, customerUser.email, customerUser.password);

    const response = await request(httpServer(app)).get(PROBE).set(bearer(customerToken)).expect(200);

    expect(response.body).toEqual({
      kind: 'CUSTOMER_LOGIN',
      userId: (created.body as { id: string }).id,
      customerId,
    });
  });

  it('should answer 403 when the token is a team JWT', async () => {
    const adminToken = await loginAsAdmin(app);

    const response = await request(httpServer(app)).get(PROBE).set(bearer(adminToken)).expect(403);

    expect(response.body).toMatchObject({
      type: 'https://oficina.local/errors/forbidden',
      status: 403,
      detail: 'Credencial de equipe não acessa o acompanhamento do cliente',
    });
  });

  it('should answer 401 when no token is sent', async () => {
    const response = await request(httpServer(app)).get(PROBE).expect(401);

    expect(response.body).toMatchObject({ status: 401, detail: 'Não autenticado' });
  });

  it('should answer 401 when the tracking token is expired', async () => {
    const expired = await signToken(app, {}, { subject: SERVICE_ORDER_ID, audience: 'tracking', expiresIn: '-1s' });

    const response = await request(httpServer(app)).get(PROBE).set(bearer(expired)).expect(401);

    expect(response.body).toMatchObject({ status: 401, detail: 'Token inválido ou expirado' });
  });

  it('should answer 401 when the token is garbage', async () => {
    await request(httpServer(app)).get(PROBE).set(bearer('garbage')).expect(401);
  });
});
