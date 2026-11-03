import { UnauthorizedException } from '@nestjs/common';
import * as argon from 'argon2';
import { RequestContext } from '../../src/modules/identity/auth';
import { AuthService } from '../../src/modules/identity/services/auth.service';
import { UsersService } from '../../src/modules/identity/services/users.service';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('AuthService', () => {
  const db = {
    usuario: { findUnique: jest.fn(), update: jest.fn() },
    sessaoRefresh: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access') };
  const ctx = { userId: 'user-id' };
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon.hash('secret');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      { db } as unknown as DatabaseService,
      {} as UsersService,
      jwt as never,
      ctx as unknown as RequestContext,
    );
  });

  const buildUser = (usuarioAtivo: boolean) => ({
    usuarioId: 'user-id',
    usuarioAtivo,
    senha: { senhaHash: passwordHash },
    perfil: { perfilNome: 'ADMIN' },
  });

  describe('login', () => {
    it('should issue tokens when the user is active and the password is correct', async () => {
      db.usuario.findUnique.mockResolvedValue(buildUser(true));

      const tokens = await service.login({
        email: 'a@oficina.local',
        senha: 'secret',
      });

      expect(tokens.accessToken).toBe('access');
      expect(db.usuario.update).toHaveBeenCalled();
    });

    it('should throw the generic UnauthorizedException when the user is inactive', async () => {
      db.usuario.findUnique.mockResolvedValue(buildUser(false));

      await expect(
        service.login({ email: 'a@oficina.local', senha: 'secret' }),
      ).rejects.toThrow(
        new UnauthorizedException('E-mail ou senha incorretos'),
      );
      expect(db.usuario.update).not.toHaveBeenCalled();
      expect(db.sessaoRefresh.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const buildSession = (usuarioAtivo: boolean) => ({
      sessaoId: 'session-id',
      usuarioId: 'user-id',
      sessaoFamiliaId: 'family-id',
      sessaoExpiraEm: new Date(Date.now() + 60_000),
      usuario: { usuarioAtivo, perfil: { perfilNome: 'ADMIN' } },
    });

    it('should revoke the token family and reject when the user is inactive', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(buildSession(false));

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(db.sessaoRefresh.updateMany).toHaveBeenCalledWith({
        where: { sessaoFamiliaId: 'family-id', sessaoRevogadaEm: null },
        data: { sessaoRevogadaEm: expect.any(Date) },
      });
      expect(db.sessaoRefresh.create).not.toHaveBeenCalled();
    });

    it('should rotate the token when the user is active', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(buildSession(true));
      db.sessaoRefresh.updateMany.mockResolvedValue({ count: 1 });

      const tokens = await service.refresh('token');

      expect(tokens.accessToken).toBe('access');
      expect(db.sessaoRefresh.create).toHaveBeenCalled();
    });
  });
});
