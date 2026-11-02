import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../src/generated/prisma/client';
import { StatusOrdemServico } from '../../src/generated/prisma/enums';
import { Role } from '../../src/modules/identity/auth';
import { CreateCustomerDto } from '../../src/modules/customers/dtos';
import { CustomersService } from '../../src/modules/customers/services';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('CustomersService', () => {
  const customerId = 'customer-id';
  const stored = {
    usuarioId: customerId,
    perfilId: 'perfil-id',
    usuarioNome: 'Maria da Silva',
    usuarioEmail: 'maria@example.com',
    usuarioDocumento: '52998224725',
    usuarioTipoDocumento: 'CPF',
    usuarioTelefone: '85999990000',
    usuarioUltimoAcesso: null,
    usuarioAtivo: true,
    usuarioInativadoEm: null,
    usuarioCriadoEm: new Date(),
    usuarioAtualizadoEm: new Date(),
  };
  const payload: CreateCustomerDto = {
    usuarioNome: 'Maria da Silva',
    usuarioEmail: 'maria@example.com',
    usuarioDocumento: '52998224725',
    usuarioTipoDocumento: 'CPF',
    usuarioTelefone: '85999990000',
  };

  const tx = {
    ordemServico: { count: jest.fn() },
    usuario: { updateMany: jest.fn() },
    sessaoRefresh: { updateMany: jest.fn() },
  };
  const db = {
    perfil: { findUnique: jest.fn() },
    usuario: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  let service: CustomersService;

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('db error', {
      code,
      clientVersion: 'test',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    db.perfil.findUnique.mockResolvedValue({ perfilId: 'perfil-id' });
    service = new CustomersService({ db } as unknown as DatabaseService);
  });

  describe('createCustomer', () => {
    it('should create the customer with the Cliente profile and no password', async () => {
      db.usuario.findFirst.mockResolvedValue(null);
      db.usuario.create.mockResolvedValue(stored);

      const result = await service.createCustomer(payload);

      expect(db.perfil.findUnique).toHaveBeenCalledWith({
        where: { perfilNome: Role.CUSTOMER },
      });
      expect(db.usuario.create).toHaveBeenCalledWith({
        data: { ...payload, perfilId: 'perfil-id' },
      });
      expect(result.usuarioDocumento).toBe('52998224725');
      expect(result.perfilId).toBeUndefined(); // @Exclude: nunca vai na resposta
    });

    it('should throw UnprocessableEntityException when the Cliente profile is not configured', async () => {
      db.perfil.findUnique.mockResolvedValue(null);

      await expect(service.createCustomer(payload)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(db.usuario.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the e-mail is already registered', async () => {
      db.usuario.findFirst.mockResolvedValueOnce({ usuarioId: 'other' });

      await expect(service.createCustomer(payload)).rejects.toThrow(
        'E-mail já cadastrado',
      );
      expect(db.usuario.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the document is already registered', async () => {
      db.usuario.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ usuarioId: 'other' });

      await expect(service.createCustomer(payload)).rejects.toThrow(
        'Documento já cadastrado',
      );
      expect(db.usuario.create).not.toHaveBeenCalled();
    });

    it('should translate a unique violation raised by the database into ConflictException', async () => {
      db.usuario.findFirst.mockResolvedValue(null);
      db.usuario.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.createCustomer(payload)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should propagate unexpected database errors', async () => {
      const error = new Error('db down');
      db.usuario.findFirst.mockResolvedValue(null);
      db.usuario.create.mockRejectedValue(error);

      await expect(service.createCustomer(payload)).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('should list only active customers with pagination', async () => {
      db.usuario.findMany.mockResolvedValue([stored]);
      db.usuario.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 2, pageSize: 10 });

      expect(db.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            usuarioAtivo: true,
            perfil: { perfilNome: Role.CUSTOMER },
          },
          take: 10,
          skip: 10,
        }),
      );
      expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 });
      expect(result.customers).toHaveLength(1);
    });

    it('should filter by document and by name when informed', async () => {
      db.usuario.findMany.mockResolvedValue([]);
      db.usuario.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        pageSize: 20,
        usuarioDocumento: '52998224725',
        usuarioNome: 'mar',
      });

      expect(db.usuario.count).toHaveBeenCalledWith({
        where: {
          usuarioAtivo: true,
          perfil: { perfilNome: Role.CUSTOMER },
          usuarioDocumento: '52998224725',
          usuarioNome: { contains: 'mar', mode: 'insensitive' },
        },
      });
    });
  });

  describe('findCustomerById', () => {
    it('should return the active customer', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);

      const result = await service.findCustomerById(customerId);

      expect(result.usuarioId).toBe(customerId);
      expect(db.usuario.findFirst).toHaveBeenCalledWith({
        where: {
          usuarioId: customerId,
          usuarioAtivo: true,
          perfil: { perfilNome: Role.CUSTOMER },
        },
      });
    });

    it('should throw NotFoundException when the customer does not exist, is inactive or is not a customer', async () => {
      db.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findCustomerById(customerId)).rejects.toThrow(
        'Cliente não encontrado',
      );
    });
  });

  describe('findCustomerByDocument', () => {
    it('should find the active customer by the digits of the document', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);

      const result = await service.findCustomerByDocument('529.982.247-25');

      expect(result.usuarioId).toBe(customerId);
      expect(db.usuario.findFirst).toHaveBeenCalledWith({
        where: {
          usuarioDocumento: '52998224725',
          usuarioAtivo: true,
          perfil: { perfilNome: Role.CUSTOMER },
        },
      });
    });

    it('should throw NotFoundException when no active customer has the document', async () => {
      db.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.findCustomerByDocument('52998224725'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateCustomer', () => {
    it('should update name and phone and refresh the update date', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);
      db.usuario.update.mockResolvedValue({
        ...stored,
        usuarioNome: 'Maria Souza',
      });

      const result = await service.updateCustomer(customerId, {
        usuarioNome: 'Maria Souza',
      });

      expect(db.usuario.update).toHaveBeenCalledWith({
        where: { usuarioId: customerId },
        data: {
          usuarioNome: 'Maria Souza',
          usuarioEmail: undefined,
          usuarioTelefone: undefined,
          usuarioAtualizadoEm: expect.any(Date) as unknown,
        },
      });
      expect(result.usuarioNome).toBe('Maria Souza');
    });

    it('should never change the document, even when it reaches the service', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);
      db.usuario.update.mockResolvedValue(stored);

      await service.updateCustomer(customerId, {
        usuarioNome: 'Maria',
        usuarioDocumento: '11144477735',
      } as never);

      const { data } = db.usuario.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(data).not.toHaveProperty('usuarioDocumento');
    });

    it('should not check the e-mail when it did not change', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);
      db.usuario.update.mockResolvedValue(stored);

      await service.updateCustomer(customerId, {
        usuarioEmail: stored.usuarioEmail,
      });

      expect(db.usuario.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when the new e-mail belongs to another user', async () => {
      db.usuario.findFirst
        .mockResolvedValueOnce(stored)
        .mockResolvedValueOnce({ usuarioId: 'other' });

      await expect(
        service.updateCustomer(customerId, { usuarioEmail: 'x@example.com' }),
      ).rejects.toThrow('E-mail já cadastrado');
      expect(db.usuario.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the customer does not exist', async () => {
      db.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCustomer(customerId, { usuarioNome: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should translate P2025 into NotFoundException when the customer vanishes before the update', async () => {
      db.usuario.findFirst.mockResolvedValue(stored);
      db.usuario.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.updateCustomer(customerId, { usuarioNome: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should translate P2002 into ConflictException when a concurrent update takes the e-mail', async () => {
      db.usuario.findFirst
        .mockResolvedValueOnce(stored)
        .mockResolvedValueOnce(null);
      db.usuario.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.updateCustomer(customerId, { usuarioEmail: 'x@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deleteCustomer', () => {
    beforeEach(() => {
      db.usuario.findFirst.mockResolvedValue(stored);
      tx.ordemServico.count.mockResolvedValue(0);
      tx.usuario.updateMany.mockResolvedValue({ count: 1 });
    });

    it('should deactivate the customer and revoke the sessions in one transaction', async () => {
      await service.deleteCustomer(customerId);

      expect(tx.usuario.updateMany).toHaveBeenCalledWith({
        where: { usuarioId: customerId, usuarioAtivo: true },
        data: expect.objectContaining({ usuarioAtivo: false }) as unknown,
      });
      expect(tx.sessaoRefresh.updateMany).toHaveBeenCalledWith({
        where: { usuarioId: customerId, sessaoRevogadaEm: null },
        data: { sessaoRevogadaEm: expect.any(Date) as unknown },
      });
    });

    it('should only count service orders that are still open', async () => {
      await service.deleteCustomer(customerId);

      expect(tx.ordemServico.count).toHaveBeenCalledWith({
        where: {
          usuarioId: customerId,
          ordemServicoStatus: {
            notIn: [
              StatusOrdemServico.ENTREGUE,
              StatusOrdemServico.CANCELADA,
              StatusOrdemServico.ORCAMENTO_RECUSADO,
            ],
          },
        },
      });
    });

    it('should throw ConflictException when the customer has open service orders', async () => {
      tx.ordemServico.count.mockResolvedValue(1);

      await expect(service.deleteCustomer(customerId)).rejects.toThrow(
        'ordens de serviço em aberto',
      );
      expect(tx.usuario.updateMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the customer does not exist', async () => {
      db.usuario.findFirst.mockResolvedValue(null);

      await expect(service.deleteCustomer(customerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the customer was deactivated concurrently', async () => {
      tx.usuario.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.deleteCustomer(customerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(tx.sessaoRefresh.updateMany).not.toHaveBeenCalled();
    });
  });
});
