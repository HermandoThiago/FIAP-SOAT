import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../../../generated/prisma/client';
import {
  StatusOrcamento,
  StatusOrdemServico,
} from '../../../generated/prisma/enums';
import { DatabaseService } from '../../../shared/database/database.service';
import { StockService } from '../../catalog/services';
import { CustomersService, VehiclesService } from '../../customers/services';
import { RequestContext, Role } from '../../identity/auth';
import { TrackingTokenService, UsersService } from '../../identity/services';
import {
  CancelServiceOrderDto,
  CreateServiceOrderDto,
  ListServiceOrdersQueryDto,
  UpdateServiceOrderDto,
} from '../controllers/dtos';
import { ServiceOrder, StatusHistoryEntry } from '../domain/entities';
import { buildMilestones } from '../domain/milestones';
import { buildQuote, calculateQuoteTotal } from '../domain/quote';
import {
  ServiceOrderCommand,
  StatusTransitionPolicy,
  TERMINAL_STATUSES,
} from '../domain/policies';

const TRACKING_BASE_URL =
  process.env['TRACKING_BASE_URL'] ?? 'http://localhost:3001';

@Injectable()
export class ServiceOrdersService {
  private logger = new Logger(ServiceOrdersService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
    private readonly usersService: UsersService,
    private readonly vehiclesService: VehiclesService,
    private readonly trackingTokenService: TrackingTokenService,
    private readonly customersService: CustomersService,
    private readonly stockService: StockService,
  ) {
    this.orm = this.prisma.db;
  }

  async createServiceOrder(payload: CreateServiceOrderDto) {
    const attendantId = this.ctx.userId;

    const clientId = await this.resolveClientId(payload);
    await this.ensureUserWithRole(
      payload.mecanicoId,
      Role.MECHANIC,
      'Mecânico não encontrado',
      'O responsável pela OS deve ter o perfil Mecânico',
    );

    const vehicle = await this.vehiclesService.findVehicleById(
      payload.veiculoId,
    );
    if (vehicle.usuarioId !== clientId) {
      throw new ConflictException('O veículo não pertence ao cliente');
    }

    const open = await this.orm.ordemServico.findFirst({
      where: {
        veiculoId: payload.veiculoId,
        ordemServicoStatus: { notIn: [...TERMINAL_STATUSES] },
      },
      select: { ordemServicoId: true },
    });
    if (open) {
      throw new ConflictException(
        'O veículo já possui uma ordem de serviço em aberto',
      );
    }

    const created = await this.orm.$transaction(async (tx) => {
      const serviceOrder = await tx.ordemServico.create({
        data: {
          usuarioId: clientId,
          veiculoId: payload.veiculoId,
          mecanicoId: payload.mecanicoId,
          atendenteId: attendantId,
          ordemServicoDescricaoProblema: payload.ordemServicoDescricaoProblema,
          ordemServicoKmEntrada: payload.ordemServicoKmEntrada,
        },
      });

      await tx.ordemServicoStatusHistorico.create({
        data: {
          ordemServicoId: serviceOrder.ordemServicoId,
          historicoStatusNovo: serviceOrder.ordemServicoStatus,
          usuarioId: attendantId,
        },
      });

      return serviceOrder;
    });

    this.logger.log(
      `OS ${created.ordemServicoNumero} criada (${created.ordemServicoId})`,
    );
    return plainToInstance(ServiceOrder, created);
  }

