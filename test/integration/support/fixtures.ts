import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  bearer,
  createDb,
  login,
  randomCpf,
  randomPlate,
  SEED_EMAILS,
  uniqueEmail,
} from './app';

type Db = ReturnType<typeof createDb>;

export interface StaffTokens {
  admin: string;
  attendant: string;
  mechanic: string;
}

export async function loginStaff(
  app: INestApplication<App>,
): Promise<StaffTokens> {
  return {
    admin: (await login(app, SEED_EMAILS.admin)).accessToken,
    attendant: (await login(app, SEED_EMAILS.attendant)).accessToken,
    mechanic: (await login(app, SEED_EMAILS.mechanic)).accessToken,
  };
}

export const mechanicId = async (db: Db) =>
  (
    await db.usuario.findUniqueOrThrow({
      where: { usuarioEmail: SEED_EMAILS.mechanic },
    })
  ).usuarioId;

const http = (app: INestApplication<App>) => request(app.getHttpServer());

export async function createCustomer(
  app: INestApplication<App>,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await http(app)
    .post('/customers')
    .set('Authorization', bearer(token))
    .send({
      usuarioNome: 'Cliente de Teste',
      usuarioEmail: uniqueEmail('customer'),
      usuarioDocumento: randomCpf(),
      usuarioTipoDocumento: 'CPF',
      usuarioTelefone: '85999990000',
      ...overrides,
    })
    .expect(201);
  return res.body as { usuarioId: string; usuarioDocumento: string };
}

export async function createVehicle(
  app: INestApplication<App>,
  token: string,
  customerId: string,
) {
  const res = await http(app)
    .post('/vehicles')
    .set('Authorization', bearer(token))
    .send({
      usuarioId: customerId,
      veiculoPlaca: randomPlate(),
      veiculoMarca: 'Fiat',
      veiculoModelo: 'Argo',
      veiculoAnoFabricacao: 2022,
      veiculoCor: 'Prata',
    })
    .expect(201);
  return res.body as { veiculoId: string; veiculoPlaca: string };
}

export async function createService(
  app: INestApplication<App>,
  adminToken: string,
  servicoPrecoBase = 15000,
) {
  const res = await http(app)
    .post('/services')
    .set('Authorization', bearer(adminToken))
    .send({
      servicoNome: `Serviço ${randomUUID()}`,
      servicoDescricao: 'Serviço de teste',
      servicoPrecoBase,
    })
    .expect(201);
  return res.body as { servicoId: string; servicoNome: string };
}

export async function createPart(
  app: INestApplication<App>,
  token: string,
  itemEstoquePrecoVenda = 3500,
  itemEstoqueQuantidade = 10,
) {
  const res = await http(app)
    .post('/itens')
    .set('Authorization', bearer(token))
    .send({
      itemEstoqueTipo: 'PECA',
      itemEstoqueNome: `Peça ${randomUUID()}`,
      itemEstoqueUnidade: 'UN',
      itemEstoquePrecoVenda,
      itemEstoqueQuantidade,
    })
    .expect(201);
  return res.body as { itemEstoqueId: string; itemEstoqueNome: string };
}

/** Cliente + veículo novos (uma OS aberta por veículo) e a OS recém-criada. */
export async function createServiceOrder(
  app: INestApplication<App>,
  db: Db,
  tokens: StaffTokens,
) {
  const customer = await createCustomer(app, tokens.attendant);
  const vehicle = await createVehicle(
    app,
    tokens.attendant,
    customer.usuarioId,
  );
  const res = await http(app)
    .post('/service-orders')
    .set('Authorization', bearer(tokens.attendant))
    .send({
      clientId: customer.usuarioId,
      veiculoId: vehicle.veiculoId,
      mecanicoId: await mechanicId(db),
      ordemServicoDescricaoProblema: 'Barulho ao frear',
    })
    .expect(201);

  return {
    customer,
    vehicle,
    serviceOrder: res.body as {
      ordemServicoId: string;
      ordemServicoStatus: string;
    },
  };
}

/** OS com as peças informadas, diagnosticada e com o orçamento enviado (aguardando o cliente). */
export async function createQuoteSent(
  app: INestApplication<App>,
  db: Db,
  tokens: StaffTokens,
  parts: { itemEstoqueId: string; osItemQuantidade: number }[],
) {
  const { serviceOrder, customer } = await createServiceOrder(app, db, tokens);
  const id = serviceOrder.ordemServicoId;

  for (const part of parts) {
    await http(app)
      .post(`/service-orders/${id}/items/parts`)
      .set('Authorization', bearer(tokens.mechanic))
      .send(part)
      .expect(201);
  }
  await http(app)
    .post(`/service-orders/${id}/diagnosis`)
    .set('Authorization', bearer(tokens.mechanic))
    .expect(200);
  const sent = await http(app)
    .post(`/service-orders/${id}/quote/send`)
    .set('Authorization', bearer(tokens.mechanic))
    .expect(200);

  return {
    orderId: id,
    customer,
    trackingToken: (sent.body as { tracking: { token: string } }).tracking
      .token,
  };
}

/** Saldo atual do item direto no banco. */
export async function stockOf(db: Db, itemId: string) {
  const item = await db.itemEstoque.findUniqueOrThrow({
    where: { itemEstoqueId: itemId },
  });
  return {
    quantidade: Number(item.itemEstoqueQuantidade),
    reservada: Number(item.itemEstoqueReservada),
  };
}
