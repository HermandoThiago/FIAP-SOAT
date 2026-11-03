import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { bearer, createDb, createTestApp } from './support/app';
import {
  StaffTokens,
  createPart,
  createService,
  createServiceOrder,
  createQuoteSent,
  loginStaff,
  stockOf,
} from './support/fixtures';

describe('Controle de estoque (integração)', () => {
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
  const move = (itemId: string, body: object, token = tokens.attendant) =>
    http().post(`/itens/${itemId}/stock-movements`).set(as(token)).send(body);
  const approve = (orderId: string, trackingToken: string) =>
    http()
      .post(`/tracking/service-orders/${orderId}/quote/approve`)
      .set(as(trackingToken));
  const movementsOf = (itemId: string) =>
    db.movimentacaoEstoque.findMany({
      where: { itemEstoqueId: itemId },
      orderBy: { movimentacaoCriadaEm: 'asc' },
    });

  describe('movimentações manuais', () => {
    it('should record the initial balance as an ENTRADA when the item is created', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);

      const movements = await movementsOf(part.itemEstoqueId);

      expect(movements).toHaveLength(1);
      expect(movements[0]).toMatchObject({
        movimentacaoTipo: 'ENTRADA',
        movimentacaoMotivo: 'Saldo inicial',
        ordemServicoId: null,
      });
      expect(Number(movements[0].movimentacaoQuantidade)).toBe(10);
    });

    it('should not create a movement when the initial balance is zero', async () => {
      const part = await createPart(app, tokens.admin, 3500, 0);

      expect(await movementsOf(part.itemEstoqueId)).toHaveLength(0);
    });

    it('should add an ENTRADA and return the new balance', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);

      const res = await move(part.itemEstoqueId, {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 5.5,
        movimentacaoMotivo: 'Compra do fornecedor',
      }).expect(201);

      expect(res.body.saldo).toEqual({
        quantidade: 15.5,
        reservada: 0,
        disponivel: 15.5,
      });
      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 15.5,
        reservada: 0,
      });
    });

    it('should take a SAIDA from the balance and refuse to go beyond it', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);

      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'SAIDA',
        movimentacaoQuantidade: 4,
      }).expect(201);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'SAIDA',
        movimentacaoQuantidade: 6.001,
      }).expect(422);

      expect((await stockOf(db, part.itemEstoqueId)).quantidade).toBe(6);
    });

    it('should set the balance on an AJUSTE, keeping the direction in the reason', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);

      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'AJUSTE',
        movimentacaoQuantidade: 7,
        movimentacaoMotivo: 'Contagem de inventário',
      }).expect(201);

      const movements = await movementsOf(part.itemEstoqueId);
      const adjustment = movements[movements.length - 1];
      expect(adjustment.movimentacaoTipo).toBe('AJUSTE');
      expect(Number(adjustment.movimentacaoQuantidade)).toBe(3);
      expect(adjustment.movimentacaoMotivo).toContain('10 → 7');
      expect((await stockOf(db, part.itemEstoqueId)).quantidade).toBe(7);
    });

    it('should refuse an AJUSTE without reason, with the same balance, and a RESERVA registered by hand', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);

      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'AJUSTE',
        movimentacaoQuantidade: 7,
      }).expect(422);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'AJUSTE',
        movimentacaoQuantidade: 10,
        movimentacaoMotivo: 'igual',
      }).expect(422);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'RESERVA',
        movimentacaoQuantidade: 1,
      }).expect(400);
    });

    it('should refuse invalid quantities and unknown items', async () => {
      const part = await createPart(app, tokens.admin);

      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 0,
      }).expect(422);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: -3,
      }).expect(400);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 1.2345,
      }).expect(400);
      await move('6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11', {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 1,
      }).expect(404);
      await move('not-a-uuid', {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 1,
      }).expect(400);
    });

    it('should forbid the mechanic and the anonymous caller', async () => {
      const part = await createPart(app, tokens.admin);
      const body = { movimentacaoTipo: 'ENTRADA', movimentacaoQuantidade: 1 };

      await move(part.itemEstoqueId, body, tokens.mechanic).expect(403);
      await http()
        .post(`/itens/${part.itemEstoqueId}/stock-movements`)
        .send(body)
        .expect(401);
    });

    it('should list the history newest first, with pagination and type filter', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 1,
      }).expect(201);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'SAIDA',
        movimentacaoQuantidade: 2,
      }).expect(201);

      const all = await http()
        .get(`/itens/${part.itemEstoqueId}/stock-movements`)
        .set(as(tokens.attendant))
        .expect(200);
      expect(all.body.total).toBe(3);
      expect(
        all.body.movements.map(
          (m: { movimentacaoTipo: string }) => m.movimentacaoTipo,
        ),
      ).toEqual(['SAIDA', 'ENTRADA', 'ENTRADA']);

      const onlyExits = await http()
        .get(
          `/itens/${part.itemEstoqueId}/stock-movements?movimentacaoTipo=SAIDA&pageSize=1`,
        )
        .set(as(tokens.attendant))
        .expect(200);
      expect(onlyExits.body.total).toBe(1);
      expect(onlyExits.body.movements[0].movimentacaoQuantidade).toBe(2);

      await http()
        .get('/itens/6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11/stock-movements')
        .set(as(tokens.attendant))
        .expect(404);
    });

    it('should not let PUT /itens change the balance', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);

      await http()
        .put(`/itens/${part.itemEstoqueId}`)
        .set(as(tokens.admin))
        .send({
          itemEstoquePrecoVenda: 4000,
          itemEstoqueQuantidade: 999,
          itemEstoqueReservada: 5,
        })
        .expect(204);

      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 0,
      });
      expect(
        (
          await db.itemEstoque.findUniqueOrThrow({
            where: { itemEstoqueId: part.itemEstoqueId },
          })
        ).itemEstoquePrecoVenda,
      ).toBe(4000);
    });

    it('should enforce the stock invariants in the database as the last barrier', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);

      await expect(
        db.$executeRaw`UPDATE "ItemEstoque" SET item_estoque_reservada = 11 WHERE item_estoque_id = ${part.itemEstoqueId}::uuid`,
      ).rejects.toThrow();
      await expect(
        db.$executeRaw`UPDATE "ItemEstoque" SET item_estoque_quantidade = -1 WHERE item_estoque_id = ${part.itemEstoqueId}::uuid`,
      ).rejects.toThrow();
      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 0,
      });
    });
  });

  describe('reserva na aprovação e baixa na finalização', () => {
    it('should reserve on approval, withdraw on completion and leave a movement trail linked to the order', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);
      const { orderId, trackingToken } = await createQuoteSent(
        app,
        db,
        tokens,
        [{ itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 3 }],
      );

      // incluir/enviar não reserva nada
      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 0,
      });

      await approve(orderId, trackingToken).expect(200);
      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 3,
      });

      await http()
        .post(`/service-orders/${orderId}/start-execution`)
        .set(as(tokens.mechanic))
        .expect(200);
      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 3,
      });

      await http()
        .post(`/service-orders/${orderId}/complete`)
        .set(as(tokens.mechanic))
        .expect(200);
      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 7,
        reservada: 0,
      });

      const trail = await http()
        .get(
          `/itens/${part.itemEstoqueId}/stock-movements?ordemServicoId=${orderId}`,
        )
        .set(as(tokens.attendant))
        .expect(200);
      expect(
        trail.body.movements
          .map((m: { movimentacaoTipo: string }) => m.movimentacaoTipo)
          .reverse(),
      ).toEqual(['RESERVA', 'SAIDA']);

      // a reserva é do cliente que aprovou; a baixa, do mecânico que finalizou
      const stored = await db.movimentacaoEstoque.findMany({
        where: { ordemServicoId: orderId },
        include: { usuario: { include: { perfil: true } } },
        orderBy: { movimentacaoCriadaEm: 'asc' },
      });
      expect(stored.map((m) => m.usuario.perfil.perfilNome)).toEqual([
        'Cliente',
        'Mecanico',
      ]);
    });

    it('should not touch the stock when the quote is rejected', async () => {
      const part = await createPart(app, tokens.admin, 3500, 10);
      const { orderId, trackingToken } = await createQuoteSent(
        app,
        db,
        tokens,
        [{ itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 3 }],
      );

      await http()
        .post(`/tracking/service-orders/${orderId}/quote/reject`)
        .set(as(trackingToken))
        .send({ reason: 'Caro' })
        .expect(200);

      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 0,
      });
      expect(await movementsOf(part.itemEstoqueId)).toHaveLength(1); // só o saldo inicial
    });

    it('should reserve nothing for an order that has only services', async () => {
      const { orderId, trackingToken } = await createQuoteSentWithServiceOnly();

      await approve(orderId, trackingToken).expect(200);

      expect(
        await db.movimentacaoEstoque.count({
          where: { ordemServicoId: orderId },
        }),
      ).toBe(0);
    });

    async function createQuoteSentWithServiceOnly() {
      const service = await createService(app, tokens.admin, 9000);
      const { serviceOrder } = await createServiceOrder(app, db, tokens);
      const id = serviceOrder.ordemServicoId;
      await http()
        .post(`/service-orders/${id}/items/services`)
        .set(as(tokens.mechanic))
        .send({ servicoId: service.servicoId, osServicoQuantidade: 1 })
        .expect(201);
      await http()
        .post(`/service-orders/${id}/diagnosis`)
        .set(as(tokens.mechanic))
        .expect(200);
      const sent = await http()
        .post(`/service-orders/${id}/quote/send`)
        .set(as(tokens.mechanic))
        .expect(200);
      return { orderId: id, trackingToken: sent.body.tracking.token as string };
    }
  });

  describe('transação: falta de estoque na aprovação desfaz tudo (T10)', () => {
    it('should answer 422 and roll back the reservations already made, the quote answer and the status', async () => {
      // O bloqueio segue a ordem dos ids: a peça "ok" é reservada ANTES da "escassa" falhar.
      const [first, second] = await Promise.all([
        createPart(app, tokens.admin, 1000, 10),
        createPart(app, tokens.admin, 1000, 10),
      ]);
      const [ok, scarce] = [first, second].sort((a, b) =>
        a.itemEstoqueId.localeCompare(b.itemEstoqueId),
      );
      const { orderId, trackingToken } = await createQuoteSent(
        app,
        db,
        tokens,
        [
          { itemEstoqueId: ok.itemEstoqueId, osItemQuantidade: 2 },
          { itemEstoqueId: scarce.itemEstoqueId, osItemQuantidade: 5 },
        ],
      );

      // outra operação consome a peça escassa depois que o orçamento foi enviado
      await move(scarce.itemEstoqueId, {
        movimentacaoTipo: 'SAIDA',
        movimentacaoQuantidade: 8,
      }).expect(201);

      const res = await approve(orderId, trackingToken).expect(422);
      expect(res.body.message).toContain('Estoque insuficiente');

      // nada ficou pela metade
      expect(await stockOf(db, ok.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 0,
      });
      expect(await stockOf(db, scarce.itemEstoqueId)).toEqual({
        quantidade: 2,
        reservada: 0,
      });
      expect(
        await db.movimentacaoEstoque.count({
          where: { ordemServicoId: orderId },
        }),
      ).toBe(0);
      const order = await db.ordemServico.findUniqueOrThrow({
        where: { ordemServicoId: orderId },
      });
      expect(order.ordemServicoStatus).toBe('AGUARDANDO_APROVACAO');
      const quote = await db.orcamento.findFirstOrThrow({
        where: { ordemServicoId: orderId },
      });
      expect(quote.orcamentoStatus).toBe('ENVIADO');
      expect(quote.orcamentoRespondidoEm).toBeNull();
      expect(
        await db.ordemServicoStatusHistorico.count({
          where: {
            ordemServicoId: orderId,
            historicoStatusNovo: 'AGUARDANDO_EXECUCAO',
          },
        }),
      ).toBe(0);

      // o cliente pode tentar de novo depois que o estoque for reposto
      await move(scarce.itemEstoqueId, {
        movimentacaoTipo: 'ENTRADA',
        movimentacaoQuantidade: 10,
      }).expect(201);
      await approve(orderId, trackingToken).expect(200);
      expect(await stockOf(db, ok.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 2,
      });
      expect(await stockOf(db, scarce.itemEstoqueId)).toEqual({
        quantidade: 12,
        reservada: 5,
      });
    });

    it('should let only one of two concurrent approvals reserve the last units', async () => {
      const part = await createPart(app, tokens.admin, 1000, 10);
      const first = await createQuoteSent(app, db, tokens, [
        { itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 6 },
      ]);
      const second = await createQuoteSent(app, db, tokens, [
        { itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 6 },
      ]);

      const results = await Promise.all([
        approve(first.orderId, first.trackingToken),
        approve(second.orderId, second.trackingToken),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 422]);
      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 10,
        reservada: 6,
      });
      expect(
        await db.movimentacaoEstoque.count({
          where: {
            itemEstoqueId: part.itemEstoqueId,
            movimentacaoTipo: 'RESERVA',
          },
        }),
      ).toBe(1);
    });

    it('should keep the available quantity consistent for the next parts added to other orders', async () => {
      const part = await createPart(app, tokens.admin, 1000, 10);
      const reserved = await createQuoteSent(app, db, tokens, [
        { itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 7 },
      ]);
      await approve(reserved.orderId, reserved.trackingToken).expect(200);

      // disponível = 10 − 7 = 3: incluir 4 em outra OS passa a ser recusado
      const { serviceOrder } = await createServiceOrder(app, db, tokens);
      await http()
        .post(`/service-orders/${serviceOrder.ordemServicoId}/items/parts`)
        .set(as(tokens.mechanic))
        .send({ itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 4 })
        .expect(422);
      await http()
        .post(`/service-orders/${serviceOrder.ordemServicoId}/items/parts`)
        .set(as(tokens.mechanic))
        .send({ itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 3 })
        .expect(201);
    });

    it('should refuse a manual SAIDA or AJUSTE that would invade the reserved quantity', async () => {
      const part = await createPart(app, tokens.admin, 1000, 10);
      const sent = await createQuoteSent(app, db, tokens, [
        { itemEstoqueId: part.itemEstoqueId, osItemQuantidade: 7 },
      ]);
      await approve(sent.orderId, sent.trackingToken).expect(200);

      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'SAIDA',
        movimentacaoQuantidade: 4,
      }).expect(422);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'AJUSTE',
        movimentacaoQuantidade: 6,
        movimentacaoMotivo: 'abaixo do reservado',
      }).expect(422);
      await move(part.itemEstoqueId, {
        movimentacaoTipo: 'SAIDA',
        movimentacaoQuantidade: 3,
      }).expect(201);

      expect(await stockOf(db, part.itemEstoqueId)).toEqual({
        quantidade: 7,
        reservada: 7,
      });
    });
  });
});
