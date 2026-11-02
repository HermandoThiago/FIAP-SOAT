import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  bearer,
  createDb,
  createTestApp,
  randomCpf,
  randomPlate,
  uniqueEmail,
} from './support/app';
import {
  StaffTokens,
  createCustomer,
  createPart,
  createService,
  createVehicle,
  loginStaff,
} from './support/fixtures';

describe('Cadastros: clientes, veículos, serviços e peças (integração)', () => {
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

  describe('/customers', () => {
    it('should create the customer with the Cliente profile and no password', async () => {
      const customer = await createCustomer(app, tokens.attendant);

      const stored = await db.usuario.findUniqueOrThrow({
        where: { usuarioId: customer.usuarioId },
        include: { perfil: true, senha: true },
      });
      expect(stored.perfil.perfilNome).toBe('Cliente');
      expect(stored.senha).toBeNull();
    });

    it('should answer 409 when the document or the e-mail is already registered', async () => {
      const first = await createCustomer(app, tokens.attendant);

      await http()
        .post('/customers')
        .set(as(tokens.attendant))
        .send({
          usuarioNome: 'Outro',
          usuarioEmail: uniqueEmail(),
          usuarioDocumento: first.usuarioDocumento,
          usuarioTipoDocumento: 'CPF',
        })
        .expect(409);
      await http()
        .post('/customers')
        .set(as(tokens.attendant))
        .send({
          usuarioNome: 'Outro',
          usuarioEmail: 'cliente@oficina.local',
          usuarioDocumento: randomCpf(),
          usuarioTipoDocumento: 'CPF',
        })
        .expect(409);
    });

    it('should answer 400 when the CPF has invalid check digits', async () => {
      await http()
        .post('/customers')
        .set(as(tokens.attendant))
        .send({
          usuarioNome: 'CPF Inválido',
          usuarioEmail: uniqueEmail(),
          usuarioDocumento: '52998224724',
          usuarioTipoDocumento: 'CPF',
        })
        .expect(400);
    });

    it('should find the customer by document and by id', async () => {
      const customer = await createCustomer(app, tokens.attendant);

      const list = await http()
        .get(`/customers?usuarioDocumento=${customer.usuarioDocumento}`)
        .set(as(tokens.mechanic))
        .expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.customers[0].usuarioId).toBe(customer.usuarioId);

      await http()
        .get(`/customers/${customer.usuarioId}`)
        .set(as(tokens.mechanic))
        .expect(200);
    });

    it('should never list staff users as customers', async () => {
      const staff = await db.usuario.findUniqueOrThrow({
        where: { usuarioEmail: 'admin@oficina.local' },
      });

      await http()
        .get(`/customers/${staff.usuarioId}`)
        .set(as(tokens.admin))
        .expect(404);
    });

    it('should update name and phone but keep the document', async () => {
      const customer = await createCustomer(app, tokens.attendant);

      await http()
        .put(`/customers/${customer.usuarioId}`)
        .set(as(tokens.attendant))
        .send({ usuarioNome: 'Nome Novo', usuarioDocumento: randomCpf() })
        .expect(200);

      const stored = await db.usuario.findUniqueOrThrow({
        where: { usuarioId: customer.usuarioId },
      });
      expect(stored.usuarioNome).toBe('Nome Novo');
      expect(stored.usuarioDocumento).toBe(customer.usuarioDocumento);
    });

    it('should list the vehicles of the customer', async () => {
      const customer = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        customer.usuarioId,
      );

      const res = await http()
        .get(`/customers/${customer.usuarioId}/vehicles`)
        .set(as(tokens.mechanic))
        .expect(200);

      expect(
        res.body.vehicles.map((v: { veiculoId: string }) => v.veiculoId),
      ).toEqual([vehicle.veiculoId]);
    });

    it('should forbid the attendant from deleting and the mechanic from creating', async () => {
      const customer = await createCustomer(app, tokens.attendant);

      await http()
        .delete(`/customers/${customer.usuarioId}`)
        .set(as(tokens.attendant))
        .expect(403);
      await http()
        .post('/customers')
        .set(as(tokens.mechanic))
        .send({})
        .expect(403);
    });

    it('should soft delete the customer and keep the row in the database', async () => {
      const customer = await createCustomer(app, tokens.attendant);

      await http()
        .delete(`/customers/${customer.usuarioId}`)
        .set(as(tokens.admin))
        .expect(204);
      await http()
        .get(`/customers/${customer.usuarioId}`)
        .set(as(tokens.admin))
        .expect(404);

      const stored = await db.usuario.findUniqueOrThrow({
        where: { usuarioId: customer.usuarioId },
      });
      expect(stored.usuarioAtivo).toBe(false);
      expect(stored.usuarioInativadoEm).not.toBeNull();
    });
  });

  describe('/vehicles', () => {
    it('should create, read, update and delete a vehicle', async () => {
      const customer = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        customer.usuarioId,
      );

      await http()
        .get(`/vehicles/${vehicle.veiculoId}`)
        .set(as(tokens.mechanic))
        .expect(200);
      await http()
        .patch(`/vehicles/${vehicle.veiculoId}`)
        .set(as(tokens.attendant))
        .send({ veiculoCor: 'Preto' })
        .expect(200);
      expect(
        (
          await db.veiculo.findUniqueOrThrow({
            where: { veiculoId: vehicle.veiculoId },
          })
        ).veiculoCor,
      ).toBe('Preto');

      await http()
        .delete(`/vehicles/${vehicle.veiculoId}`)
        .set(as(tokens.admin))
        .expect(204);
      await http()
        .get(`/vehicles/${vehicle.veiculoId}`)
        .set(as(tokens.admin))
        .expect(404);
    });

    it('should answer 409 when the plate is already registered and 400 when it is invalid', async () => {
      const customer = await createCustomer(app, tokens.attendant);
      const vehicle = await createVehicle(
        app,
        tokens.attendant,
        customer.usuarioId,
      );
      const body = {
        usuarioId: customer.usuarioId,
        veiculoMarca: 'Fiat',
        veiculoModelo: 'Uno',
        veiculoAnoFabricacao: 2020,
        veiculoCor: 'Azul',
      };

      await http()
        .post('/vehicles')
        .set(as(tokens.attendant))
        .send({ ...body, veiculoPlaca: vehicle.veiculoPlaca })
        .expect(409);
      await http()
        .post('/vehicles')
        .set(as(tokens.attendant))
        .send({ ...body, veiculoPlaca: 'AB12345' })
        .expect(400);
      await http()
        .post('/vehicles')
        .set(as(tokens.attendant))
        .send({
          ...body,
          veiculoPlaca: randomPlate(),
          usuarioId: '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11',
        })
        .expect(404);
    });

    it('should answer 422 when the owner is not a customer', async () => {
      const staff = await db.usuario.findUniqueOrThrow({
        where: { usuarioEmail: 'mecanico@oficina.local' },
      });

      await http()
        .post('/vehicles')
        .set(as(tokens.attendant))
        .send({
          usuarioId: staff.usuarioId,
          veiculoPlaca: randomPlate(),
          veiculoMarca: 'Fiat',
          veiculoModelo: 'Uno',
          veiculoAnoFabricacao: 2020,
          veiculoCor: 'Azul',
        })
        .expect(422);
    });
  });

  describe('/services', () => {
    it('should create, list, update and soft delete a service', async () => {
      const service = await createService(app, tokens.admin, 8000);

      const list = await http()
        .get(`/services?servicoNome=${encodeURIComponent(service.servicoNome)}`)
        .set(as(tokens.mechanic))
        .expect(200);
      expect(list.body.total).toBe(1);

      await http()
        .put(`/services/${service.servicoId}`)
        .set(as(tokens.admin))
        .send({ servicoPrecoBase: 9000 })
        .expect(200);
      expect(
        (
          await db.servico.findUniqueOrThrow({
            where: { servicoId: service.servicoId },
          })
        ).servicoPrecoBase,
      ).toBe(9000);

      await http()
        .delete(`/services/${service.servicoId}`)
        .set(as(tokens.admin))
        .expect(204);
      await http()
        .get(`/services/${service.servicoId}`)
        .set(as(tokens.admin))
        .expect(404);
      expect(
        (
          await db.servico.findUniqueOrThrow({
            where: { servicoId: service.servicoId },
          })
        ).servicoAtivo,
      ).toBe(false);
    });

    it('should answer 409 when the name is already used and 403 when the role cannot write', async () => {
      const service = await createService(app, tokens.admin);

      await http()
        .post('/services')
        .set(as(tokens.admin))
        .send({
          servicoNome: service.servicoNome.toUpperCase(),
          servicoPrecoBase: 100,
        })
        .expect(409);
      await http()
        .post('/services')
        .set(as(tokens.attendant))
        .send({ servicoNome: 'Qualquer', servicoPrecoBase: 100 })
        .expect(403);
    });

    it('should answer 400 when the price is not an integer number of cents', async () => {
      await http()
        .post('/services')
        .set(as(tokens.admin))
        .send({ servicoNome: 'Preço quebrado', servicoPrecoBase: 10.5 })
        .expect(400);
    });
  });

  describe('/itens (peças e insumos)', () => {
    it('should create the part with a generated code and read it back', async () => {
      const part = await createPart(app, tokens.attendant, 4200, 5);

      const res = await http()
        .get(`/itens/${part.itemEstoqueId}`)
        .set(as(tokens.attendant))
        .expect(200);

      expect(res.body.itemEstoquePrecoVenda).toBe(4200);
      expect(res.body.itemEstoqueCodigo).toBeTruthy();
    });

    it('should list the parts with pagination', async () => {
      await createPart(app, tokens.attendant);

      const res = await http()
        .get('/itens?page=1&pageSize=5')
        .set(as(tokens.attendant))
        .expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });

    it('should deactivate the part and keep it in the database', async () => {
      const part = await createPart(app, tokens.attendant);

      await http()
        .delete(`/itens/${part.itemEstoqueId}`)
        .set(as(tokens.admin))
        .expect(200); // o DELETE de itens responde 200 hoje (os demais CRUDs, 204)

      expect(
        (
          await db.itemEstoque.findUniqueOrThrow({
            where: { itemEstoqueId: part.itemEstoqueId },
          })
        ).itemEstoqueAtivo,
      ).toBe(false);
    });

    it('should answer 403 when the mechanic manages the stock', async () => {
      await http().get('/itens').set(as(tokens.mechanic)).expect(403);
    });
  });
});
