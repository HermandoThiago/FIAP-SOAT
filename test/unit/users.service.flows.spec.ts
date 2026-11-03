import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../../src/generated/prisma/client';
import { RequestContext } from '../../src/modules/identity/auth';
import { CreateUserDto } from '../../src/modules/identity/dtos';
import { UsersService } from '../../src/modules/identity/services/users.service';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('UsersService (create, find e update)', () => {
  const stored = {
    usuarioId: 'user-id',
    usuarioNome: 'Fulano',
    usuarioEmail: 'fulano@example.com',
    usuarioDocumento: '52998224725',
    usuarioTipoDocumento: 'CPF',
    usuarioTelefone: null,
    perfilId: 'perfil-id',
  };
  const payload = {
    usuarioNome: 'Fulano',
    usuarioEmail: 'fulano@example.com',
    usuarioDocumento: '52998224725',
    usuarioTipoDocumento: 'CPF',
    perfilId: 'perfil-id',
    senhaHash: '$argon2id$hash',
  } as CreateUserDto;

  const db = {
    perfil: { findUnique: jest.fn() },
    usuario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const ctx = { userId: 'user-id' };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      { db } as unknown as DatabaseService,
      ctx as unknown as RequestContext,
    );
  });

  describe('createUser', () => {
    it('should create the user linked to the profile with the password in its own table', async () => {
      db.perfil.findUnique.mockResolvedValue({ perfilId: 'perfil-id' });
      db.usuario.findUnique.mockResolvedValue(null);
      db.usuario.create.mockResolvedValue(stored);

      const result = await service.createUser(
        payload,
        Buffer.alloc(0) as never,
      );

      expect(db.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          perfil: { connect: { perfilId: 'perfil-id' } },
          senha: { create: { senhaHash: '$argon2id$hash' } },
        }) as unknown,
      });
      expect(result.usuarioEmail).toBe('fulano@example.com');
      expect(result.perfilId).toBeUndefined();
    });

    it('should throw NotFoundException when the profile does not exist', async () => {
      db.perfil.findUnique.mockResolvedValue(null);

      await expect(
        service.createUser(payload, Buffer.alloc(0) as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ConflictException when the e-mail is already registered', async () => {
      db.perfil.findUnique.mockResolvedValue({ perfilId: 'perfil-id' });
      db.usuario.findUnique.mockResolvedValueOnce(stored);

      await expect(
        service.createUser(payload, Buffer.alloc(0) as never),
      ).rejects.toThrow('E-mail já cadastrado');
    });

    it('should throw ConflictException when the document is already registered', async () => {
      db.perfil.findUnique.mockResolvedValue({ perfilId: 'perfil-id' });
      db.usuario.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(stored);

      await expect(
        service.createUser(payload, Buffer.alloc(0) as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.usuario.create).not.toHaveBeenCalled();
    });

    it('should pass the optional phone along when informed', async () => {
      db.perfil.findUnique.mockResolvedValue({ perfilId: 'perfil-id' });
      db.usuario.findUnique.mockResolvedValue(null);
      db.usuario.create.mockResolvedValue(stored);

      await service.createUser(
        { ...payload, usuarioTelefone: '85999990000' },
        Buffer.alloc(0) as never,
      );

      expect(db.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioTelefone: '85999990000',
        }) as unknown,
      });
    });
  });

  describe('findUserById', () => {
    it('should return the active user without the internal fields', async () => {
      db.usuario.findFirst.mockResolvedValue({
        ...stored,
        usuarioAtivo: true,
        perfil: { perfilNome: 'Cliente' },
      });

      const result = await service.findUserById('user-id');

      expect(result.usuarioId).toBe('user-id');
      expect(result.usuarioAtivo).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('should update the own profile and refresh the update date', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);
      db.usuario.update.mockResolvedValue({ ...stored, usuarioNome: 'Novo' });

      const result = await service.updateUser('user-id', {
        usuarioNome: 'Novo',
      });

      expect(db.usuario.update).toHaveBeenCalledWith({
        where: { usuarioId: 'user-id' },
        data: expect.objectContaining({
          usuarioNome: 'Novo',
          usuarioAtualizadoEm: expect.any(Date) as unknown,
        }) as unknown,
      });
      expect(result.usuarioNome).toBe('Novo');
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      db.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.updateUser('user-id', { usuarioNome: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw UnauthorizedException when changing another user', async () => {
      db.usuario.findFirst.mockResolvedValue({ ...stored, usuarioId: 'other' });

      await expect(
        service.updateUser('other', { usuarioNome: 'X' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(db.usuario.update).not.toHaveBeenCalled();
    });

    it('should translate P2025 into NotFoundException and propagate other errors', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);
      db.usuario.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('gone', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.updateUser('user-id', { usuarioNome: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const error = new Error('db down');
      db.usuario.update.mockRejectedValueOnce(error);
      await expect(
        service.updateUser('user-id', { usuarioNome: 'X' }),
      ).rejects.toBe(error);
    });
  });
});
