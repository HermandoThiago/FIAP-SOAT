import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { vc } from '../../../prisma/types';
import { DatabaseService } from '../../../shared/database/database.service';
import { ListUsersQueryDto, RegisterUserDto, UpdateUserDto } from '../dtos';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  private orm;

  constructor(private readonly prisma: DatabaseService) {
    this.orm = this.prisma.db.orm.public;
  }

  async createUser(payload: RegisterUserDto, salt: NonSharedBuffer) {
    const { perfilId, password } = payload;

    const [perfil] = await this.orm.Perfil.where({ perfilId }).all();

    if (!perfil) {
      this.logger.error(`PerfilId ${perfilId} não encontrado!`);
      throw new NotFoundException('Perfil não encontrado');
    }

    const [emailExists] = await this.orm.Usuario.where({
      usuarioEmail: vc<255>(payload.usuarioEmail),
    }).all();

    if (emailExists) {
      this.logger.error(`E-mail ${payload.usuarioEmail} já cadastrado!`);
      throw new ConflictException('E-mail já cadastrado');
    }

    const [documentExists] = await this.orm.Usuario.where({
      usuarioDocumento: vc<14>(payload.usuarioDocumento),
    }).all();

    if (documentExists) {
      this.logger.error(
        `Documento ${payload.usuarioTipoDocumento} - ${payload.usuarioDocumento} já cadastrado!`,
      );
      throw new ConflictException('Documento já cadastrado');
    }

    const createdUser = await this.orm.Usuario.create({
      usuarioNome: vc<120>(payload.usuarioNome),
      usuarioEmail: vc<255>(payload.usuarioEmail),
      usuarioDocumento: vc<14>(payload.usuarioDocumento),
      usuarioTelefone: payload.usuarioTelefone
        ? vc<11>(payload.usuarioTelefone)
        : undefined,
      usuarioTipoDocumento: payload.usuarioTipoDocumento,
      perfil: (rel) => rel.connect({ perfilId }),
      senha: (rel) => rel.create({ senhaHash: vc<255>(password) }),
    });

    return createdUser;
  }

  async findUserById(userId: string) {
    const user = await this.orm.Usuario.where({ usuarioId: userId }).first();

    if (!user) {
      this.logger.error(`Usuário ${userId} não encontrado`);
      throw new NotFoundException(`Usuário não encontrado`);
    }

    return user;
  }

  async findAll({ page, pageSize, perfilId }: ListUsersQueryDto) {
    const users = perfilId
      ? this.orm.Usuario.where({ perfilId })
      : this.orm.Usuario;

    const [items, { total }] = await Promise.all([
      users
        .orderBy([(u) => u.usuarioNome.asc(), (u) => u.usuarioId.asc()]) // desempate estável
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .all(),
      users.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return { users: items, total, page, pageSize };
  }

  async updateUser(userId: string, payload: UpdateUserDto) {
    // Só entra no UPDATE o que foi enviado (undefined = não alterar; null no telefone = remover)
    const data = {
      ...(payload.usuarioNome !== undefined && {
        usuarioNome: vc<120>(payload.usuarioNome.trim()),
      }),
      ...(payload.usuarioEmail !== undefined && {
        usuarioEmail: vc<255>(payload.usuarioEmail.trim().toLowerCase()),
      }),
      ...(payload.usuarioTelefone !== undefined && {
        usuarioTelefone:
          payload.usuarioTelefone === null
            ? null
            : vc<11>(payload.usuarioTelefone),
      }),
      ...(payload.perfilId !== undefined && { perfilId: payload.perfilId }),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }

    const updated = await this.orm.Usuario.where({
      usuarioId: userId,
    }).update({
      ...data,
      usuarioAtualizadoEm: new Date(), // o banco só preenche o default na criação
    });

    if (!updated) throw new NotFoundException('Usuário não encontrado');

    return updated;
  }

  async deleteUser(userId: string): Promise<void> {
    // A senha aponta para o usuário (sem ON DELETE CASCADE): apaga a senha e depois o usuário,
    // na mesma transação. Se o usuário ainda tiver veículos/ordens, tudo é desfeito.
    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.UsuarioSenha.where({ usuarioId: userId }).delete();

      const removed = await tx.orm.public.Usuario.where({
        usuarioId: userId,
      }).delete();

      if (!removed) throw new NotFoundException('Usuário não encontrado');
    });

    this.logger.log(`Usuário ${userId} excluído`);
  }
}
