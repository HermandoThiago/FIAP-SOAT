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
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    ordemServicoStatusHistorico: { create: jest.fn() },
    ordemServicoItem: { findMany: jest.fn() },
    orcamento: { updateMany: jest.fn() },
  };
  const db = {
    ordemServico: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    ordemServicoStatusHistorico: { findMany: jest.fn() },
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

  describe('commands', () => {
    const run = (status: StatusOrdemServico) => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: status,
      });
      tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 1 });
    };

    it.each([
      ['startDiagnosis', 'RECEBIDA', 'EM_DIAGNOSTICO'],
      ['startExecution', 'AGUARDANDO_EXECUCAO', 'EM_EXECUCAO'],
      ['completeServiceOrder', 'EM_EXECUCAO', 'FINALIZADA'],
      ['deliverServiceOrder', 'FINALIZADA', 'ENTREGUE'],
    ] as const)(
      'should %s from %s to %s and record the history',
      async (method, from, to) => {
        run(from);
        tx.ordemServico.findUniqueOrThrow.mockResolvedValueOnce({
          ...stored,
          ordemServicoStatus: to,
        });

        const result = await service[method](serviceOrderId);

        expect(result.ordemServicoStatus).toBe(to);
        expect(tx.ordemServico.updateMany).toHaveBeenCalledWith({
          where: { ordemServicoId: serviceOrderId, ordemServicoStatus: from },
          data: expect.objectContaining({ ordemServicoStatus: to }) as unknown,
        });
        expect(tx.ordemServicoStatusHistorico.create).toHaveBeenCalledWith({
          data: {
            ordemServicoId: serviceOrderId,
            historicoStatusAnterior: from,
            historicoStatusNovo: to,
            usuarioId: 'attendant-id',
            historicoObservacao: undefined,
          },
        });
      },
    );

    it.each([
      ['startDiagnosis', 'EM_DIAGNOSTICO'],
      ['startExecution', 'RECEBIDA'],
      ['completeServiceOrder', 'AGUARDANDO_EXECUCAO'],
      ['deliverServiceOrder', 'EM_EXECUCAO'],
    ] as const)(
      'should throw ConflictException on %s when the order is %s',
      async (method, status) => {
        tx.ordemServico.findUnique.mockResolvedValueOnce({
          ordemServicoStatus: status,
        });

        await expect(service[method](serviceOrderId)).rejects.toThrow(
          ConflictException,
        );
        expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
        expect(tx.ordemServicoStatusHistorico.create).not.toHaveBeenCalled();
      },
    );

    it('should throw NotFoundException when the order does not exist', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce(null);

      await expect(service.startDiagnosis(serviceOrderId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when another command changed the status first', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.RECEBIDA,
      });
      tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.startDiagnosis(serviceOrderId)).rejects.toThrow(
        'alterada por outra operação',
      );
      expect(tx.ordemServicoStatusHistorico.create).not.toHaveBeenCalled();
    });
  });

  describe('sendQuote', () => {
    const readyToSend = () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.EM_DIAGNOSTICO,
      });
      tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 1 });
      tx.ordemServico.findUniqueOrThrow.mockResolvedValueOnce({
        ...stored,
        ordemServicoStatus: StatusOrdemServico.AGUARDANDO_APROVACAO,
      });
    };

    it('should mark the quote as sent and move the order to AGUARDANDO_APROVACAO', async () => {
      readyToSend();
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([
        { osItemPrecoUnitario: 3500, osItemQuantidade: '2.000' },
      ]);

      const result = await service.sendQuote(serviceOrderId);

      expect(result.ordemServicoStatus).toBe(
        StatusOrdemServico.AGUARDANDO_APROVACAO,
      );
      expect(tx.orcamento.updateMany).toHaveBeenCalledWith({
        where: { ordemServicoId: serviceOrderId },
        data: expect.objectContaining({
          orcamentoStatus: 'ENVIADO',
          orcamentoValorTotal: 7000,
        }) as unknown,
      });
      expect(tx.ordemServicoStatusHistorico.create).toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException and keep the status when there are no items', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.EM_DIAGNOSTICO,
      });
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([]);

      await expect(service.sendQuote(serviceOrderId)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
      expect(tx.ordemServicoStatusHistorico.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException before checking items when the order is not in diagnosis', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.RECEBIDA,
      });

      await expect(service.sendQuote(serviceOrderId)).rejects.toThrow(
        ConflictException,
      );
      expect(tx.ordemServicoItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('cancelServiceOrder', () => {
    it.each([
      StatusOrdemServico.RECEBIDA,
      StatusOrdemServico.EM_DIAGNOSTICO,
      StatusOrdemServico.AGUARDANDO_APROVACAO,
    ])(
      'should cancel with reason and history when the order is %s',
      async (status) => {
        tx.ordemServico.findUnique.mockResolvedValueOnce({
          ordemServicoStatus: status,
        });
        tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 1 });
        tx.ordemServico.findUniqueOrThrow.mockResolvedValueOnce({
          ...stored,
          ordemServicoStatus: StatusOrdemServico.CANCELADA,
        });

        const result = await service.cancelServiceOrder(serviceOrderId, {
          reason: 'Desistência',
        });

        expect(result.ordemServicoStatus).toBe(StatusOrdemServico.CANCELADA);
        expect(tx.ordemServico.updateMany).toHaveBeenCalledWith({
          where: { ordemServicoId: serviceOrderId, ordemServicoStatus: status },
          data: expect.objectContaining({
            ordemServicoStatus: StatusOrdemServico.CANCELADA,
            ordemServicoMotivoCancelamento: 'Desistência',
          }) as unknown,
        });
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
        expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
      },
    );

    it('should throw NotFoundException when the order does not exist', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.cancelServiceOrder(serviceOrderId, { reason: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findStatusHistory', () => {
    it('should return the history in chronological order', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce(stored);
      db.ordemServicoStatusHistorico.findMany.mockResolvedValueOnce([
        { historicoId: 'h1', historicoStatusNovo: 'RECEBIDA' },
      ]);

      const result = await service.findStatusHistory(serviceOrderId);

      expect(result).toHaveLength(1);
      expect(db.ordemServicoStatusHistorico.findMany).toHaveBeenCalledWith({
        where: { ordemServicoId: serviceOrderId },
        orderBy: [{ historicoCriadoEm: 'asc' }, { historicoId: 'asc' }],
      });
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce(null);

      await expect(service.findStatusHistory(serviceOrderId)).rejects.toThrow(
        NotFoundException,
      );
      expect(db.ordemServicoStatusHistorico.findMany).not.toHaveBeenCalled();
    });
  });
});
