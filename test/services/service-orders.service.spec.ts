import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StatusOrdemServico } from '../../src/generated/prisma/enums';
import { StockService } from '../../src/modules/catalog/services';
import {
  CustomersService,
  VehiclesService,
} from '../../src/modules/customers/services';
import { RequestContext, Role } from '../../src/modules/identity/auth';
import {
  TrackingTokenService,
  UsersService,
} from '../../src/modules/identity/services';
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
    ordemServicoServico: { findMany: jest.fn() },
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
  const trackingTokenService = { issue: jest.fn() };
  const customersService = { findCustomerByDocument: jest.fn() };
  const stockService = {
    reserveForServiceOrder: jest.fn(),
    withdrawReservedForServiceOrder: jest.fn(),
  };
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
    trackingTokenService.issue.mockResolvedValue('tracking-token');
    tx.ordemServicoItem.findMany.mockResolvedValue([]);
    tx.ordemServicoServico.findMany.mockResolvedValue([]);
    stockService.reserveForServiceOrder.mockResolvedValue(undefined);
    stockService.withdrawReservedForServiceOrder.mockResolvedValue(undefined);
    db.ordemServico.findFirst.mockResolvedValue(null);
    tx.ordemServico.create.mockResolvedValue(stored);

    service = new ServiceOrdersService(
      { db } as unknown as DatabaseService,
      ctx as unknown as RequestContext,
      usersService as unknown as UsersService,
      vehiclesService as unknown as VehiclesService,
      trackingTokenService as unknown as TrackingTokenService,
      customersService as unknown as CustomersService,
      stockService as unknown as StockService,
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
    beforeEach(() => {
      tx.ordemServicoServico.findMany.mockResolvedValue([]);
    });

    it('should accept a quote that has only services', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.EM_DIAGNOSTICO,
      });
      tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 1 });
      tx.ordemServico.findUniqueOrThrow.mockResolvedValueOnce({
        ...stored,
        ordemServicoStatus: StatusOrdemServico.AGUARDANDO_APROVACAO,
      });
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([]);
      tx.ordemServicoServico.findMany.mockResolvedValueOnce([
        { osServicoPrecoUnitario: 15000, osServicoQuantidade: 1 },
      ]);

      await service.sendQuote(serviceOrderId);

      expect(tx.orcamento.updateMany).toHaveBeenCalledWith({
        where: { ordemServicoId: serviceOrderId },
        data: expect.objectContaining({
          orcamentoValorTotal: 15000,
        }) as unknown,
      });
    });

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

    it('should issue the tracking token and return the tracking link', async () => {
      readyToSend();
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([
        { osItemPrecoUnitario: 3500, osItemQuantidade: '2.000' },
      ]);

      const result = await service.sendQuote(serviceOrderId);

      expect(trackingTokenService.issue).toHaveBeenCalledWith(serviceOrderId);
      expect(result.tracking.url).toContain(
        `/tracking/service-orders/${serviceOrderId}`,
      );
      expect(result.tracking).toHaveProperty('token', 'tracking-token');
    });

    it('should not return the token in production', async () => {
      readyToSend();
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([
        { osItemPrecoUnitario: 3500, osItemQuantidade: '2.000' },
      ]);
      const env = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      try {
        const result = await service.sendQuote(serviceOrderId);
        expect(result.tracking).not.toHaveProperty('token');
      } finally {
        process.env['NODE_ENV'] = env;
      }
    });

    it('should not issue the tracking token when there are no items', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.EM_DIAGNOSTICO,
      });
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([]);

      await expect(service.sendQuote(serviceOrderId)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(trackingTokenService.issue).not.toHaveBeenCalled();
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

  describe('approveQuote / rejectQuote', () => {
    const awaiting = (to: StatusOrdemServico) => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.AGUARDANDO_APROVACAO,
      });
      tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 1 });
      tx.ordemServico.findUniqueOrThrow.mockResolvedValueOnce({
        ...stored,
        ordemServicoStatus: to,
      });
    };

    it('should approve the quote, record who answered and log history as the customer', async () => {
      awaiting(StatusOrdemServico.AGUARDANDO_EXECUCAO);

      const result = await service.approveQuote(serviceOrderId, 'customer-id');

      expect(result.ordemServicoStatus).toBe(
        StatusOrdemServico.AGUARDANDO_EXECUCAO,
      );
      expect(tx.orcamento.updateMany).toHaveBeenCalledWith({
        where: { ordemServicoId: serviceOrderId },
        data: expect.objectContaining({
          orcamentoStatus: 'APROVADO',
          orcamentoRespondidoPor: 'customer-id',
          orcamentoRespondidoEm: expect.any(Date) as unknown,
        }) as unknown,
      });
      expect(tx.ordemServicoStatusHistorico.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: 'customer-id',
          historicoStatusNovo: StatusOrdemServico.AGUARDANDO_EXECUCAO,
        }) as unknown,
      });
    });

    it('should reject the quote with the reason and move the order to ORCAMENTO_RECUSADO', async () => {
      awaiting(StatusOrdemServico.ORCAMENTO_RECUSADO);

      const result = await service.rejectQuote(
        serviceOrderId,
        'customer-id',
        'Muito caro',
      );

      expect(result.ordemServicoStatus).toBe(
        StatusOrdemServico.ORCAMENTO_RECUSADO,
      );
      expect(tx.orcamento.updateMany).toHaveBeenCalledWith({
        where: { ordemServicoId: serviceOrderId },
        data: expect.objectContaining({
          orcamentoStatus: 'REJEITADO',
          orcamentoMotivoRejeicao: 'Muito caro',
        }) as unknown,
      });
      expect(tx.ordemServicoStatusHistorico.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          historicoObservacao: 'Muito caro',
        }) as unknown,
      });
    });

    it.each(
      Object.values(StatusOrdemServico).filter(
        (status) => status !== StatusOrdemServico.AGUARDANDO_APROVACAO,
      ),
    )(
      'should throw ConflictException and keep the quote untouched when the order is %s',
      async (status) => {
        tx.ordemServico.findUnique.mockResolvedValue({
          ordemServicoStatus: status,
        });

        await expect(
          service.approveQuote(serviceOrderId, 'customer-id'),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.rejectQuote(serviceOrderId, 'customer-id'),
        ).rejects.toThrow(ConflictException);
        expect(tx.orcamento.updateMany).not.toHaveBeenCalled();
        tx.ordemServico.findUnique.mockReset();
      },
    );
  });

  describe('estoque na aprovação e na finalização (ADR-012)', () => {
    // `failsBeforeUpdate`: a transação aborta antes do UPDATE, então não enfileira o que não será lido
    // (valores `Once` não consumidos vazariam para os testes seguintes).
    const moveTo = (
      from: StatusOrdemServico,
      to: StatusOrdemServico,
      failsBeforeUpdate = false,
    ) => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: from,
      });
      if (failsBeforeUpdate) return;
      tx.ordemServico.updateMany.mockResolvedValueOnce({ count: 1 });
      tx.ordemServico.findUniqueOrThrow.mockResolvedValueOnce({
        ...stored,
        ordemServicoStatus: to,
      });
    };
    const partsOfTheOrder = () =>
      tx.ordemServicoItem.findMany.mockResolvedValueOnce([
        { itemEstoqueId: 'part-1', osItemQuantidade: '2.000' },
        { itemEstoqueId: 'part-2', osItemQuantidade: '0.500' },
      ]);

    it('should reserve the parts of the order, as the customer, when the quote is approved', async () => {
      moveTo(
        StatusOrdemServico.AGUARDANDO_APROVACAO,
        StatusOrdemServico.AGUARDANDO_EXECUCAO,
      );
      partsOfTheOrder();

      await service.approveQuote(serviceOrderId, 'customer-id');

      expect(stockService.reserveForServiceOrder).toHaveBeenCalledWith(
        tx,
        serviceOrderId,
        'customer-id',
        [
          { itemEstoqueId: 'part-1', quantidade: 2 },
          { itemEstoqueId: 'part-2', quantidade: 0.5 },
        ],
      );
    });

    it('should leave the order untouched when the reservation fails for lack of stock', async () => {
      moveTo(
        StatusOrdemServico.AGUARDANDO_APROVACAO,
        StatusOrdemServico.AGUARDANDO_EXECUCAO,
        true,
      );
      partsOfTheOrder();
      stockService.reserveForServiceOrder.mockRejectedValueOnce(
        new UnprocessableEntityException('Estoque insuficiente para Filtro'),
      );

      await expect(
        service.approveQuote(serviceOrderId, 'customer-id'),
      ).rejects.toThrow('Estoque insuficiente');

      // a falha acontece antes do UPDATE de status e do histórico (e a transação inteira é desfeita)
      expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
      expect(tx.ordemServicoStatusHistorico.create).not.toHaveBeenCalled();
    });

    it('should not touch the stock when the quote is rejected', async () => {
      moveTo(
        StatusOrdemServico.AGUARDANDO_APROVACAO,
        StatusOrdemServico.ORCAMENTO_RECUSADO,
      );

      await service.rejectQuote(serviceOrderId, 'customer-id', 'Caro');

      expect(stockService.reserveForServiceOrder).not.toHaveBeenCalled();
    });

    it('should withdraw the reserved parts, as the logged user, when the order is completed', async () => {
      moveTo(StatusOrdemServico.EM_EXECUCAO, StatusOrdemServico.FINALIZADA);
      partsOfTheOrder();

      await service.completeServiceOrder(serviceOrderId);

      expect(stockService.withdrawReservedForServiceOrder).toHaveBeenCalledWith(
        tx,
        serviceOrderId,
        'attendant-id',
        [
          { itemEstoqueId: 'part-1', quantidade: 2 },
          { itemEstoqueId: 'part-2', quantidade: 0.5 },
        ],
      );
    });

    it('should not complete the order when the withdrawal fails', async () => {
      moveTo(
        StatusOrdemServico.EM_EXECUCAO,
        StatusOrdemServico.FINALIZADA,
        true,
      );
      stockService.withdrawReservedForServiceOrder.mockRejectedValueOnce(
        new UnprocessableEntityException('inconsistente'),
      );

      await expect(
        service.completeServiceOrder(serviceOrderId),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
    });

    it('should not touch the stock when the transition is not allowed', async () => {
      tx.ordemServico.findUnique.mockResolvedValueOnce({
        ordemServicoStatus: StatusOrdemServico.AGUARDANDO_EXECUCAO,
      });

      await expect(
        service.completeServiceOrder(serviceOrderId),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        stockService.withdrawReservedForServiceOrder,
      ).not.toHaveBeenCalled();
    });
  });

  describe('createServiceOrder: cliente por CPF/CNPJ (F1)', () => {
    it('should resolve the customer by document when clientId is not informed', async () => {
      customersService.findCustomerByDocument.mockResolvedValue({
        usuarioId: 'customer-id',
      });

      await service.createServiceOrder({
        veiculoId: 'vehicle-id',
        mecanicoId: 'mechanic-id',
        customerDocument: '52998224725',
      });

      expect(customersService.findCustomerByDocument).toHaveBeenCalledWith(
        '52998224725',
      );
      expect(tx.ordemServico.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ usuarioId: 'customer-id' }) as unknown,
      });
    });

    it('should accept both when they point to the same customer', async () => {
      customersService.findCustomerByDocument.mockResolvedValue({
        usuarioId: 'customer-id',
      });

      await expect(
        service.createServiceOrder({
          ...payload,
          customerDocument: '52998224725',
        }),
      ).resolves.toBeDefined();
    });

    it('should throw 422 when clientId and the document belong to different customers', async () => {
      customersService.findCustomerByDocument.mockResolvedValue({
        usuarioId: 'someone-else',
      });

      await expect(
        service.createServiceOrder({
          ...payload,
          customerDocument: '52998224725',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(tx.ordemServico.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no customer has the document', async () => {
      customersService.findCustomerByDocument.mockRejectedValue(
        new NotFoundException('Cliente não encontrado'),
      );

      await expect(
        service.createServiceOrder({
          veiculoId: 'vehicle-id',
          mecanicoId: 'mechanic-id',
          customerDocument: '52998224725',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw 400 when neither clientId nor customerDocument is informed', async () => {
      await expect(
        service.createServiceOrder({
          veiculoId: 'vehicle-id',
          mecanicoId: 'mechanic-id',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findServiceOrderDetail (F17)', () => {
    const at = new Date('2026-11-01T10:00:00Z');
    const detailRow = {
      ...stored,
      cliente: { usuarioId: 'customer-id', usuarioNome: 'Maria' },
      mecanico: { usuarioId: 'mechanic-id', usuarioNome: 'João' },
      veiculo: {
        veiculoId: 'vehicle-id',
        veiculoPlaca: 'ABC1D23',
        veiculoMarca: 'Fiat',
        veiculoModelo: 'Argo',
      },
      historicoStatus: [
        {
          historicoStatusNovo: StatusOrdemServico.RECEBIDA,
          historicoCriadoEm: at,
        },
      ],
      orcamentos: [
        {
          orcamentoVersao: 1,
          orcamentoStatus: 'RASCUNHO',
          orcamentoEnviadoEm: null,
        },
      ],
      itens: [
        {
          osItemId: 'item-1',
          itemEstoqueId: 'part-1',
          osItemQuantidade: '2.000',
          osItemPrecoUnitario: 3500,
          itemEstoque: { itemEstoqueNome: 'Filtro de óleo' },
        },
      ],
      servicos: [
        {
          osServicoId: 'svc-1',
          servicoId: 'service-1',
          osServicoQuantidade: 1,
          osServicoPrecoUnitario: 15000,
          servico: { servicoNome: 'Troca de óleo' },
        },
      ],
    };

    it('should return the order with customer, vehicle, mechanic, quote and milestones', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce(detailRow);

      const result = await service.findServiceOrderDetail(serviceOrderId);

      expect(result.ordemServicoNumero).toBe('7');
      expect(result.cliente.usuarioNome).toBe('Maria');
      expect(result.veiculo.veiculoPlaca).toBe('ABC1D23');
      expect(result.mecanico.usuarioNome).toBe('João');
      expect(result.orcamento.orcamentoValorTotal).toBe(7000 + 15000);
      expect(result.orcamento.itens).toHaveLength(1);
      expect(result.orcamento.servicos).toHaveLength(1);
      expect(result.marcos.recebidaEm).toEqual(at);
      expect(result.marcos.entregueEm).toBeNull();
      // o histórico e os itens brutos não vazam para a resposta
      expect(result).not.toHaveProperty('historicoStatus');
      expect(result).not.toHaveProperty('itens');
    });

    it('should show an empty draft when the order has no quote yet', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce({
        ...detailRow,
        orcamentos: [],
        itens: [],
        servicos: [],
      });

      const result = await service.findServiceOrderDetail(serviceOrderId);

      expect(result.orcamento.orcamentoStatus).toBe('RASCUNHO');
      expect(result.orcamento.orcamentoValorTotal).toBe(0);
    });

    it('should scope the search to the customer when the user is a customer', async () => {
      ctx.user = { userId: 'customer-id', role: Role.CUSTOMER };
      ctx.userId = 'customer-id';
      db.ordemServico.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findServiceOrderDetail(serviceOrderId),
      ).rejects.toThrow(NotFoundException);
      expect(db.ordemServico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ordemServicoId: serviceOrderId, usuarioId: 'customer-id' },
        }),
      );
      ctx.userId = 'attendant-id';
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      db.ordemServico.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.findServiceOrderDetail(serviceOrderId),
      ).rejects.toThrow('Ordem de serviço não encontrada');
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
