import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../../../generated/prisma/client';
import { DatabaseService } from '../../../shared/database/database.service';
import { User } from '../domain/entities';
import { ListUsersQueryDto, RegisterUserDto, UpdateUserDto } from '../dtos';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  private orm;

  constructor(private readonly prisma: DatabaseService) {
    this.orm = this.prisma.db;
  }

  async createUser(payload: RegisterUserDto, salt: NonSharedBuffer) {
    const { perfilId, password } = payload;

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
            senhaHash: password,
          },
        },
      },
    });

    return plainToInstance(User, createdUser);
  }

  async findUserById(userId: string) {
    const user = await this.orm.usuario.findUnique({
      where: { usuarioId: userId },
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
    const where = perfilId ? { perfilId } : {};

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
      return await this.orm.usuario.update({
        where: { usuarioId: userId },
        data: {
          ...payload,
          usuarioAtualizadoEm: new Date(), // o banco só preenche o default na criação
        },
      });
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
    // A senha aponta para o usuário (sem ON DELETE CASCADE): apaga a senha e depois o usuário,
    // na mesma transação. Se o usuário ainda tiver veículos/ordens, tudo é desfeito.
    await this.prisma.db.$transaction(async (tx) => {
      await tx.usuarioSenha.deleteMany({ where: { usuarioId: userId } });

      const { count } = await tx.usuario.deleteMany({
        where: { usuarioId: userId },
      });

      if (count === 0) throw new NotFoundException('Usuário não encontrado');
    });

    this.logger.log(`Usuário ${userId} excluído`);
  }
}
