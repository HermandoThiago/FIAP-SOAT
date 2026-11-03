import { ParseUUIDPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  Role,
} from '../../src/modules/identity/auth';
import { VehiclesController } from '../../src/modules/customers/controllers';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  UpdateVehicleDto,
} from '../../src/modules/customers/dtos';
import { VehiclesService } from '../../src/modules/customers/services';

describe('VehiclesController', () => {
  let controller: VehiclesController;
  const reflector = new Reflector();
  const vehiclesService = {
    createVehicle: jest.fn(),
    findAll: jest.fn(),
    findVehicleById: jest.fn(),
    updateVehicle: jest.fn(),
    deleteVehicle: jest.fn(),
  };
  const vehicleId = '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11';

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [{ provide: VehiclesService, useValue: vehiclesService }],
    }).compile();

    controller = module.get(VehiclesController);
  });

  it('should delegate the creation to VehiclesService and return the vehicle', async () => {
    const payload = { veiculoPlaca: 'ABC1D23' } as CreateVehicleDto;
    const created = { veiculoId: vehicleId };
    vehiclesService.createVehicle.mockResolvedValue(created);

    await expect(controller.createVehicle(payload)).resolves.toBe(created);
    expect(vehiclesService.createVehicle).toHaveBeenCalledWith(payload);
  });

  it('should delegate the query to VehiclesService and return the page', async () => {
    const query = { page: 1, pageSize: 10 } as ListVehiclesQueryDto;
    const page = { vehicles: [], total: 0, page: 1, pageSize: 10 };
    vehiclesService.findAll.mockResolvedValue(page);

    await expect(controller.findAllVehicles(query)).resolves.toBe(page);
    expect(vehiclesService.findAll).toHaveBeenCalledWith(query);
  });

  it('should return the vehicle found by VehiclesService', async () => {
    const vehicle = { veiculoId: vehicleId };
    vehiclesService.findVehicleById.mockResolvedValue(vehicle);

    await expect(controller.findVehicleById(vehicleId)).resolves.toBe(vehicle);
  });

  it('should delegate the id and payload to VehiclesService when updating', async () => {
    const payload = { veiculoCor: 'Azul' } as UpdateVehicleDto;
    const updated = { veiculoId: vehicleId, veiculoCor: 'Azul' };
    vehiclesService.updateVehicle.mockResolvedValue(updated);

    await expect(controller.updateVehicle(vehicleId, payload)).resolves.toBe(
      updated,
    );
    expect(vehiclesService.updateVehicle).toHaveBeenCalledWith(
      vehicleId,
      payload,
    );
  });

  it('should deactivate the vehicle and return nothing when deleting', async () => {
    vehiclesService.deleteVehicle.mockResolvedValue(undefined);

    await expect(
      controller.deleteVehicleById(vehicleId),
    ).resolves.toBeUndefined();
    expect(vehiclesService.deleteVehicle).toHaveBeenCalledWith(vehicleId);
  });

  it('should propagate the error when VehiclesService rejects', async () => {
    const error = new Error('not found');
    vehiclesService.findVehicleById.mockRejectedValue(error);

    await expect(controller.findVehicleById(vehicleId)).rejects.toBe(error);
  });

  describe('route protection metadata', () => {
    const meta = <T>(key: string, name: keyof VehiclesController) =>
      reflector.getAllAndOverride<T>(key, [
        VehiclesController.prototype[name] as () => unknown,
        VehiclesController,
      ]);
    const routes = [
      'createVehicle',
      'findAllVehicles',
      'findVehicleById',
      'updateVehicle',
      'deleteVehicleById',
    ] as const;

    it('should keep every route private', () => {
      for (const name of routes) {
        expect(meta(IS_PUBLIC_KEY, name)).toBeUndefined();
      }
    });

    it('should allow reads to ADMIN, ATTENDANT and MECHANIC', () => {
      for (const name of ['findAllVehicles', 'findVehicleById'] as const) {
        expect(meta(ROLES_KEY, name)).toEqual([
          Role.ADMIN,
          Role.ATTENDANT,
          Role.MECHANIC,
        ]);
      }
    });

    it('should allow writes to ADMIN and ATTENDANT and deletion only to ADMIN', () => {
      expect(meta(ROLES_KEY, 'createVehicle')).toEqual([
        Role.ADMIN,
        Role.ATTENDANT,
      ]);
      expect(meta(ROLES_KEY, 'updateVehicle')).toEqual([
        Role.ADMIN,
        Role.ATTENDANT,
      ]);
      expect(meta(ROLES_KEY, 'deleteVehicleById')).toEqual([Role.ADMIN]);
    });

    it('should validate the vehicleId param as UUID on every route with an id', () => {
      for (const name of [
        'findVehicleById',
        'updateVehicle',
        'deleteVehicleById',
      ] as const) {
        const args = Reflect.getMetadata(
          '__routeArguments__',
          VehiclesController,
          name,
        ) as Record<string, { data: string; pipes: unknown[] }>;
        const params = Object.values(args).filter(
          (arg) => arg.data === 'vehicleId',
        );
        expect(params).toHaveLength(1);
        expect(params[0].pipes).toContain(ParseUUIDPipe);
      }
    });
  });
});
