import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon from 'argon2';
import { createHash } from 'node:crypto';
import { RequestContext, Role } from '../../src/modules/identity/auth';
import { RegisterUserDto } from '../../src/modules/identity/dtos';
import { AuthService } from '../../src/modules/identity/services/auth.service';
import { UsersService } from '../../src/modules/identity/services/users.service';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('AuthService (register, login e refresh)', () => {
  const db = {
    perfil: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn(), update: jest.fn() },
    sessaoRefresh: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access') };
  const usersService = { createUser: jest.fn() };
  const ctx = { userId: 'user-id', requireUser: jest.fn() };
  let service: AuthService;
  let passwordHash: string;

  const payload = {
    usuarioNome: 'Fulano',
    usuarioEmail: 'fulano@example.com',
    usuarioDocumento: '52998224725',
    usuarioTipoDocumento: 'CPF',
    senha: 'uma-senha-bem-longa',
    perfilId: 'perfil-id',
  } as RegisterUserDto;

  beforeAll(async () => {
    passwordHash = await argon.hash('secret');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ctx.requireUser.mockReturnValue({ userId: 'user-id', role: Role.ADMIN });
    service = new AuthService(
      { db } as unknown as DatabaseService,
      usersService as unknown as UsersService,
      jwt as never,
      ctx as unknown as RequestContext,
    );
  });

  describe('register', () => {
    it('should hash the password with argon2 and never pass the plain password on', async () => {
      db.perfil.findUnique.mockResolvedValue({ perfilNome: Role.CUSTOMER });
      usersService.createUser.mockResolvedValue({ usuarioId: 'new-id' });

      await service.register(payload);

      const [dto] = usersService.createUser.mock.calls[0] as [
        Record<string, string>,
      ];
      expect(dto['senha']).toBeUndefined();
      expect(dto['senhaHash']).toMatch(/^\$argon2/);
      expect(await argon.verify(dto['senhaHash'], payload.senha)).toBe(true);
    });

    it('should throw NotFoundException when the profile does not exist', async () => {
      db.perfil.findUnique.mockResolvedValue(null);

      await expect(service.register(payload)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a non-admin creates an admin', async () => {
      db.perfil.findUnique.mockResolvedValue({ perfilNome: Role.ADMIN });
      ctx.requireUser.mockReturnValue({
        userId: 'att',
        role: Role.ATTENDANT,
      });

      await expect(service.register(payload)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should let an admin create another admin', async () => {
      db.perfil.findUnique.mockResolvedValue({ perfilNome: Role.ADMIN });
      usersService.createUser.mockResolvedValue({ usuarioId: 'new-id' });

      await expect(service.register(payload)).resolves.toBeDefined();
    });
  });

  describe('login', () => {
    it('should throw the generic UnauthorizedException when the e-mail does not exist', async () => {
      db.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@example.com', senha: 'secret' }),
      ).rejects.toThrow('E-mail ou senha incorretos');
    });

    it('should throw the generic UnauthorizedException when the password is wrong', async () => {
      db.usuario.findUnique.mockResolvedValue({
        usuarioId: 'user-id',
        usuarioAtivo: true,
        senha: { senhaHash: passwordHash },
        perfil: { perfilNome: Role.ADMIN },
      });

      await expect(
        service.login({ email: 'a@example.com', senha: 'wrong' }),
      ).rejects.toThrow('E-mail ou senha incorretos');
      expect(db.sessaoRefresh.create).not.toHaveBeenCalled();
    });

    it('should reject a customer that has no password', async () => {
      db.usuario.findUnique.mockResolvedValue({
        usuarioId: 'user-id',
        usuarioAtivo: true,
        senha: null,
        perfil: { perfilNome: Role.CUSTOMER },
      });

      await expect(
        service.login({ email: 'a@example.com', senha: 'secret' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const session = (overrides: Record<string, unknown> = {}) => ({
      sessaoId: 'session-id',
      usuarioId: 'user-id',
      sessaoFamiliaId: 'family-id',
      sessaoExpiraEm: new Date(Date.now() + 60_000),
      usuario: { usuarioAtivo: true, perfil: { perfilNome: Role.ADMIN } },
      ...overrides,
    });

    it('should throw UnauthorizedException when the refresh token is unknown', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should look the session up by the SHA-256 of the token, never by the token itself', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(null);

      await service.refresh('my-token').catch(() => undefined);

      expect(db.sessaoRefresh.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessaoTokenHash: createHash('sha256')
              .update('my-token')
              .digest('hex'),
          },
        }),
      );
    });

    it('should not consume the token when it belongs to another user', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(
        session({ usuarioId: 'someone-else' }),
      );

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(db.sessaoRefresh.updateMany).not.toHaveBeenCalled();
    });

    it('should revoke the whole family when an already used token is presented again', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(session());
      db.sessaoRefresh.updateMany
        .mockResolvedValueOnce({ count: 0 }) // rotação: já estava revogado
        .mockResolvedValueOnce({ count: 3 }); // revogação da família

      await expect(service.refresh('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(db.sessaoRefresh.updateMany).toHaveBeenLastCalledWith({
        where: { sessaoFamiliaId: 'family-id', sessaoRevogadaEm: null },
        data: { sessaoRevogadaEm: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException when the refresh token expired', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(
        session({ sessaoExpiraEm: new Date(Date.now() - 1000) }),
      );
      db.sessaoRefresh.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.refresh('token')).rejects.toThrow(
        'Refresh token expirado',
      );
    });
  });

  describe('logout', () => {
    it('should revoke the whole family of the token', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue({
        sessaoFamiliaId: 'family-id',
      });

      await service.logout('token');

      expect(db.sessaoRefresh.updateMany).toHaveBeenCalledWith({
        where: { sessaoFamiliaId: 'family-id', sessaoRevogadaEm: null },
        data: { sessaoRevogadaEm: expect.any(Date) },
      });
    });

    it('should do nothing when the token is unknown', async () => {
      db.sessaoRefresh.findUnique.mockResolvedValue(null);

      await expect(service.logout('unknown')).resolves.toBeUndefined();
      expect(db.sessaoRefresh.updateMany).not.toHaveBeenCalled();
    });
  });
});
