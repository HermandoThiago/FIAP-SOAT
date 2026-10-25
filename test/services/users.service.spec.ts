import { NotFoundException } from '@nestjs/common';
import { RequestContext } from '../../src/modules/identity/auth';
import { DatabaseService } from '../../src/shared/database/database.service';
import { UsersService } from '../../src/modules/identity/services/users.service';

describe('UsersService', () => {
  const tx = {
    usuario: { updateMany: jest.fn() },
    sessaoRefresh: { updateMany: jest.fn() },
  };
  const db = {
    usuario: { findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      { db } as unknown as DatabaseService,
      { userId: 'admin-id' } as unknown as RequestContext,
    );
  });

  describe('deleteUser', () => {
    it('should deactivate the user and revoke its sessions when the user is active', async () => {
      tx.usuario.updateMany.mockResolvedValue({ count: 1 });
      tx.sessaoRefresh.updateMany.mockResolvedValue({ count: 2 });

      await expect(service.deleteUser('user-id')).resolves.toBeUndefined();

      expect(tx.usuario.updateMany).toHaveBeenCalledWith({
        where: { usuarioId: 'user-id', usuarioAtivo: true },
        data: expect.objectContaining({
          usuarioAtivo: false,
          usuarioInativadoEm: expect.any(Date),
        }),
      });
      expect(tx.sessaoRefresh.updateMany).toHaveBeenCalledWith({
        where: { usuarioId: 'user-id', sessaoRevogadaEm: null },
        data: { sessaoRevogadaEm: expect.any(Date) },
      });
    });

    it('should throw NotFoundException and keep sessions when the user does not exist or is already inactive', async () => {
      tx.usuario.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.deleteUser('user-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(tx.sessaoRefresh.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    it('should throw NotFoundException when the user is inactive', async () => {
      db.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findUserById('user-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(db.usuario.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId: 'user-id', usuarioAtivo: true },
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should list only active users when no profile filter is given', async () => {
      db.usuario.findMany.mockResolvedValue([]);
      db.usuario.count.mockResolvedValue(0);

      await service.findAll({ page: 1, pageSize: 10 });

      expect(db.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioAtivo: true } }),
      );
      expect(db.usuario.count).toHaveBeenCalledWith({
        where: { usuarioAtivo: true },
      });
    });
  });
});
