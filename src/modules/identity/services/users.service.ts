import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../../../generated/prisma/client';
import { DatabaseService } from '../../../shared/database/database.service';
import { RequestContext } from '../auth';
import { User } from '../domain/entities';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from '../dtos';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
  ) {
    this.orm = this.prisma.db;
  }

  async createUser(payload: CreateUserDto, salt: NonSharedBuffer) {
    const { perfilId, senhaHash } = payload;

    const perfil = await this.orm.perfil.findUnique({ where: { perfilId } });

    if (!perfil) {
      this.logger.error(`PerfilId ${perfilId} não encontrado!`);
      throw new NotFoundException('Perfil não encontrado');
    }

    const emailExists = await this.orm.usuario.findUnique({
      where: { usuarioEmail: payload.usuarioEmail },
    });

    if (emailExists) {
      this.logger.error(`E-mail ${payload.usuarioEmail} já cadastrado!`);
      throw new ConflictException('E-mail já cadastrado');
    }

    const documentExists = await this.orm.usuario.findUnique({
      where: { usuarioDocumento: payload.usuarioDocumento },
    });

    if (documentExists) {
      this.logger.error(
        `Documento ${payload.usuarioTipoDocumento} - ${payload.usuarioDocumento} já cadastrado!`,
      );
      throw new ConflictException('Documento já cadastrado');
    }

    const createdUser = await this.orm.usuario.create({
      data: {
        usuarioNome: payload.usuarioNome,
        usuarioEmail: payload.usuarioEmail,
        usuarioDocumento: payload.usuarioDocumento,
        usuarioTelefone: payload.usuarioTelefone
          ? payload.usuarioTelefone
          : undefined,
        usuarioTipoDocumento: payload.usuarioTipoDocumento,
        perfil: {
          connect: {
            perfilId,
          },
        },
        senha: {
          create: {
            senhaHash,
          },
        },
      },
    });

    return plainToInstance(User, createdUser);
  }

  async findUserById(userId: string) {
    const user = await this.orm.usuario.findFirst({
      where: { usuarioId: userId, usuarioAtivo: true },
      include: {
        perfil: {
          select: {
            perfilNome: true,
          },
        },
      },
    });

    if (!user) {
      this.logger.error(`Usuário ${userId} não encontrado`);
      throw new NotFoundException(`Usuário não encontrado`);
    }

    return plainToInstance(User, user);
  }

  async findAll({ page, pageSize, perfilId }: ListUsersQueryDto) {
    const where = { usuarioAtivo: true, ...(perfilId ? { perfilId } : {}) };

    const [items, total] = await Promise.all([
      this.orm.usuario.findMany({
        where,
        orderBy: [{ usuarioNome: 'asc' }, { usuarioId: 'asc' }], // desempate estável
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          perfil: {
            select: {
              perfilNome: true,
            },
          },
        },
      }),
      this.orm.usuario.count({ where }),
    ]);

    return { users: plainToInstance(User, items), total, page, pageSize };
  }

  async updateUser(userId: string, payload: UpdateUserDto) {
    try {
      const existsUser = await this.orm.usuario.findFirst({
        where: {
          usuarioId: userId,
          usuarioAtivo: true,
        },
        include: {
          perfil: {
            select: {
              perfilNome: true,
            },
          },
        },
      });

      if (!existsUser) {
        this.logger.error(`Usuário ${userId} não encontrado`);
        throw new NotFoundException(`Usuário não encontrado`);
      }

      if (userId != this.ctx.userId) {
        this.logger.warn(
          `Usuário ${this.ctx.userId} tentou alterar informações de outro usuário`,
        );

        throw new UnauthorizedException('Refresh token inválido');
      }

      const updatedUser = await this.orm.usuario.update({
        where: {
          usuarioId: userId,
        },
        data: {
          ...payload,
          usuarioAtualizadoEm: new Date(), // o banco só preenche o default na criação
        },
      });

      return plainToInstance(User, updatedUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuário não encontrado');
      }
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    // Exclusão lógica: preserva OS, veículos e histórico (analytics). Inativa o usuário e revoga
    // as sessões na mesma transação.
    const now = new Date();

    await this.prisma.db.$transaction(async (tx) => {
      const { count } = await tx.usuario.updateMany({
        where: {
          usuarioId: userId,
          usuarioAtivo: true,
        },
        data: {
          usuarioAtivo: false,
          usuarioInativadoEm: now,
          usuarioAtualizadoEm: now,
        },
      });

      if (count === 0) throw new NotFoundException('Usuário não encontrado');

      await tx.sessaoRefresh.updateMany({
        where: { usuarioId: userId, sessaoRevogadaEm: null },
        data: { sessaoRevogadaEm: now },
      });
    });

    this.logger.log(`Usuário ${userId} inativado`);
  }
}
