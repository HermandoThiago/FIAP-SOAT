import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { plainToInstance } from 'class-transformer';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { promisify } from 'node:util';
import { DatabaseService } from '../../../shared/database/database.service';
import { RequestContext, Role } from '../auth';
import { User } from '../domain/entities';
import { LoginDto, RegisterUserDto } from '../dtos';
import { UsersService } from './users.service';

const GENERATE_SALT = promisify(randomBytes);
const SALT_LENGTH = 16;
const REFRESH_TTL_MS =
  Number(process.env['REFRESH_TOKEN_TTL_DAYS'] ?? 7) * 24 * 60 * 60 * 1000;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  private orm;
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly userService: UsersService,
    private readonly jwt: JwtService,
    private readonly ctx: RequestContext,
  ) {
    this.orm = this.prisma.db;
  }

  async register(payload: RegisterUserDto) {
    try {
      const perfil = await this.orm.perfil.findUnique({
        where: { perfilId: payload.perfilId },
      });
      if (!perfil) throw new NotFoundException('Perfil não encontrado');

      // Só Admin cria outro Admin (a rota já limita o acesso a Admin e Atendente).
      if (
        perfil.perfilNome === Role.ADMIN &&
        this.ctx.requireUser().role !== Role.ADMIN
      ) {
        throw new ForbiddenException(
          'Somente administradores podem criar outros administradores',
        );
      }

      const { senha, ...rest } = payload;

      const salt = await GENERATE_SALT(SALT_LENGTH);
      const hash = await argon.hash(senha, { salt });

      const newUser = await this.userService.createUser(
        { ...rest, senhaHash: hash },
        salt,
      );

      return plainToInstance(User, newUser);
    } catch (error) {
      this.logger.error(
        'Erro ao registrar usuário',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  async login({ email, senha }: LoginDto) {
    const user = await this.orm.usuario.findUnique({
      where: { usuarioEmail: email },
      include: { senha: true, perfil: true },
    });

    // Sempre executa o verify (hash falso se o usuário não existe) para não vazar, pelo tempo
    // de resposta, quais e-mails estão cadastrados.
    const hash = user?.senha?.senhaHash ?? (await this.getDummyHash());
    const isPasswordValid = await argon.verify(hash, senha).catch(() => false);

    // Mesma mensagem para usuário inativo: não revela que o e-mail existe.
    if (!user || !user.usuarioAtivo || !user.senha || !isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    await this.orm.usuario.update({
      where: { usuarioId: user.usuarioId },
      data: { usuarioUltimoAcesso: new Date() },
    });

    return this.issueTokens(
      user.usuarioId,
      user.perfil.perfilNome as Role,
      randomUUID(),
    );
  }

  async refresh(refreshToken: string) {
    const session = await this.orm.sessaoRefresh.findUnique({
      where: {
        sessaoTokenHash: hashToken(refreshToken),
      },
      include: {
        usuario: {
          include: {
            perfil: true,
          },
        },
      },
    });

    if (!session) throw new UnauthorizedException('Refresh token inválido');

    // Só o dono do token renova. Checado antes da rotação para não consumir o token alheio.
    if (session.usuarioId !== this.ctx.userId) {
      this.logger.warn(
        `Usuário ${this.ctx.userId} tentou usar refresh token do usuário ${session.usuarioId}`,
      );

      throw new UnauthorizedException('Refresh token inválido');
    }

    // Usuário inativado: barreira extra além da revogação feita na exclusão lógica.
    if (!session.usuario.usuarioAtivo) {
      await this.revokeFamily(session.sessaoFamiliaId);
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Rotação: cada refresh token só vale uma vez. Revogado e reapresentado = possível roubo,
    // então derruba toda a cadeia (família) de tokens.
    // O updateMany condicional garante que só uma de duas requisições concorrentes ganhe.
    const { count } = await this.orm.sessaoRefresh.updateMany({
      where: {
        sessaoId: session.sessaoId,
        sessaoRevogadaEm: null,
      },
      data: {
        sessaoRevogadaEm: new Date(),
      },
    });

    if (count === 0) {
      this.logger.warn(
        `Reuso de refresh token detectado (usuário ${session.usuarioId}); família revogada`,
      );
      await this.revokeFamily(session.sessaoFamiliaId);
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (session.sessaoExpiraEm < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    return this.issueTokens(
      session.usuarioId,
      session.usuario.perfil.perfilNome as Role, // perfil atual, não o do login
      session.sessaoFamiliaId,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.orm.sessaoRefresh.findUnique({
      where: { sessaoTokenHash: hashToken(refreshToken) },
    });

    if (session) await this.revokeFamily(session.sessaoFamiliaId);
  }

  private async issueTokens(userId: string, role: Role, familyId: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, role });

    const refreshToken = randomBytes(48).toString('base64url');
    await this.orm.sessaoRefresh.create({
      data: {
        usuarioId: userId,
        sessaoTokenHash: hashToken(refreshToken),
        sessaoFamiliaId: familyId,
        sessaoExpiraEm: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken, tokenType: 'Bearer' as const };
  }

  private async revokeFamily(familyId: string) {
    await this.orm.sessaoRefresh.updateMany({
      where: { sessaoFamiliaId: familyId, sessaoRevogadaEm: null },
      data: { sessaoRevogadaEm: new Date() },
    });
  }

  private getDummyHash() {
    this.dummyHash ??= argon.hash(randomUUID());
    return this.dummyHash;
  }
}
