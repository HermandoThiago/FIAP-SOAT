import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../src/generated/prisma/client';
import { RequestContext, Role } from '../../src/modules/identity/auth';
import { UsersService } from '../../src/modules/identity/services';
import { VehiclesService } from '../../src/modules/customers/services';
import { CreateVehicleDto } from '../../src/modules/customers/dtos';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('VehiclesService', () => {
  const vehicleId = 'vehicle-id';
  const stored = {
    veiculoId: vehicleId,
    usuarioId: 'customer-id',
    veiculoPlaca: 'ABC1D23',
    veiculoChassi: null,
    veiculoMarca: 'Fiat',
    veiculoModelo: 'Argo',
    veiculoAnoFabricacao: 2022,
    veiculoCor: 'Prata',
    veiculoKmAtual: null,
    veiculoAtivo: true,
    veiculoInativadoEm: null,
    veiculoCriadoEm: new Date(),
    veiculoAtualizadoEm: new Date(),
  };
  const payload: CreateVehicleDto = {
    usuarioId: 'customer-id',
    veiculoPlaca: 'ABC1D23',
    veiculoMarca: 'Fiat',
    veiculoModelo: 'Argo',
    veiculoAnoFabricacao: 2022,
    veiculoCor: 'Prata',
  };

  const tx = {
    veiculo: { findFirst: jest.fn(), update: jest.fn() },
    ordemServico: { count: jest.fn() },
  };
  const db = {
    veiculo: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const usersService = { findUserById: jest.fn() };
  const ctx: { user?: { userId: string; role: Role } } = {};
  let service: VehiclesService;

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('db error', {
      code,
      clientVersion: 'test',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    ctx.user = { userId: 'attendant-id', role: Role.ATTENDANT };
    usersService.findUserById.mockResolvedValue({
      usuarioId: 'customer-id',
      perfil: { perfilNome: Role.CUSTOMER },
    });
    service = new VehiclesService(
      { db } as unknown as DatabaseService,
      ctx as unknown as RequestContext,
      usersService as unknown as UsersService,
    );
  });

  describe('createVehicle', () => {
    it('should create the vehicle when the owner is a customer and the plate is free', async () => {
      db.veiculo.findFirst.mockResolvedValue(null);
      db.veiculo.create.mockResolvedValue(stored);

      const result = await service.createVehicle(payload);

      expect(db.veiculo.create).toHaveBeenCalledWith({ data: payload });
      expect(result.veiculoPlaca).toBe('ABC1D23');
    });

    it('should throw NotFoundException when the owner does not exist', async () => {
      usersService.findUserById.mockRejectedValue(new NotFoundException());

      await expect(service.createVehicle(payload)).rejects.toThrow(
        'Cliente não encontrado',
      );
      expect(db.veiculo.create).not.toHaveBeenCalled();
    });

    it('should propagate unexpected errors when looking up the owner fails', async () => {
      const error = new Error('db down');
      usersService.findUserById.mockRejectedValue(error);

      await expect(service.createVehicle(payload)).rejects.toBe(error);
    });

    it('should throw UnprocessableEntityException when the owner is not a customer', async () => {
      usersService.findUserById.mockResolvedValue({
        perfil: { perfilNome: Role.MECHANIC },
      });

      await expect(service.createVehicle(payload)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('should throw ConflictException when the plate belongs to another active vehicle', async () => {
      db.veiculo.findFirst.mockResolvedValueOnce({ veiculoId: 'other' });

      await expect(service.createVehicle(payload)).rejects.toThrow(
        'Placa já cadastrada',
      );
      expect(db.veiculo.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { veiculoPlaca: 'ABC1D23', veiculoAtivo: true },
        }),
      );
    });

    it('should throw ConflictException when the chassis belongs to another active vehicle', async () => {
      db.veiculo.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ veiculoId: 'other' });

      await expect(
        service.createVehicle({
          ...payload,
          veiculoChassi: '9BWZZZ377VT004251',
        }),
      ).rejects.toThrow('Chassi já cadastrado');
    });

    it('should throw ConflictException when the database rejects a duplicate (race)', async () => {
      db.veiculo.findFirst.mockResolvedValue(null);
      db.veiculo.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.createVehicle(payload)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findVehicleById', () => {
    it('should throw NotFoundException when the vehicle is inactive or missing', async () => {
      db.veiculo.findFirst.mockResolvedValue(null);

      await expect(service.findVehicleById(vehicleId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(db.veiculo.findFirst).toHaveBeenCalledWith({
        where: { veiculoId: vehicleId, veiculoAtivo: true },
      });
    });

    it('should return the vehicle when it is active', async () => {
      db.veiculo.findFirst.mockResolvedValue(stored);

      await expect(service.findVehicleById(vehicleId)).resolves.toMatchObject({
        veiculoId: vehicleId,
      });
    });
  });

  describe('findAll', () => {
    it('should list only active vehicles when no filter is given', async () => {
      db.veiculo.findMany.mockResolvedValue([stored]);
      db.veiculo.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 2, pageSize: 10 });

      expect(db.veiculo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { veiculoAtivo: true },
          take: 10,
          skip: 10,
        }),
      );
      expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 });
      expect(result.vehicles).toHaveLength(1);
    });

    it('should filter by owner and plate when they are given', async () => {
      db.veiculo.findMany.mockResolvedValue([]);
      db.veiculo.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        pageSize: 20,
        usuarioId: 'customer-id',
        veiculoPlaca: 'ABC1D23',
      });

      expect(db.veiculo.count).toHaveBeenCalledWith({
        where: {
          veiculoAtivo: true,
          usuarioId: 'customer-id',
          veiculoPlaca: 'ABC1D23',
        },
      });
    });
  });

  describe('updateVehicle', () => {
    beforeEach(() => {
      db.veiculo.findFirst.mockResolvedValueOnce(stored);
    });

    it('should update the data and the timestamp when the plate is unchanged', async () => {
      db.veiculo.update.mockResolvedValue({ ...stored, veiculoCor: 'Azul' });

      const result = await service.updateVehicle(vehicleId, {
        veiculoCor: 'Azul',
        veiculoPlaca: 'ABC1D23',
      });

      expect(result.veiculoCor).toBe('Azul');
      expect(db.veiculo.update).toHaveBeenCalledWith({
        where: { veiculoId: vehicleId },
        data: expect.objectContaining({
          veiculoCor: 'Azul',
          veiculoAtualizadoEm: expect.any(Date),
        }),
      });
    });

    it('should throw ForbiddenException when a non-admin changes the plate', async () => {
      await expect(
        service.updateVehicle(vehicleId, { veiculoPlaca: 'XYZ9Z99' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.veiculo.update).not.toHaveBeenCalled();
    });

    it('should change the plate when the user is admin and the plate is free', async () => {
      ctx.user = { userId: 'admin-id', role: Role.ADMIN };
      db.veiculo.findFirst.mockResolvedValueOnce(null);
      db.veiculo.update.mockResolvedValue({
        ...stored,
        veiculoPlaca: 'XYZ9Z99',
      });

      await service.updateVehicle(vehicleId, { veiculoPlaca: 'XYZ9Z99' });

      expect(db.veiculo.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            veiculoPlaca: 'XYZ9Z99',
            veiculoAtivo: true,
            NOT: { veiculoId: vehicleId },
          },
        }),
      );
      expect(db.veiculo.update).toHaveBeenCalled();
    });

    it('should throw ConflictException when the admin picks a plate already in use', async () => {
      ctx.user = { userId: 'admin-id', role: Role.ADMIN };
      db.veiculo.findFirst.mockResolvedValueOnce({ veiculoId: 'other' });

      await expect(
        service.updateVehicle(vehicleId, { veiculoPlaca: 'XYZ9Z99' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should check the chassis when it changes', async () => {
      db.veiculo.findFirst.mockResolvedValueOnce({ veiculoId: 'other' });

      await expect(
        service.updateVehicle(vehicleId, {
          veiculoChassi: '9BWZZZ377VT004251',
        }),
      ).rejects.toThrow('Chassi já cadastrado');
    });

    it('should throw NotFoundException when the vehicle disappears before the update', async () => {
      db.veiculo.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.updateVehicle(vehicleId, { veiculoCor: 'Azul' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ConflictException when the database rejects a duplicate on update', async () => {
      db.veiculo.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.updateVehicle(vehicleId, { veiculoCor: 'Azul' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deleteVehicle', () => {
    it('should deactivate the vehicle when it has no open service order', async () => {
      tx.veiculo.findFirst.mockResolvedValue({ veiculoId: vehicleId });
      tx.ordemServico.count.mockResolvedValue(0);

      await expect(service.deleteVehicle(vehicleId)).resolves.toBeUndefined();

      expect(tx.ordemServico.count).toHaveBeenCalledWith({
        where: {
          veiculoId: vehicleId,
          ordemServicoStatus: {
            notIn: ['ENTREGUE', 'CANCELADA', 'ORCAMENTO_RECUSADO'],
          },
        },
      });
      expect(tx.veiculo.update).toHaveBeenCalledWith({
        where: { veiculoId: vehicleId },
        data: expect.objectContaining({
          veiculoAtivo: false,
          veiculoInativadoEm: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException when the vehicle does not exist or is inactive', async () => {
      tx.veiculo.findFirst.mockResolvedValue(null);

      await expect(service.deleteVehicle(vehicleId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(tx.veiculo.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException and keep the vehicle when it has an open service order', async () => {
      tx.veiculo.findFirst.mockResolvedValue({ veiculoId: vehicleId });
      tx.ordemServico.count.mockResolvedValue(1);

      await expect(service.deleteVehicle(vehicleId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.veiculo.update).not.toHaveBeenCalled();
    });
  });
});
