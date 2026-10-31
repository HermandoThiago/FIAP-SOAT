import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StatusOrdemServico } from '../../src/generated/prisma/enums';
import { VehiclesService } from '../../src/modules/customers/services';
import { RequestContext, Role } from '../../src/modules/identity/auth';
import { UsersService } from '../../src/modules/identity/services';
import { ServiceOrdersService } from '../../src/modules/service-orders/services';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('ServiceOrdersService', () => {
  const serviceOrderId = 'order-id';
  const stored = {
    ordemServicoId: serviceOrderId,
    ordemServicoNumero: 7n,
    usuarioId: 'customer-id',
    veiculoId: 'vehicle-id',
    atendenteId: 'attendant-id',
    mecanicoId: 'mechanic-id',
    ordemServicoStatus: StatusOrdemServico.RECEBIDA,
    ordemServicoDescricaoProblema: 'Barulho ao frear',
    ordemServicoDiagnostico: null,
    ordemServicoKmEntrada: 1000,
    ordemServicoMotivoCancelamento: null,
    ordemServicoCriadaEm: new Date(),
    ordemServicoAtualizadaEm: new Date(),
  };
  const payload = {
    clientId: 'customer-id',
    veiculoId: 'vehicle-id',
    mecanicoId: 'mechanic-id',
    ordemServicoDescricaoProblema: 'Barulho ao frear',
    ordemServicoKmEntrada: 1000,
  };

  const tx = {
    ordemServico: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ordemServicoStatusHistorico: { create: jest.fn() },
  };
  const db = {
    ordemServico: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const usersService = { findUserById: jest.fn() };
  const vehiclesService = { findVehicleById: jest.fn() };
  const ctx: { user?: { userId: string; role: Role }; userId: string } = {
    userId: 'attendant-id',
  };
  let service: ServiceOrdersService;

  const userWithRole = (role: Role) => ({ perfil: { perfilNome: role } });

  beforeEach(() => {
    jest.clearAllMocks();
    ctx.user = { userId: 'attendant-id', role: Role.ATTENDANT };
    usersService.findUserById.mockImplementation((id: string) =>
      Promise.resolve(
        userWithRole(id === 'mechanic-id' ? Role.MECHANIC : Role.CUSTOMER),
      ),
    );
    vehiclesService.findVehicleById.mockResolvedValue({
      veiculoId: 'vehicle-id',
      usuarioId: 'customer-id',
    });
    db.ordemServico.findFirst.mockResolvedValue(null);
    tx.ordemServico.create.mockResolvedValue(stored);

    service = new ServiceOrdersService(
      { db } as unknown as DatabaseService,
      ctx as unknown as RequestContext,
      usersService as unknown as UsersService,
      vehiclesService as unknown as VehiclesService,
    );
  });

  describe('createServiceOrder', () => {
    it('should create the order with RECEBIDA history and a string number when data is valid', async () => {
      const result = await service.createServiceOrder(payload);

      expect(tx.ordemServico.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: 'customer-id',
          atendenteId: 'attendant-id',
          mecanicoId: 'mechanic-id',
        }) as unknown,
      });
      expect(tx.ordemServicoStatusHistorico.create).toHaveBeenCalledWith({
        data: {
          ordemServicoId: serviceOrderId,
          historicoStatusNovo: StatusOrdemServico.RECEBIDA,
          usuarioId: 'attendant-id',
        },
      });
      expect(result.ordemServicoNumero).toBe('7');
    });

    it('should throw NotFoundException when the customer does not exist', async () => {
      usersService.findUserById.mockRejectedValueOnce(new NotFoundException());

      await expect(service.createServiceOrder(payload)).rejects.toThrow(
        'Cliente não encontrado',
      );
    });

    it('should throw UnprocessableEntityException when the customer has another profile', async () => {
      usersService.findUserById.mockResolvedValueOnce(
        userWithRole(Role.ATTENDANT),
      );

      await expect(service.createServiceOrder(payload)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw UnprocessableEntityException when the mechanic has another profile', async () => {
      usersService.findUserById.mockImplementation(() =>
        Promise.resolve(userWithRole(Role.CUSTOMER)),
      );
      usersService.findUserById.mockResolvedValueOnce(
        userWithRole(Role.CUSTOMER),
      );

      await expect(service.createServiceOrder(payload)).rejects.toThrow(
        'O responsável pela OS deve ter o perfil Mecânico',
      );
    });

    it('should throw ConflictException when the vehicle belongs to another customer', async () => {
      vehiclesService.findVehicleById.mockResolvedValueOnce({
        usuarioId: 'other-customer',
      });

      await expect(service.createServiceOrder(payload)).rejects.toThrow(
        'O veículo não pertence ao cliente',
      );
    });

    it('should throw ConflictException when the vehicle has an open order', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce({ ordemServicoId: 'x' });

      await expect(service.createServiceOrder(payload)).rejects.toThrow(
        ConflictException,
      );
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findServiceOrderById', () => {
    it('should return the order when it exists', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce(stored);

      const result = await service.findServiceOrderById(serviceOrderId);

      expect(result.ordemServicoId).toBe(serviceOrderId);
      expect(db.ordemServico.findFirst).toHaveBeenCalledWith({
        where: { ordemServicoId: serviceOrderId },
      });
    });

    it('should scope the search to the customer when the user is a customer', async () => {
      ctx.user = { userId: 'customer-id', role: Role.CUSTOMER };
      ctx.userId = 'customer-id';
      db.ordemServico.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findServiceOrderById(serviceOrderId),
      ).rejects.toThrow(NotFoundException);
      expect(db.ordemServico.findFirst).toHaveBeenCalledWith({
        where: { ordemServicoId: serviceOrderId, usuarioId: 'customer-id' },
      });
      ctx.userId = 'attendant-id';
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findServiceOrderById(serviceOrderId),
      ).rejects.toThrow('Ordem de serviço não encontrada');
    });
  });

  describe('findAll', () => {
    it('should apply filters and paginate when a query is given', async () => {
      const from = new Date('2026-01-01');
      db.ordemServico.findMany.mockResolvedValueOnce([stored]);
      db.ordemServico.count.mockResolvedValueOnce(21);

      const result = await service.findAll({
        page: 2,
        pageSize: 10,
        status: StatusOrdemServico.RECEBIDA,
        clientId: 'customer-id',
        veiculoId: 'vehicle-id',
        from,
      });

      expect(db.ordemServico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ordemServicoStatus: StatusOrdemServico.RECEBIDA,
            usuarioId: 'customer-id',
            veiculoId: 'vehicle-id',
            ordemServicoCriadaEm: { gte: from },
          },
          take: 10,
          skip: 10,
        }) as unknown,
      );
      expect(result).toMatchObject({ total: 21, page: 2, pageSize: 10 });
      expect(result.serviceOrders).toHaveLength(1);
    });

    it('should use an empty filter when no filter is given', async () => {
      db.ordemServico.findMany.mockResolvedValueOnce([]);
      db.ordemServico.count.mockResolvedValueOnce(0);

      await service.findAll({ page: 1, pageSize: 20 });

      expect(db.ordemServico.count).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('updateServiceOrder', () => {
    beforeEach(() => {
      db.ordemServico.findFirst.mockResolvedValue(stored);
      db.ordemServico.update.mockResolvedValue({
        ...stored,
        ordemServicoDiagnostico: 'Pastilha gasta',
      });
    });

    it('should update the descriptive fields when the order is open', async () => {
      const result = await service.updateServiceOrder(serviceOrderId, {
        ordemServicoDiagnostico: 'Pastilha gasta',
      });

      expect(result.ordemServicoDiagnostico).toBe('Pastilha gasta');
      expect(usersService.findUserById).not.toHaveBeenCalled();
    });

    it.each([
      StatusOrdemServico.ENTREGUE,
      StatusOrdemServico.CANCELADA,
      StatusOrdemServico.ORCAMENTO_RECUSADO,
    ])(
      'should throw ConflictException when the order is %s',
      async (status) => {
        db.ordemServico.findFirst.mockResolvedValue({
          ...stored,
          ordemServicoStatus: status,
        });

        await expect(
          service.updateServiceOrder(serviceOrderId, {}),
        ).rejects.toThrow(ConflictException);
        expect(db.ordemServico.update).not.toHaveBeenCalled();
      },
    );

    it('should validate the new mechanic when it changes', async () => {
      usersService.findUserById.mockResolvedValueOnce(
        userWithRole(Role.CUSTOMER),
      );

      await expect(
        service.updateServiceOrder(serviceOrderId, { mecanicoId: 'other' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('cancelServiceOrder', () => {
    it.each([
      StatusOrdemServico.RECEBIDA,
      StatusOrdemServico.EM_DIAGNOSTICO,
      StatusOrdemServico.AGUARDANDO_APROVACAO,
    ])(
      'should cancel and record history when the order is %s',
      async (status) => {
        tx.ordemServico.findUnique.mockResolvedValueOnce({
          ordemServicoStatus: status,
        });
        tx.ordemServico.update.mockResolvedValueOnce({
          ...stored,
          ordemServicoStatus: StatusOrdemServico.CANCELADA,
        });

        const result = await service.cancelServiceOrder(serviceOrderId, {
          reason: 'Desistência',
        });

        expect(result.ordemServicoStatus).toBe(StatusOrdemServico.CANCELADA);
        expect(tx.ordemServicoStatusHistorico.create).toHaveBeenCalledWith({
          data: {
            ordemServicoId: serviceOrderId,
            historicoStatusAnterior: status,
            historicoStatusNovo: StatusOrdemServico.CANCELADA,
            usuarioId: 'attendant-id',
            historicoObservacao: 'Desistência',
          },
        });
      },
    );

    it.each([
      StatusOrdemServico.AGUARDANDO_EXECUCAO,
      StatusOrdemServico.EM_EXECUCAO,
      StatusOrdemServico.FINALIZADA,
      StatusOrdemServico.ENTREGUE,
      StatusOrdemServico.ORCAMENTO_RECUSADO,
      StatusOrdemServico.CANCELADA,
    ])(
      'should throw ConflictException when the order is %s',
      async (status) => {
        tx.ordemServico.findUnique.mockResolvedValueOnce({
          ordemServicoStatus: status,
        });

        await expect(
          service.cancelServiceOrder(serviceOrderId, { reason: 'x' }),
        ).rejects.toThrow(ConflictException);
        expect(tx.ordemServico.update).not.toHaveBeenCalled();
      },
    );

    it('should throw NotFoundException when the order does not exist', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.cancelServiceOrder(serviceOrderId, { reason: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
