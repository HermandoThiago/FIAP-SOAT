import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  PASSWORD,
  bearer,
  createDb,
  createTestApp,
  login,
  randomCpf,
  uniqueEmail,
} from './support/app';
import {
  StaffTokens,
  createCustomer,
  createPart,
  createService,
  createServiceOrder,
  createVehicle,
  loginStaff,
  mechanicId,
} from './support/fixtures';

describe('Fluxo da ordem de serviço (integração)', () => {
  let app: INestApplication<App>;
  let tokens: StaffTokens;
  const db = createDb();

  beforeAll(async () => {
    app = await createTestApp();
    tokens = await loginStaff(app);
  });

  afterAll(async () => {
    await app.close();
    await db.$disconnect();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: bearer(token) });
  const statusOf = async (id: string) =>
    (await db.ordemServico.findUniqueOrThrow({ where: { ordemServicoId: id } }))
      .ordemServicoStatus;

  describe('do recebimento à entrega, com orçamento aprovado pelo cliente', () => {
    let orderId: string;
    let serviceId: string;
    let serviceName: string;
    let trackingToken: string;
    let osServicoId: string;

    it('should create the order as RECEBIDA with a sequential number', async () => {
      const created = await createServiceOrder(app, db, tokens);
      orderId = created.serviceOrder.ordemServicoId;

      expect(created.serviceOrder.ordemServicoStatus).toBe('RECEBIDA');
      const stored = await db.ordemServico.findUniqueOrThrow({
        where: { ordemServicoId: orderId },
      });
      expect(stored.ordemServicoNumero).toBeGreaterThan(0n);
    });

    it('should add a service and a part and derive the quote from them', async () => {
      const service = await createService(app, tokens.admin, 15000);
      const part = await createPart(app, tokens.admin, 3500, 10);
      serviceId = service.servicoId;
      serviceName = service.servicoNome;

      const withService = await http()
        .post(`/service-orders/${orderId}/items/services`)
        .set(as(tokens.mechanic))
        .send({ servicoId: serviceId, osServicoQuantidade: 1 })
        .expect(201);
      expect(withService.body.orcamentoValorTotal).toBe(15000);
      osServicoId = withService.body.servicos[0].osServicoId;

      const withPart = await http()
        .post(`/service-orders/${orderId}/items/parts`)
        .set(as(tokens.mechanic))
        .send({ itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 2 })
        .expect(201);
      expect(withPart.body.orcamentoValorTotal).toBe(15000 + 7000);
      expect(withPart.body.servicos).toHaveLength(1);
      expect(withPart.body.itens).toHaveLength(1);

      const stored = await db.orcamento.findFirstOrThrow({
        where: { ordemServicoId: orderId },
      });
      expect(stored.orcamentoValorTotal).toBe(22000);
      expect(stored.orcamentoStatus).toBe('RASCUNHO');
    });

    it('should freeze the service price: a later catalog change does not alter the quote', async () => {
      await http()
        .put(`/services/${serviceId}`)
        .set(as(tokens.admin))
        .send({ servicoPrecoBase: 99999 })
        .expect(200);

      const res = await http()
        .get(`/service-orders/${orderId}/quote`)
        .set(as(tokens.attendant))
        .expect(200);

      expect(res.body.orcamentoValorTotal).toBe(22000);
    });

    it('should recalculate the quote when a service is removed and when it is added again', async () => {
      const removed = await http()
        .delete(`/service-orders/${orderId}/items/services/${osServicoId}`)
        .set(as(tokens.mechanic))
        .expect(200);
      expect(removed.body.orcamentoValorTotal).toBe(7000);

      const readded = await http()
        .post(`/service-orders/${orderId}/items/services`)
        .set(as(tokens.mechanic))
        .send({ servicoId: serviceId, osServicoQuantidade: 1 })
        .expect(201);
      // preço atual do catálogo (99999), congelado agora
      expect(readded.body.orcamentoValorTotal).toBe(7000 + 99999);

      await http()
        .put(`/services/${serviceId}`)
        .set(as(tokens.admin))
        .send({ servicoPrecoBase: 15000 })
        .expect(200);
      const again = await http()
        .delete(
          `/service-orders/${orderId}/items/services/${readded.body.servicos[0].osServicoId}`,
        )
        .set(as(tokens.mechanic))
        .expect(200);
      expect(again.body.orcamentoValorTotal).toBe(7000);
      await http()
        .post(`/service-orders/${orderId}/items/services`)
        .set(as(tokens.mechanic))
        .send({ servicoId: serviceId, osServicoQuantidade: 1 })
        .expect(201);
    });

    it('should answer 422 when the part quantity exceeds the available stock', async () => {
      const scarce = await createPart(app, tokens.admin, 1000, 1);

      await http()
        .post(`/service-orders/${orderId}/items/parts`)
        .set(as(tokens.mechanic))
        .send({ itemEstoqueId: scarce.itemEstoqueId, osItemQuantidade: 2 })
        .expect(422);
    });

    it('should answer 409 when the quote is sent before the diagnosis', async () => {
      await http()
        .post(`/service-orders/${orderId}/quote/send`)
        .set(as(tokens.mechanic))
        .expect(409);
      expect(await statusOf(orderId)).toBe('RECEBIDA');
    });

    it('should send the quote after the diagnosis and return the tracking token', async () => {
      await http()
        .post(`/service-orders/${orderId}/diagnosis`)
        .set(as(tokens.mechanic))
        .expect(200);

      const res = await http()
        .post(`/service-orders/${orderId}/quote/send`)
        .set(as(tokens.mechanic))
        .expect(200);

      expect(res.body.ordemServicoStatus).toBe('AGUARDANDO_APROVACAO');
      expect(res.body.tracking.token).toBeTruthy();
      trackingToken = res.body.tracking.token;

      const quote = await db.orcamento.findFirstOrThrow({
        where: { ordemServicoId: orderId },
      });
      expect(quote.orcamentoStatus).toBe('ENVIADO');
      expect(quote.orcamentoValorTotal).toBe(22000);
      expect(quote.orcamentoEnviadoEm).not.toBeNull();
    });

    it('should lock the items once the quote was sent', async () => {
      await http()
        .post(`/service-orders/${orderId}/items/services`)
        .set(as(tokens.mechanic))
        .send({ servicoId: serviceId, osServicoQuantidade: 1 })
        .expect(409);
    });

    it('should let the customer follow the order with the tracking token, with masked data', async () => {
      const res = await http()
        .get(`/tracking/service-orders/${orderId}`)
        .set(as(trackingToken))
        .expect(200);

      expect(res.body.status).toBe('AGUARDANDO_APROVACAO');
      expect(res.body.vehicle.licensePlate).toMatch(/\*/);
      expect(res.body.customer.document).toMatch(/\*/);
      expect(res.body.quote.totalAmount).toBe(22000);
      expect(
        res.body.quote.items.map((i: { description: string }) => i.description),
      ).toContain(serviceName);
    });

    it('should answer 403 when a staff JWT calls /tracking and 404 for another order', async () => {
      await http()
        .get(`/tracking/service-orders/${orderId}`)
        .set(as(tokens.admin))
        .expect(403);
      await http()
        .get(`/tracking/service-orders/${randomUUID()}`)
        .set(as(trackingToken))
        .expect(404);
      await http().get(`/tracking/service-orders/${orderId}`).expect(401);
    });

    it('should record the approval, change the status and answer 409 on a second approval', async () => {
      const res = await http()
        .post(`/tracking/service-orders/${orderId}/quote/approve`)
        .set(as(trackingToken))
        .expect(200);
      expect(res.body.status).toBe('AGUARDANDO_EXECUCAO');

      const quote = await db.orcamento.findFirstOrThrow({
        where: { ordemServicoId: orderId },
      });
      expect(quote.orcamentoStatus).toBe('APROVADO');
      expect(quote.orcamentoRespondidoEm).not.toBeNull();
      expect(quote.orcamentoRespondidoPor).not.toBeNull();

      await http()
        .post(`/tracking/service-orders/${orderId}/quote/approve`)
        .set(as(trackingToken))
        .expect(409);
    });

    it('should run, complete and deliver the order, enforcing the roles', async () => {
      await http()
        .post(`/service-orders/${orderId}/complete`)
        .set(as(tokens.mechanic))
        .expect(409); // ainda não está em execução

      await http()
        .post(`/service-orders/${orderId}/start-execution`)
        .set(as(tokens.attendant))
        .expect(403);
      await http()
        .post(`/service-orders/${orderId}/start-execution`)
        .set(as(tokens.mechanic))
        .expect(200);
      await http()
        .post(`/service-orders/${orderId}/complete`)
        .set(as(tokens.mechanic))
        .expect(200);
      await http()
        .post(`/service-orders/${orderId}/deliver`)
        .set(as(tokens.attendant))
        .expect(200);

      expect(await statusOf(orderId)).toBe('ENTREGUE');
    });

    it('should keep a complete, ordered status history', async () => {
      const res = await http()
        .get(`/service-orders/${orderId}/status-history`)
        .set(as(tokens.attendant))
        .expect(200);

      const statuses = (res.body as { historicoStatusNovo: string }[]).map(
        (h) => h.historicoStatusNovo,
      );
      expect(statuses).toEqual([
        'RECEBIDA',
        'EM_DIAGNOSTICO',
        'AGUARDANDO_APROVACAO',
        'AGUARDANDO_EXECUCAO',
        'EM_EXECUCAO',
        'FINALIZADA',
        'ENTREGUE',
      ]);
    });

    it('should not allow any command on a delivered order', async () => {
      await http()
        .post(`/service-orders/${orderId}/cancel`)
        .set(as(tokens.admin))
        .send({ reason: 'tarde demais' })
        .expect(409);
      await http()
        .put(`/service-orders/${orderId}`)
        .set(as(tokens.attendant))
        .send({ ordemServicoDiagnostico: 'x' })
        .expect(409);
    });

    it('should include the finished order in the average execution time, overall and by service', async () => {
      const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const res = await http()
        .get(
          `/metrics/average-execution-time?from=${from}&serviceId=${serviceId}`,
        )
        .set(as(tokens.attendant))
        .expect(200);

      expect(res.body.serviceOrderCount).toBe(1);
      expect(res.body.averageMinutes).toBeGreaterThanOrEqual(0);
      expect(res.body.byService).toEqual([
        expect.objectContaining({
          serviceId,
          name: serviceName,
          serviceOrderCount: 1,
        }),
      ]);
    });
  });

  describe('detalhamento da OS (F17)', () => {
    it('should show the customer, vehicle, mechanic, items, quote and milestones of a delivered order', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);
      const service = await createService(app, tokens.admin, 15000);
      const { orderId, trackingToken, customer } = await createFullyDelivered(
        part.itemEstoqueId,
        service.servicoId,
      );

      const res = await http()
        .get(`/service-orders/${orderId}`)
        .set(as(tokens.attendant))
        .expect(200);

      expect(res.body.ordemServicoStatus).toBe('ENTREGUE');
      expect(res.body.cliente.usuarioId).toBe(customer.usuarioId);
      expect(res.body.veiculo.veiculoPlaca).toBeTruthy();
      expect(res.body.mecanico.usuarioNome).toBeTruthy();
      expect(res.body.orcamento).toMatchObject({
        orcamentoStatus: 'APROVADO',
        orcamentoValorTotal: 15000 + 7000,
      });
      expect(res.body.orcamento.itens).toHaveLength(1);
      expect(res.body.orcamento.servicos).toHaveLength(1);
      const { marcos } = res.body;
      for (const key of [
        'recebidaEm',
        'diagnosticoIniciadoEm',
        'orcamentoEnviadoEm',
        'orcamentoRespondidoEm',
        'execucaoIniciadaEm',
        'finalizadaEm',
        'entregueEm',
        'encerradaEm',
      ]) {
        expect(marcos[key]).toBeTruthy();
      }
      expect(new Date(marcos.finalizadaEm).getTime()).toBeGreaterThanOrEqual(
        new Date(marcos.execucaoIniciadaEm).getTime(),
      );
      expect(trackingToken).toBeTruthy();
    });

    it('should show an empty draft and only the first milestone for a new order', async () => {
      const { serviceOrder } = await createServiceOrder(app, db, tokens);

      const res = await http()
        .get(`/service-orders/${serviceOrder.ordemServicoId}`)
        .set(as(tokens.mechanic))
        .expect(200);

      expect(res.body.orcamento).toMatchObject({
        orcamentoStatus: 'RASCUNHO',
        orcamentoValorTotal: 0,
        itens: [],
        servicos: [],
      });
      expect(res.body.marcos.recebidaEm).toBeTruthy();
      expect(res.body.marcos.diagnosticoIniciadoEm).toBeNull();
    });

    it('should answer 404 for an unknown order', async () => {
      await http()
        .get(`/service-orders/${randomUUID()}`)
        .set(as(tokens.attendant))
        .expect(404);
    });

    async function createFullyDelivered(partId: string, serviceId: string) {
      const created = await createServiceOrder(app, db, tokens);
      const id = created.serviceOrder.ordemServicoId;
      await http()
        .post(`/service-orders/${id}/items/services`)
        .set(as(tokens.mechanic))
        .send({ servicoId: serviceId, osServicoQuantidade: 1 })
        .expect(201);
      await http()
        .post(`/service-orders/${id}/items/parts`)
        .set(as(tokens.mechanic))
        .send({ itemEstoqueId: partId, osItemQuantidade: 2 })
        .expect(201);
      await http()
        .post(`/service-orders/${id}/diagnosis`)
        .set(as(tokens.mechanic))
        .expect(200);
      const sent = await http()
        .post(`/service-orders/${id}/quote/send`)
        .set(as(tokens.mechanic))
        .expect(200);
      const token = sent.body.tracking.token as string;
      await http()
        .post(`/tracking/service-orders/${id}/quote/approve`)
        .set(as(token))
        .expect(200);
      await http()
        .post(`/service-orders/${id}/start-execution`)
        .set(as(tokens.mechanic))
        .expect(200);
      await http()
        .post(`/service-orders/${id}/complete`)
        .set(as(tokens.mechanic))
        .expect(200);
      await http()
        .post(`/service-orders/${id}/deliver`)
        .set(as(tokens.attendant))
        .expect(200);
      return { orderId: id, trackingToken: token, customer: created.customer };
    }
  });

  describe('abertura da OS pelo CPF/CNPJ do cliente (F1)', () => {
    it('should open the order identifying the customer by the document, with or without punctuation', async () => {
      const customer = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        customer.usuarioId,
      );
      const d = customer.usuarioDocumento;
      const punctuated = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;

      const res = await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({
          customerDocument: punctuated,
          veiculoId: vehicle.veiculoId,
          mecanicoId: await mechanicId(db),
        })
        .expect(201);

      expect(res.body.usuarioId).toBe(customer.usuarioId);
    });

    it('should answer 404 when no customer has the document and 400 when it is invalid or missing', async () => {
      const customer = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        customer.usuarioId,
      );
      const base = {
        veiculoId: vehicle.veiculoId,
        mecanicoId: await mechanicId(db),
      };

      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({ ...base, customerDocument: randomCpf() })
        .expect(404);
      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({ ...base, customerDocument: '52998224724' })
        .expect(400);
      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send(base)
        .expect(400);
    });

    it('should answer 422 when clientId and the document belong to different customers', async () => {
      const owner = await createCustomer(app, tokens.attendant);
      const other = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        owner.usuarioId,
      );

      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({
          clientId: owner.usuarioId,
          customerDocument: other.usuarioDocumento,
          veiculoId: vehicle.veiculoId,
          mecanicoId: await mechanicId(db),
        })
        .expect(422);
    });

    it('should not find an inactive customer by document', async () => {
      const customer = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        customer.usuarioId,
      );
      await http()
        .delete(`/customers/${customer.usuarioId}`)
        .set(as(tokens.admin))
        .expect(204);

      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({
          customerDocument: customer.usuarioDocumento,
          veiculoId: vehicle.veiculoId,
          mecanicoId: await mechanicId(db),
        })
        .expect(404);
    });
  });

  describe('rejeição do orçamento', () => {
    it('should end the order as ORCAMENTO_RECUSADO with the reason and refuse further changes', async () => {
      const { serviceOrder } = await createServiceOrder(app, db, tokens);
      const id = serviceOrder.ordemServicoId;
      const part = await createPart(app, tokens.admin);

      await http()
        .post(`/service-orders/${id}/items/parts`)
        .set(as(tokens.mechanic))
        .send({ itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 1 })
        .expect(201);
      await http()
        .post(`/service-orders/${id}/diagnosis`)
        .set(as(tokens.mechanic))
        .expect(200);
      const sent = await http()
        .post(`/service-orders/${id}/quote/send`)
        .set(as(tokens.mechanic))
        .expect(200);

      const res = await http()
        .post(`/tracking/service-orders/${id}/quote/reject`)
        .set(as(sent.body.tracking.token))
        .send({ reason: 'Muito caro' })
        .expect(200);
      expect(res.body.status).toBe('ORCAMENTO_RECUSADO');

      const quote = await db.orcamento.findFirstOrThrow({
        where: { ordemServicoId: id },
      });
      expect(quote.orcamentoStatus).toBe('REJEITADO');
      expect(quote.orcamentoMotivoRejeicao).toBe('Muito caro');

      await http()
        .post(`/service-orders/${id}/cancel`)
        .set(as(tokens.admin))
        .send({ reason: 'x' })
        .expect(409);
    });
  });

  describe('transação: falha no envio não deixa estado parcial', () => {
    it('should keep the order in EM_DIAGNOSTICO and the quote unsent when the quote has no items', async () => {
      const { serviceOrder } = await createServiceOrder(app, db, tokens);
      const id = serviceOrder.ordemServicoId;
      await http()
        .post(`/service-orders/${id}/diagnosis`)
        .set(as(tokens.mechanic))
        .expect(200);

      await http()
        .post(`/service-orders/${id}/quote/send`)
        .set(as(tokens.mechanic))
        .expect(422);

      expect(await statusOf(id)).toBe('EM_DIAGNOSTICO');
      const history = await db.ordemServicoStatusHistorico.findMany({
        where: { ordemServicoId: id },
      });
      expect(history.map((h) => h.historicoStatusNovo)).toEqual([
        'RECEBIDA',
        'EM_DIAGNOSTICO',
      ]);
      expect(
        await db.orcamento.count({
          where: { ordemServicoId: id, orcamentoStatus: 'ENVIADO' },
        }),
      ).toBe(0);
    });

    it('should let only one of two concurrent transitions win', async () => {
      const { serviceOrder } = await createServiceOrder(app, db, tokens);
      const id = serviceOrder.ordemServicoId;

      const results = await Promise.all([
        http().post(`/service-orders/${id}/diagnosis`).set(as(tokens.mechanic)),
        http().post(`/service-orders/${id}/diagnosis`).set(as(tokens.mechanic)),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const history = await db.ordemServicoStatusHistorico.count({
        where: { ordemServicoId: id, historicoStatusNovo: 'EM_DIAGNOSTICO' },
      });
      expect(history).toBe(1);
    });
  });

  describe('regras de criação e cancelamento', () => {
    it('should answer 409 when the vehicle already has an open order', async () => {
      const { customer, vehicle } = await createServiceOrder(app, db, tokens);

      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({
          clientId: customer.usuarioId,
          veiculoId: vehicle.veiculoId,
          mecanicoId: await mechanicId(db),
        })
        .expect(409);
    });

    it('should answer 409 when the vehicle belongs to another customer', async () => {
      const owner = await createCustomer(app, tokens.attendant);
      const other = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        owner.usuarioId,
      );

      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({
          clientId: other.usuarioId,
          veiculoId: vehicle.veiculoId,
          mecanicoId: await mechanicId(db),
        })
        .expect(409);
    });

    it('should answer 422 when the responsible is not a mechanic', async () => {
      const customer = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        customer.usuarioId,
      );
      const attendant = await db.usuario.findUniqueOrThrow({
        where: { usuarioEmail: 'atendente@oficina.local' },
      });

      await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({
          clientId: customer.usuarioId,
          veiculoId: vehicle.veiculoId,
          mecanicoId: attendant.usuarioId,
        })
        .expect(422);
    });

    it('should let only the admin cancel, and only before the approval', async () => {
      const { serviceOrder } = await createServiceOrder(app, db, tokens);
      const id = serviceOrder.ordemServicoId;

      await http()
        .post(`/service-orders/${id}/cancel`)
        .set(as(tokens.attendant))
        .send({ reason: 'x' })
        .expect(403);
      await http()
        .post(`/service-orders/${id}/cancel`)
        .set(as(tokens.admin))
        .send({ reason: 'Cliente desistiu' })
        .expect(200);

      expect(await statusOf(id)).toBe('CANCELADA');
      await http()
        .post(`/service-orders/${id}/diagnosis`)
        .set(as(tokens.mechanic))
        .expect(409);
    });

    it('should block the customer deletion while there are open orders', async () => {
      const { customer } = await createServiceOrder(app, db, tokens);

      await http()
        .delete(`/customers/${customer.usuarioId}`)
        .set(as(tokens.admin))
        .expect(409);
      expect(
        (
          await db.usuario.findUniqueOrThrow({
            where: { usuarioId: customer.usuarioId },
          })
        ).usuarioAtivo,
      ).toBe(true);
    });

    it('should list the orders filtered by status and by customer', async () => {
      const { customer, serviceOrder } = await createServiceOrder(
        app,
        db,
        tokens,
      );

      const res = await http()
        .get(`/service-orders?clientId=${customer.usuarioId}&status=RECEBIDA`)
        .set(as(tokens.attendant))
        .expect(200);

      expect(res.body.total).toBe(1);
      const first = res.body.serviceOrders?.[0] ?? res.body.items?.[0];
      expect(first.ordemServicoId).toBe(serviceOrder.ordemServicoId);
    });
  });

  describe('acompanhamento pelo login do cliente (ADR-011)', () => {
    it('should show the customer only the own orders; another customer order answers 404', async () => {
      const perfil = await db.perfil.findUniqueOrThrow({
        where: { perfilNome: 'Cliente' },
      });
      const email = uniqueEmail('login-customer');
      const admin = await login(app, 'admin@oficina.local');

      // cliente com senha, dono da OS
      const registered = await http()
        .post('/auth/register')
        .set(as(admin.accessToken))
        .send({
          usuarioNome: 'Cliente com Login',
          usuarioEmail: email,
          usuarioDocumento: randomCpf(),
          usuarioTipoDocumento: 'CPF',
          senha: PASSWORD,
          perfilId: perfil.perfilId,
        })
        .expect(201);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        registered.body.usuarioId,
      );
      const own = await http()
        .post('/service-orders')
        .set(as(tokens.attendant))
        .send({
          clientId: registered.body.usuarioId,
          veiculoId: vehicle.veiculoId,
          mecanicoId: await mechanicId(db),
        })
        .expect(201);
      const alien = await createServiceOrder(app, db, tokens);

      const { accessToken } = await login(app, email);

      await http()
        .get(`/tracking/service-orders/${own.body.ordemServicoId}`)
        .set(as(accessToken))
        .expect(200);
      await http()
        .get(`/tracking/service-orders/${alien.serviceOrder.ordemServicoId}`)
        .set(as(accessToken))
        .expect(404);
    });
  });
});