  async findServiceOrderById(serviceOrderId: string) {
    const serviceOrder = await this.orm.ordemServico.findFirst({
      where: {
        ordemServicoId: serviceOrderId,
        // Cliente só enxerga as próprias OS; a alheia responde 404 (CLAUDE.md, regra 8).
        ...(this.ctx.user?.role === Role.CUSTOMER
          ? { usuarioId: this.ctx.userId }
          : {}),
      },
    });

    if (!serviceOrder) {
      this.logger.error(`OS ${serviceOrderId} não encontrada`);
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    return plainToInstance(ServiceOrder, serviceOrder);
  }

  /** Detalhamento (PRD-006): OS + cliente, veículo, mecânico, serviços, peças, orçamento e marcos. */
  async findServiceOrderDetail(serviceOrderId: string) {
    const serviceOrder = await this.orm.ordemServico.findFirst({
      where: {
        ordemServicoId: serviceOrderId,
        // Cliente só enxerga as próprias OS; a alheia responde 404 (CLAUDE.md, regra 8).
        ...(this.ctx.user?.role === Role.CUSTOMER
          ? { usuarioId: this.ctx.userId }
          : {}),
      },
      include: {
        cliente: { select: { usuarioId: true, usuarioNome: true } },
        mecanico: { select: { usuarioId: true, usuarioNome: true } },
        veiculo: {
          select: {
            veiculoId: true,
            veiculoPlaca: true,
            veiculoMarca: true,
            veiculoModelo: true,
          },
        },
        historicoStatus: {
          select: { historicoStatusNovo: true, historicoCriadoEm: true },
        },
        orcamentos: { orderBy: { orcamentoVersao: 'desc' }, take: 1 },
        itens: {
          include: { itemEstoque: { select: { itemEstoqueNome: true } } },
        },
        servicos: { include: { servico: { select: { servicoNome: true } } } },
      },
    });

    if (!serviceOrder) {
      this.logger.error(`OS ${serviceOrderId} não encontrada`);
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    const {
      cliente,
      mecanico,
      veiculo,
      historicoStatus,
      orcamentos,
      itens,
      servicos,
      ...order
    } = serviceOrder;

    return {
      ...plainToInstance(ServiceOrder, order),
      cliente,
      mecanico,
      veiculo,
      orcamento: buildQuote(
        serviceOrderId,
        orcamentos[0] ?? null,
        itens,
        servicos,
      ),
      marcos: buildMilestones(historicoStatus),
    };
  }

  async findAll({
    page,
    pageSize,
    status,
    clientId,
    veiculoId,
    from,
    to,
  }: ListServiceOrdersQueryDto) {
    const where = {
      ...(status ? { ordemServicoStatus: status } : {}),
      ...(clientId ? { usuarioId: clientId } : {}),
      ...(veiculoId ? { veiculoId } : {}),
      ...(from || to
        ? {
            ordemServicoCriadaEm: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.orm.ordemServico.findMany({
        where,
        orderBy: [{ ordemServicoCriadaEm: 'desc' }, { ordemServicoId: 'asc' }], // desempate estável
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.orm.ordemServico.count({ where }),
    ]);

    return {
      serviceOrders: plainToInstance(ServiceOrder, items),
      total,
      page,
      pageSize,
    };
  }

  async updateServiceOrder(
    serviceOrderId: string,
    payload: UpdateServiceOrderDto,
  ) {
    const current = await this.findServiceOrderById(serviceOrderId);

    if (StatusTransitionPolicy.isTerminal(current.ordemServicoStatus)) {
      throw new ConflictException(
        'Ordem de serviço encerrada não pode ser alterada',
      );
    }

    if (payload.mecanicoId && payload.mecanicoId !== current.mecanicoId) {
      await this.ensureUserWithRole(
        payload.mecanicoId,
        Role.MECHANIC,
        'Mecânico não encontrado',
        'O responsável pela OS deve ter o perfil Mecânico',
      );
    }

    const updated = await this.orm.ordemServico.update({
      where: { ordemServicoId: serviceOrderId },
      data: {
        ...payload,
        ordemServicoAtualizadaEm: new Date(), // o banco só preenche o default na criação
      },
    });

    return plainToInstance(ServiceOrder, updated);
  }

  async cancelServiceOrder(
    serviceOrderId: string,
    { reason }: CancelServiceOrderDto,
  ) {
    return await this.applyCommand(serviceOrderId, ServiceOrderCommand.CANCEL, {
      observation: reason,
      data: { ordemServicoMotivoCancelamento: reason },
    });
  }

  async startDiagnosis(serviceOrderId: string) {
    return await this.applyCommand(
      serviceOrderId,
      ServiceOrderCommand.START_DIAGNOSIS,
    );
  }

  /**
   * Envia o orçamento ao cliente (→ AGUARDANDO_APROVACAO): exige ao menos um item e total > 0 (RN-033).
   * Gera o token de acompanhamento (ADR-011) e "notifica" o cliente (por ora, só log).
   */
  async sendQuote(serviceOrderId: string) {
    const serviceOrder = await this.applyCommand(
      serviceOrderId,
      ServiceOrderCommand.SEND_QUOTE,
      {
        beforeTransition: async (tx) => {
          const items = await tx.ordemServicoItem.findMany({
            where: { ordemServicoId: serviceOrderId },
          });
          const services = await tx.ordemServicoServico.findMany({
            where: { ordemServicoId: serviceOrderId },
          });
          const total = calculateQuoteTotal(items, services);
          if (total <= 0) {
            throw new UnprocessableEntityException(
              'O orçamento precisa de ao menos um item com valor maior que zero',
            );
          }

          await tx.orcamento.updateMany({
            where: { ordemServicoId: serviceOrderId },
            data: {
              orcamentoStatus: StatusOrcamento.ENVIADO,
              orcamentoValorTotal: total,
              orcamentoEnviadoEm: new Date(),
              orcamentoAtualizadoEm: new Date(),
            },
          });
        },
      },
    );

    const token = await this.trackingTokenService.issue(serviceOrderId);
    const url = `${TRACKING_BASE_URL}/tracking/service-orders/${serviceOrderId}`;
    // Notificador: sem e-mail no MVP, o link vai para o log (o token nunca é logado).
    this.logger.log(
      `Orçamento da OS ${serviceOrderId} enviado ao cliente ${serviceOrder.usuarioId}: ${url}`,
    );

    return {
      ...serviceOrder,
      // O token só volta na resposta fora de produção; em produção iria no e-mail ao cliente.
      tracking: {
        url,
        ...(process.env['NODE_ENV'] === 'production' ? {} : { token }),
      },
    };
  }

  /** Cliente aprova o orçamento (AGUARDANDO_APROVACAO → AGUARDANDO_EXECUCAO). */
  async approveQuote(serviceOrderId: string, customerId: string) {
    return await this.applyCommand(
      serviceOrderId,
      ServiceOrderCommand.APPROVE_QUOTE,
      {
        actorId: customerId,
        beforeTransition: async (tx) => {
          await this.registerQuoteResponse(tx, serviceOrderId, customerId, {
            orcamentoStatus: StatusOrcamento.APROVADO,
          });
          // ADR-012: a reserva acontece na mesma transação da aprovação; sem saldo, nada muda (422).
          await this.stockService.reserveForServiceOrder(
            tx,
            serviceOrderId,
            customerId,
            await this.partLines(tx, serviceOrderId),
          );
        },
      },
    );
  }

  /** Cliente recusa o orçamento (AGUARDANDO_APROVACAO → ORCAMENTO_RECUSADO, terminal — ADR-010). */
  async rejectQuote(
    serviceOrderId: string,
    customerId: string,
    reason?: string,
  ) {
    return await this.applyCommand(
      serviceOrderId,
      ServiceOrderCommand.REJECT_QUOTE,
      {
        actorId: customerId,
        observation: reason,
        beforeTransition: async (tx) => {
          await this.registerQuoteResponse(tx, serviceOrderId, customerId, {
            orcamentoStatus: StatusOrcamento.REJEITADO,
            orcamentoMotivoRejeicao: reason ?? null,
          });
        },
      },
    );
  }

  async startExecution(serviceOrderId: string) {
    return await this.applyCommand(
      serviceOrderId,
      ServiceOrderCommand.START_EXECUTION,
    );
  }

  async completeServiceOrder(serviceOrderId: string) {
    const userId = this.ctx.userId;
    return await this.applyCommand(
      serviceOrderId,
      ServiceOrderCommand.COMPLETE,
      {
        // ADR-012: a baixa do estoque reservado acontece na mesma transação da finalização.
        beforeTransition: async (tx) => {
          await this.stockService.withdrawReservedForServiceOrder(
            tx,
            serviceOrderId,
            userId,
            await this.partLines(tx, serviceOrderId),
          );
        },
      },
    );
  }

  async deliverServiceOrder(serviceOrderId: string) {
    return await this.applyCommand(serviceOrderId, ServiceOrderCommand.DELIVER);
  }

  async findStatusHistory(serviceOrderId: string) {
    await this.findServiceOrderById(serviceOrderId);

    const entries = await this.orm.ordemServicoStatusHistorico.findMany({
      where: { ordemServicoId: serviceOrderId },
      orderBy: [{ historicoCriadoEm: 'asc' }, { historicoId: 'asc' }],
    });

    return plainToInstance(StatusHistoryEntry, entries);
  }

  /**
   * Único ponto onde o status muda: valida a transição na política, atualiza e grava o histórico
   * na mesma transação (ADR-010). O `updateMany` condicionado ao status lido evita que dois comandos
   * simultâneos passem pela mesma validação.
   */
  private async applyCommand(
    serviceOrderId: string,
    command: ServiceOrderCommand,
    options: {
      /** Quem executa o comando; padrão é o usuário logado (o token de acompanhamento não tem usuário). */
      actorId?: string;
      observation?: string;
      data?: { ordemServicoMotivoCancelamento?: string };
      /** Roda dentro da transação, depois de validada a transição e antes do update de status. */
      beforeTransition?: (tx: Prisma.TransactionClient) => Promise<void>;
    } = {},
  ) {
    const userId = options.actorId ?? this.ctx.userId;

    const updated = await this.orm.$transaction(async (tx) => {
      const current = await tx.ordemServico.findUnique({
        where: { ordemServicoId: serviceOrderId },
        select: { ordemServicoStatus: true },
      });

      if (!current) {
        throw new NotFoundException('Ordem de serviço não encontrada');
      }

      const from = current.ordemServicoStatus;
      const to = StatusTransitionPolicy.resolve(from, command);
      if (!to) {
        throw new ConflictException(
          `A ordem de serviço em ${from} não aceita a operação ${command}`,
        );
      }

      await options.beforeTransition?.(tx);

      const { count } = await tx.ordemServico.updateMany({
        where: { ordemServicoId: serviceOrderId, ordemServicoStatus: from },
        data: {
          ...options.data,
          ordemServicoStatus: to,
          ordemServicoAtualizadaEm: new Date(),
        },
      });
      if (count === 0) {
        throw new ConflictException(
          'A ordem de serviço foi alterada por outra operação, tente novamente',
        );
      }

      await tx.ordemServicoStatusHistorico.create({
        data: {
          ordemServicoId: serviceOrderId,
          historicoStatusAnterior: from,
          historicoStatusNovo: to,
          usuarioId: userId,
          historicoObservacao: options.observation,
        },
      });

      return await tx.ordemServico.findUniqueOrThrow({
        where: { ordemServicoId: serviceOrderId },
      });
    });

    this.logger.log(
      `OS ${serviceOrderId}: ${command} (${updated.ordemServicoStatus})`,
    );
    return plainToInstance(ServiceOrder, updated);
  }

  /** Peças e insumos da OS (os serviços não movimentam estoque). */
  private async partLines(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
  ) {
    const items = await tx.ordemServicoItem.findMany({
      where: { ordemServicoId: serviceOrderId },
      select: { itemEstoqueId: true, osItemQuantidade: true },
    });
    return items.map((item) => ({
      itemEstoqueId: item.itemEstoqueId,
      quantidade: Number(item.osItemQuantidade),
    }));
  }

  /** O cliente vem por `clientId` ou por CPF/CNPJ; se vierem os dois, precisam ser a mesma pessoa. */
  private async resolveClientId(payload: CreateServiceOrderDto) {
    if (!payload.clientId && !payload.customerDocument) {
      throw new BadRequestException('Informe clientId ou customerDocument');
    }

    let clientId = payload.clientId;
    if (payload.customerDocument) {
      const customer = await this.customersService.findCustomerByDocument(
        payload.customerDocument,
      );
      if (clientId && clientId !== customer.usuarioId) {
        throw new UnprocessableEntityException(
          'clientId e customerDocument se referem a clientes diferentes',
        );
      }
      clientId = customer.usuarioId;
    }

    await this.ensureUserWithRole(
      clientId!,
      Role.CUSTOMER,
      'Cliente não encontrado',
      'O cliente da OS deve ter o perfil Cliente',
    );
    return clientId!;
  }

  private async registerQuoteResponse(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
    customerId: string,
    data: {
      orcamentoStatus: StatusOrcamento;
      orcamentoMotivoRejeicao?: string | null;
    },
  ) {
    const now = new Date();
    await tx.orcamento.updateMany({
      where: { ordemServicoId: serviceOrderId },
      data: {
        ...data,
        orcamentoRespondidoEm: now,
        orcamentoRespondidoPor: customerId,
        orcamentoAtualizadoEm: now,
      },
    });
  }

  /** O usuário precisa existir, estar ativo e ter o perfil esperado. */
  private async ensureUserWithRole(
    userId: string,
    role: Role,
    notFoundMessage: string,
    invalidRoleMessage: string,
  ) {
    let user: Awaited<ReturnType<UsersService['findUserById']>>;
    try {
      user = await this.usersService.findUserById(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(notFoundMessage);
      }
      throw error;
    }

    const { perfil } = user as typeof user & {
      perfil?: { perfilNome: string };
    };
    if (perfil?.perfilNome !== role) {
      throw new UnprocessableEntityException(invalidRoleMessage);
    }
  }
}
