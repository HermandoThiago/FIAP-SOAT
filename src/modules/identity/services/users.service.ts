import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { vc } from '../../../prisma/types';
import { DatabaseService } from '../../../shared/database/database.service';
import { RegisterUserDto } from '../dtos';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async createUser(payload: RegisterUserDto, salt: NonSharedBuffer) {
    const { perfilId, password } = payload;
    const orm = this.prisma.db.orm.public;

    const [perfil] = await orm.Perfil.where({ perfilId }).all();
    if (!perfil) throw new NotFoundException('Perfil não encontrado');

    const [emailEmUso] = await orm.Usuario.where({
      usuarioEmail: vc<255>(payload.usuarioEmail),
    }).all();
    if (emailEmUso) throw new ConflictException('E-mail já cadastrado');

    const [documentoEmUso] = await orm.Usuario.where({
      usuarioDocumento: vc<14>(payload.usuarioDocumento),
    }).all();
    if (documentoEmUso) throw new ConflictException('Documento já cadastrado');

    const createdUser = await this.prisma.db.orm.public.Usuario.create({
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
}
