import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { StatusOrdemServico } from '../../../generated/prisma/enums';
import { DatabaseService } from '../../../shared/database/database.service';
import { VehiclesService } from '../../customers/services';
import { RequestContext, Role } from '../../identity/auth';
import { UsersService } from '../../identity/services';
import {
  CancelServiceOrderDto,
  CreateServiceOrderDto,
  ListServiceOrdersQueryDto,
  UpdateServiceOrderDto,
} from '../controllers/dtos';
import { ServiceOrder } from '../domain/entities';

// OS nesses status não estão mais "em aberto" (PRD-001 RN-007).
const CLOSED_STATUSES: StatusOrdemServico[] = [
  StatusOrdemServico.ENTREGUE,
  StatusOrdemServico.CANCELADA,
  StatusOrdemServico.ORCAMENTO_RECUSADO,
];

// O cancelamento só vale antes da aprovação do orçamento (ADR-010).
const CANCELLABLE_STATUSES: StatusOrdemServico[] = [
  StatusOrdemServico.RECEBIDA,
  StatusOrdemServico.EM_DIAGNOSTICO,
  StatusOrdemServico.AGUARDANDO_APROVACAO,
];

@Injectable()
export class ServiceOrdersService {
  private logger = new Logger(ServiceOrdersService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
    private readonly usersService: UsersService,
    private readonly vehiclesService: VehiclesService,
  ) {
    this.orm = this.prisma.db;
  }

  async createServiceOrder(payload: CreateServiceOrderDto) {
    const attendantId = this.ctx.userId;

    await this.ensureUserWithRole(
      payload.clientId,
      Role.CUSTOMER,
      'Cliente não encontrado',
      'O cliente da OS deve ter o perfil Cliente',
    );
    await this.ensureUserWithRole(
      payload.mecanicoId,
      Role.MECHANIC,
      'Mecânico não encontrado',
      'O responsável pela OS deve ter o perfil Mecânico',
    );

    const vehicle = await this.vehiclesService.findVehicleById(
      payload.veiculoId,
    );
    if (vehicle.usuarioId !== payload.clientId) {
      throw new ConflictException('O veículo não pertence ao cliente');
    }

    const open = await this.orm.ordemServico.findFirst({
      where: {
        veiculoId: payload.veiculoId,
        ordemServicoStatus: { notIn: CLOSED_STATUSES },
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
          usuarioId: payload.clientId,
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

    if (CLOSED_STATUSES.includes(current.ordemServicoStatus)) {
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
    const userId = this.ctx.userId;

    const cancelled = await this.orm.$transaction(async (tx) => {
      const current = await tx.ordemServico.findUnique({
        where: { ordemServicoId: serviceOrderId },
        select: { ordemServicoStatus: true },
      });

      if (!current)
        throw new NotFoundException('Ordem de serviço não encontrada');

      if (!CANCELLABLE_STATUSES.includes(current.ordemServicoStatus)) {
        throw new ConflictException(
          `Ordem de serviço em ${current.ordemServicoStatus} não pode ser cancelada`,
        );
      }

      const serviceOrder = await tx.ordemServico.update({
        where: { ordemServicoId: serviceOrderId },
        data: {
          ordemServicoStatus: StatusOrdemServico.CANCELADA,
          ordemServicoMotivoCancelamento: reason,
          ordemServicoAtualizadaEm: new Date(),
        },
      });

      await tx.ordemServicoStatusHistorico.create({
        data: {
          ordemServicoId: serviceOrderId,
          historicoStatusAnterior: current.ordemServicoStatus,
          historicoStatusNovo: StatusOrdemServico.CANCELADA,
          usuarioId: userId,
          historicoObservacao: reason,
        },
      });

      return serviceOrder;
    });

    this.logger.log(`OS ${serviceOrderId} cancelada`);
    return plainToInstance(ServiceOrder, cancelled);
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
