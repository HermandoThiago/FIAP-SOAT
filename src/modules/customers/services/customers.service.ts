import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../../../generated/prisma/client';
import { StatusOrdemServico } from '../../../generated/prisma/enums';
import { DatabaseService } from '../../../shared/database/database.service';
import { Role } from '../../identity/auth';
import { Customer } from '../domain/entities';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from '../dtos';

// OS nesses status não estão mais "em aberto" (PRD-001 RN-007).
const CLOSED_SERVICE_ORDER_STATUSES: StatusOrdemServico[] = [
  StatusOrdemServico.ENTREGUE,
  StatusOrdemServico.CANCELADA,
  StatusOrdemServico.ORCAMENTO_RECUSADO,
];

/**
 * Serviço de aplicação dos clientes da oficina: usuários ativos com perfil Cliente.
 * O cliente cadastrado pela equipe não tem senha; o acompanhamento é pelo token da OS (ADR-011).
 */
@Injectable()
export class CustomersService {
  private logger = new Logger(CustomersService.name);
  private orm;

  constructor(private readonly prisma: DatabaseService) {
    this.orm = this.prisma.db;
  }

  async createCustomer(payload: CreateCustomerDto) {
    const perfil = await this.orm.perfil.findUnique({
      where: { perfilNome: Role.CUSTOMER },
    });
    if (!perfil) {
      this.logger.error(`Perfil ${Role.CUSTOMER} não cadastrado`);
      throw new UnprocessableEntityException('Perfil Cliente não configurado');
    }

    await this.ensureEmailAvailable(payload.usuarioEmail);
    await this.ensureDocumentAvailable(payload.usuarioDocumento);

    try {
      const created = await this.orm.usuario.create({
        data: { ...payload, perfilId: perfil.perfilId },
      });

      this.logger.log(`Cliente ${created.usuarioId} criado`);
      return plainToInstance(Customer, created);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async findAll({
    page,
    pageSize,
    usuarioDocumento,
    usuarioNome,
  }: ListCustomersQueryDto) {
    const where: Prisma.UsuarioWhereInput = {
      usuarioAtivo: true,
      perfil: { perfilNome: Role.CUSTOMER },
      ...(usuarioDocumento ? { usuarioDocumento } : {}),
      ...(usuarioNome
        ? { usuarioNome: { contains: usuarioNome, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.orm.usuario.findMany({
        where,
        orderBy: [{ usuarioNome: 'asc' }, { usuarioId: 'asc' }], // desempate estável
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.orm.usuario.count({ where }),
    ]);

    return {
      customers: plainToInstance(Customer, items),
      total,
      page,
      pageSize,
    };
  }

  async findCustomerById(customerId: string) {
    const customer = await this.orm.usuario.findFirst({
      where: {
        usuarioId: customerId,
        usuarioAtivo: true,
        perfil: { perfilNome: Role.CUSTOMER },
      },
    });

    if (!customer) {
      this.logger.error(`Cliente ${customerId} não encontrado`);
      throw new NotFoundException('Cliente não encontrado');
    }

    return plainToInstance(Customer, customer);
  }

  /** Cliente ativo pelo CPF/CNPJ (só dígitos); usado pela OS para identificar o cliente. */
  async findCustomerByDocument(document: string) {
    const customer = await this.orm.usuario.findFirst({
      where: {
        usuarioDocumento: document.replace(/\D/g, ''),
        usuarioAtivo: true,
        perfil: { perfilNome: Role.CUSTOMER },
      },
    });

    if (!customer) {
      this.logger.error('Cliente não encontrado pelo documento informado');
      throw new NotFoundException('Cliente não encontrado');
    }

    return plainToInstance(Customer, customer);
  }

  async updateCustomer(customerId: string, payload: UpdateCustomerDto) {
    const current = await this.findCustomerById(customerId);

    if (
      payload.usuarioEmail !== undefined &&
      payload.usuarioEmail !== current.usuarioEmail
    ) {
      await this.ensureEmailAvailable(payload.usuarioEmail, customerId);
    }

    try {
      const updated = await this.orm.usuario.update({
        where: { usuarioId: customerId },
        // Só estes campos mudam: o documento é imutável, mesmo que chegue no payload.
        data: {
          usuarioNome: payload.usuarioNome,
          usuarioEmail: payload.usuarioEmail,
          usuarioTelefone: payload.usuarioTelefone,
          usuarioAtualizadoEm: new Date(), // o banco só preenche o default na criação
        },
      });

      return plainToInstance(Customer, updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Cliente não encontrado');
      }
      throw this.translateUniqueViolation(error);
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.findCustomerById(customerId);

    // Exclusão lógica: preserva OS, veículos e histórico. A checagem de OS em aberto e a
    // inativação ficam na mesma transação.
    const now = new Date();

    await this.orm.$transaction(async (tx) => {
      const openOrders = await tx.ordemServico.count({
        where: {
          usuarioId: customerId,
          ordemServicoStatus: { notIn: CLOSED_SERVICE_ORDER_STATUSES },
        },
      });
      if (openOrders > 0) {
        throw new ConflictException(
          'O cliente possui ordens de serviço em aberto',
        );
      }

      const { count } = await tx.usuario.updateMany({
        where: { usuarioId: customerId, usuarioAtivo: true },
        data: {
          usuarioAtivo: false,
          usuarioInativadoEm: now,
          usuarioAtualizadoEm: now,
        },
      });
      if (count === 0) throw new NotFoundException('Cliente não encontrado');

      await tx.sessaoRefresh.updateMany({
        where: { usuarioId: customerId, sessaoRevogadaEm: null },
        data: { sessaoRevogadaEm: now },
      });
    });

    this.logger.log(`Cliente ${customerId} inativado`);
  }

  // E-mail e documento são únicos na tabela inteira (inclusive inativos).
  private async ensureEmailAvailable(email: string, ignoreId?: string) {
    const exists = await this.orm.usuario.findFirst({
      where: {
        usuarioEmail: email,
        ...(ignoreId ? { NOT: { usuarioId: ignoreId } } : {}),
      },
      select: { usuarioId: true },
    });
    if (exists) throw new ConflictException('E-mail já cadastrado');
  }

  private async ensureDocumentAvailable(document: string) {
    const exists = await this.orm.usuario.findFirst({
      where: { usuarioDocumento: document },
      select: { usuarioId: true },
    });
    if (exists) throw new ConflictException('Documento já cadastrado');
  }

  // Corrida entre a checagem e o insert: os índices únicos do banco são a última barreira.
  private translateUniqueViolation(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('E-mail ou documento já cadastrado');
    }
    return error;
  }
}
