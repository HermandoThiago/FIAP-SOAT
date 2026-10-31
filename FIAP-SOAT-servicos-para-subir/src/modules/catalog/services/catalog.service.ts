import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../../../generated/prisma/client';
import { DatabaseService } from '../../../shared/database/database.service';
import { CreateServiceDto } from '../controllers/dtos/create-service.dto';
import { ListServicesQueryDto } from '../controllers/dtos/list-services-query.dto';
import { UpdateServiceDto } from '../controllers/dtos/update-service.dto';
import { Service } from '../domain/entities/service.entity';

/**
 * Serviço de aplicação dos serviços da oficina (troca de óleo, alinhamento...).
 * Nome definido no CLAUDE.md: `CatalogService`, nunca `ServicesService`.
 * Exportado pelo CatalogModule para a OS consultar serviço ativo e preço.
 */
@Injectable()
export class CatalogService {
  private logger = new Logger(CatalogService.name);
  private orm;

  constructor(private readonly prisma: DatabaseService) {
    this.orm = this.prisma.db;
  }

  async createService(payload: CreateServiceDto) {
    await this.ensureNameAvailable(payload.servicoNome);

    try {
      const created = await this.orm.servico.create({ data: payload });

      this.logger.log(`Serviço ${created.servicoId} criado`);
      return plainToInstance(Service, created);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async findAll({
    page,
    pageSize,
    servicoNome,
    servicoAtivo,
  }: ListServicesQueryDto) {
    const where: Prisma.ServicoWhereInput = {
      servicoAtivo,
      ...(servicoNome
        ? { servicoNome: { contains: servicoNome, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.orm.servico.findMany({
        where,
        orderBy: [{ servicoNome: 'asc' }, { servicoId: 'asc' }], // desempate estável
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.orm.servico.count({ where }),
    ]);

    return { services: plainToInstance(Service, items), total, page, pageSize };
  }

  /** Serviço ativo pelo id. Usado também pela OS para incluir o serviço no orçamento. */
  async findServiceById(serviceId: string) {
    const service = await this.orm.servico.findFirst({
      where: { servicoId: serviceId, servicoAtivo: true },
    });

    if (!service) {
      this.logger.error(`Serviço ${serviceId} não encontrado`);
      throw new NotFoundException('Serviço não encontrado');
    }

    return plainToInstance(Service, service);
  }

  async updateService(serviceId: string, payload: UpdateServiceDto) {
    const current = await this.findServiceById(serviceId);

    if (
      payload.servicoNome !== undefined &&
      payload.servicoNome !== current.servicoNome
    ) {
      await this.ensureNameAvailable(payload.servicoNome, serviceId);
    }

    try {
      const updated = await this.orm.servico.update({
        where: { servicoId: serviceId },
        data: {
          ...payload,
          servicoAtualizadoEm: new Date(), // o banco só preenche o default na criação
        },
      });

      return plainToInstance(Service, updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Serviço não encontrado');
      }
      throw this.translateUniqueViolation(error);
    }
  }

  async deleteService(serviceId: string): Promise<void> {
    // Exclusão lógica: OS antigas guardam o preço da época e continuam íntegras.
    const now = new Date();

    const { count } = await this.orm.servico.updateMany({
      where: { servicoId: serviceId, servicoAtivo: true },
      data: { servicoAtivo: false, servicoAtualizadoEm: now },
    });

    if (count === 0) throw new NotFoundException('Serviço não encontrado');

    this.logger.log(`Serviço ${serviceId} inativado`);
  }

  // O nome é único na tabela inteira (inclusive inativos), então a checagem também é.
  private async ensureNameAvailable(name: string, ignoreServiceId?: string) {
    const exists = await this.orm.servico.findFirst({
      where: {
        servicoNome: { equals: name, mode: 'insensitive' },
        ...(ignoreServiceId ? { NOT: { servicoId: ignoreServiceId } } : {}),
      },
      select: { servicoAtivo: true },
    });

    if (exists) {
      throw new ConflictException(
        exists.servicoAtivo
          ? 'Já existe um serviço com esse nome'
          : 'Já existe um serviço inativo com esse nome',
      );
    }
  }

  // Corrida entre a checagem e o insert: o índice único do banco é a última barreira.
  private translateUniqueViolation(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Já existe um serviço com esse nome');
    }
    return error;
  }
}
