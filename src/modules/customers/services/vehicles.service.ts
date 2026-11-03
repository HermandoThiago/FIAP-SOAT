import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../../../generated/prisma/client';
import { StatusOrdemServico } from '../../../generated/prisma/enums';
import { DatabaseService } from '../../../shared/database/database.service';
import { RequestContext, Role } from '../../identity/auth';
import { UsersService } from '../../identity/services';
import { Vehicle } from '../domain/entities';
import { maskLicensePlate } from '../domain/validators';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  UpdateVehicleDto,
} from '../dtos';

// OS nesses status não estão mais "em aberto" (PRD-001 RN-007).
const CLOSED_SERVICE_ORDER_STATUSES: StatusOrdemServico[] = [
  StatusOrdemServico.ENTREGUE,
  StatusOrdemServico.CANCELADA,
  StatusOrdemServico.ORCAMENTO_RECUSADO,
];

@Injectable()
export class VehiclesService {
  private logger = new Logger(VehiclesService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
    private readonly usersService: UsersService,
  ) {
    this.orm = this.prisma.db;
  }

  async createVehicle(payload: CreateVehicleDto) {
    await this.ensureCustomer(payload.usuarioId);
    await this.ensurePlateAvailable(payload.veiculoPlaca);
    if (payload.veiculoChassi) {
      await this.ensureChassisAvailable(payload.veiculoChassi);
    }

    try {
      const created = await this.orm.veiculo.create({ data: payload });

      this.logger.log(
        `Veículo ${maskLicensePlate(created.veiculoPlaca)} criado (${created.veiculoId})`,
      );
      return plainToInstance(Vehicle, created);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async findVehicleById(vehicleId: string) {
    const vehicle = await this.orm.veiculo.findFirst({
      where: { veiculoId: vehicleId, veiculoAtivo: true },
    });

    if (!vehicle) {
      this.logger.error(`Veículo ${vehicleId} não encontrado`);
      throw new NotFoundException('Veículo não encontrado');
    }

    return plainToInstance(Vehicle, vehicle);
  }

  async findAll({
    page,
    pageSize,
    usuarioId,
    veiculoPlaca,
  }: ListVehiclesQueryDto) {
    const where = {
      veiculoAtivo: true,
      ...(usuarioId ? { usuarioId } : {}),
      ...(veiculoPlaca ? { veiculoPlaca } : {}),
    };

    const [items, total] = await Promise.all([
      this.orm.veiculo.findMany({
        where,
        orderBy: [{ veiculoPlaca: 'asc' }, { veiculoId: 'asc' }], // desempate estável
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.orm.veiculo.count({ where }),
    ]);

    return { vehicles: plainToInstance(Vehicle, items), total, page, pageSize };
  }

  async updateVehicle(vehicleId: string, payload: UpdateVehicleDto) {
    const current = await this.findVehicleById(vehicleId);

    const plateChanged =
      payload.veiculoPlaca !== undefined &&
      payload.veiculoPlaca !== current.veiculoPlaca;

    if (plateChanged) {
      // PRD-001 RF-008: placa alterável apenas pelo gerente (Admin).
      if (this.ctx.user?.role !== Role.ADMIN) {
        this.logger.warn(
          `Usuário ${this.ctx.user?.userId} tentou alterar a placa do veículo ${vehicleId}`,
        );
        throw new ForbiddenException(
          'Somente o Admin pode alterar a placa do veículo',
        );
      }
      await this.ensurePlateAvailable(payload.veiculoPlaca!, vehicleId);
    }

    if (
      payload.veiculoChassi !== undefined &&
      payload.veiculoChassi !== current.veiculoChassi
    ) {
      await this.ensureChassisAvailable(payload.veiculoChassi, vehicleId);
    }

    try {
      const updated = await this.orm.veiculo.update({
        where: { veiculoId: vehicleId },
        data: {
          ...payload,
          veiculoAtualizadoEm: new Date(), // o banco só preenche o default na criação
        },
      });

      return plainToInstance(Vehicle, updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Veículo não encontrado');
      }
      throw this.translateUniqueViolation(error);
    }
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    // Exclusão lógica: preserva OS e histórico. Bloqueada se houver OS em aberto (PRD-001 RN-007).
    const now = new Date();

    await this.orm.$transaction(async (tx) => {
      const vehicle = await tx.veiculo.findFirst({
        where: { veiculoId: vehicleId, veiculoAtivo: true },
        select: { veiculoId: true },
      });

      if (!vehicle) throw new NotFoundException('Veículo não encontrado');

      // TODO: trocar pela consulta do ServiceOrdersService quando o módulo service-orders existir (ADR-003).
      const openServiceOrders = await tx.ordemServico.count({
        where: {
          veiculoId: vehicleId,
          ordemServicoStatus: { notIn: CLOSED_SERVICE_ORDER_STATUSES },
        },
      });

      if (openServiceOrders > 0) {
        throw new ConflictException(
          'Veículo possui ordem de serviço em aberto e não pode ser removido',
        );
      }

      await tx.veiculo.update({
        where: { veiculoId: vehicleId },
        data: {
          veiculoAtivo: false,
          veiculoInativadoEm: now,
          veiculoAtualizadoEm: now,
        },
      });
    });

    this.logger.log(`Veículo ${vehicleId} inativado`);
  }

  /** O proprietário precisa ser um usuário ativo com perfil Cliente. */
  private async ensureCustomer(userId: string) {
    let owner: Awaited<ReturnType<UsersService['findUserById']>>;
    try {
      owner = await this.usersService.findUserById(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('Cliente não encontrado');
      }
      throw error;
    }

    const { perfil } = owner as typeof owner & {
      perfil?: { perfilNome: string };
    };
    if (perfil?.perfilNome !== Role.CUSTOMER) {
      throw new UnprocessableEntityException(
        'O proprietário do veículo deve ser um cliente',
      );
    }
  }

  private async ensurePlateAvailable(plate: string, ignoreVehicleId?: string) {
    const exists = await this.orm.veiculo.findFirst({
      where: {
        veiculoPlaca: plate,
        veiculoAtivo: true,
        ...(ignoreVehicleId ? { NOT: { veiculoId: ignoreVehicleId } } : {}),
      },
      select: { veiculoId: true },
    });

    if (exists) {
      this.logger.error(`Placa ${maskLicensePlate(plate)} já cadastrada!`);
      throw new ConflictException('Placa já cadastrada');
    }
  }

  private async ensureChassisAvailable(
    chassis: string,
    ignoreVehicleId?: string,
  ) {
    const exists = await this.orm.veiculo.findFirst({
      where: {
        veiculoChassi: chassis,
        veiculoAtivo: true,
        ...(ignoreVehicleId ? { NOT: { veiculoId: ignoreVehicleId } } : {}),
      },
      select: { veiculoId: true },
    });

    if (exists) throw new ConflictException('Chassi já cadastrado');
  }

  // Corrida entre a checagem e o insert: o índice parcial único do banco é a última barreira.
  private translateUniqueViolation(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Placa ou chassi já cadastrado');
    }
    return error;
  }
}
