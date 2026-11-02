import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../src/generated/prisma/client';
import { CatalogService } from '../../src/modules/catalog/services/catalog.service';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('CatalogService', () => {
  const serviceId = 'service-id';
  const stored = {
    servicoId: serviceId,
    servicoNome: 'Troca de óleo',
    servicoDescricao: null,
    servicoPrecoBase: 15000,
    servicoAtivo: true,
    servicoCriadoEm: new Date(),
    servicoAtualizadoEm: new Date(),
  };

  const db = {
    servico: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  let service: CatalogService;

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('db error', {
      code,
      clientVersion: 'test',
    });

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CatalogService({ db } as unknown as DatabaseService);
  });

  describe('createService', () => {
    const payload = { servicoNome: 'Troca de óleo', servicoPrecoBase: 15000 };

    it('should create the service when the name is free', async () => {
      db.servico.findFirst.mockResolvedValue(null);
      db.servico.create.mockResolvedValue(stored);

      await expect(service.createService(payload)).resolves.toMatchObject({
        servicoId: serviceId,
      });
      expect(db.servico.create).toHaveBeenCalledWith({ data: payload });
    });

    it('should check the name ignoring case', async () => {
      db.servico.findFirst.mockResolvedValue(null);
      db.servico.create.mockResolvedValue(stored);

      await service.createService(payload);

      expect(db.servico.findFirst).toHaveBeenCalledWith({
        where: {
          servicoNome: { equals: 'Troca de óleo', mode: 'insensitive' },
        },
        select: { servicoAtivo: true },
      });
    });

    it('should throw ConflictException when an active service has the same name', async () => {
      db.servico.findFirst.mockResolvedValue({ servicoAtivo: true });

      await expect(service.createService(payload)).rejects.toThrow(
        'Já existe um serviço com esse nome',
      );
      expect(db.servico.create).not.toHaveBeenCalled();
    });

    it('should tell the name belongs to an inactive service when that is the case', async () => {
      db.servico.findFirst.mockResolvedValue({ servicoAtivo: false });

      await expect(service.createService(payload)).rejects.toThrow(
        'Já existe um serviço inativo com esse nome',
      );
    });

    it('should throw ConflictException when the database rejects a duplicate (race)', async () => {
      db.servico.findFirst.mockResolvedValue(null);
      db.servico.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.createService(payload)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should propagate unexpected database errors', async () => {
      const error = new Error('db down');
      db.servico.findFirst.mockResolvedValue(null);
      db.servico.create.mockRejectedValue(error);

      await expect(service.createService(payload)).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('should list only active services when no filter is given', async () => {
      db.servico.findMany.mockResolvedValue([stored]);
      db.servico.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 2,
        pageSize: 10,
        servicoAtivo: true,
      });

      expect(db.servico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { servicoAtivo: true },
          take: 10,
          skip: 10,
        }),
      );
      expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 });
      expect(result.services).toHaveLength(1);
    });

    it('should search by partial name and list inactive services when asked', async () => {
      db.servico.findMany.mockResolvedValue([]);
      db.servico.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        pageSize: 20,
        servicoAtivo: false,
        servicoNome: 'óleo',
      });

      expect(db.servico.count).toHaveBeenCalledWith({
        where: {
          servicoAtivo: false,
          servicoNome: { contains: 'óleo', mode: 'insensitive' },
        },
      });
    });
  });

  describe('findServiceById', () => {
    it('should return the service when it is active', async () => {
      db.servico.findFirst.mockResolvedValue(stored);

      await expect(service.findServiceById(serviceId)).resolves.toMatchObject({
        servicoPrecoBase: 15000,
      });
      expect(db.servico.findFirst).toHaveBeenCalledWith({
        where: { servicoId: serviceId, servicoAtivo: true },
      });
    });

    it('should throw NotFoundException when the service is inactive or missing', async () => {
      db.servico.findFirst.mockResolvedValue(null);

      await expect(service.findServiceById(serviceId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateService', () => {
    beforeEach(() => {
      db.servico.findFirst.mockResolvedValueOnce(stored);
    });

    it('should update the price and the timestamp when the name is unchanged', async () => {
      db.servico.update.mockResolvedValue({
        ...stored,
        servicoPrecoBase: 18000,
      });

      const result = await service.updateService(serviceId, {
        servicoPrecoBase: 18000,
        servicoNome: 'Troca de óleo',
      });

      expect(result.servicoPrecoBase).toBe(18000);
      expect(db.servico.findFirst).toHaveBeenCalledTimes(1); // sem checagem de nome
      expect(db.servico.update).toHaveBeenCalledWith({
        where: { servicoId: serviceId },
        data: expect.objectContaining({
          servicoPrecoBase: 18000,
          servicoAtualizadoEm: expect.any(Date),
        }),
      });
    });

    it('should check the new name against other services when it changes', async () => {
      db.servico.findFirst.mockResolvedValueOnce(null);
      db.servico.update.mockResolvedValue({
        ...stored,
        servicoNome: 'Troca de óleo sintético',
      });

      await service.updateService(serviceId, {
        servicoNome: 'Troca de óleo sintético',
      });

      expect(db.servico.findFirst).toHaveBeenLastCalledWith({
        where: {
          servicoNome: {
            equals: 'Troca de óleo sintético',
            mode: 'insensitive',
          },
          NOT: { servicoId: serviceId },
        },
        select: { servicoAtivo: true },
      });
    });

    it('should throw ConflictException when the new name is already in use', async () => {
      db.servico.findFirst.mockResolvedValueOnce({ servicoAtivo: true });

      await expect(
        service.updateService(serviceId, { servicoNome: 'Alinhamento' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.servico.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the service disappears before the update', async () => {
      db.servico.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.updateService(serviceId, { servicoPrecoBase: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ConflictException when the database rejects a duplicate on update', async () => {
      db.servico.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.updateService(serviceId, { servicoPrecoBase: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deleteService', () => {
    it('should deactivate the service when it is active', async () => {
      db.servico.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.deleteService(serviceId)).resolves.toBeUndefined();
      expect(db.servico.updateMany).toHaveBeenCalledWith({
        where: { servicoId: serviceId, servicoAtivo: true },
        data: { servicoAtivo: false, servicoAtualizadoEm: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when the service does not exist or is already inactive', async () => {
      db.servico.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.deleteService(serviceId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
