import { ParseUUIDPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ServicesController } from '../../src/modules/catalog/controllers/services.controller';
import { CreateServiceDto } from '../../src/modules/catalog/controllers/dtos/create-service.dto';
import { ListServicesQueryDto } from '../../src/modules/catalog/controllers/dtos/list-services-query.dto';
import { UpdateServiceDto } from '../../src/modules/catalog/controllers/dtos/update-service.dto';
import { CatalogService } from '../../src/modules/catalog/services/catalog.service';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  Role,
} from '../../src/modules/identity/auth';

describe('ServicesController', () => {
  let controller: ServicesController;
  const reflector = new Reflector();
  const catalogService = {
    createService: jest.fn(),
    findAll: jest.fn(),
    findServiceById: jest.fn(),
    updateService: jest.fn(),
    deleteService: jest.fn(),
  };
  const serviceId = '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11';

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [{ provide: CatalogService, useValue: catalogService }],
    }).compile();

    controller = module.get(ServicesController);
  });

  it('should delegate the creation to CatalogService and return the service', async () => {
    const payload = { servicoNome: 'Alinhamento' } as CreateServiceDto;
    const created = { servicoId: serviceId };
    catalogService.createService.mockResolvedValue(created);

    await expect(controller.createService(payload)).resolves.toBe(created);
    expect(catalogService.createService).toHaveBeenCalledWith(payload);
  });

  it('should delegate the query to CatalogService and return the page', async () => {
    const query = { page: 1, pageSize: 10 } as ListServicesQueryDto;
    const page = { services: [], total: 0, page: 1, pageSize: 10 };
    catalogService.findAll.mockResolvedValue(page);

    await expect(controller.findAllServices(query)).resolves.toBe(page);
    expect(catalogService.findAll).toHaveBeenCalledWith(query);
  });

  it('should return the service found by CatalogService', async () => {
    const found = { servicoId: serviceId };
    catalogService.findServiceById.mockResolvedValue(found);

    await expect(controller.findServiceById(serviceId)).resolves.toBe(found);
  });

  it('should delegate the id and payload to CatalogService when updating', async () => {
    const payload = { servicoPrecoBase: 9000 } as UpdateServiceDto;
    const updated = { servicoId: serviceId, servicoPrecoBase: 9000 };
    catalogService.updateService.mockResolvedValue(updated);

    await expect(controller.updateService(serviceId, payload)).resolves.toBe(
      updated,
    );
    expect(catalogService.updateService).toHaveBeenCalledWith(
      serviceId,
      payload,
    );
  });

  it('should deactivate the service and return nothing when deleting', async () => {
    catalogService.deleteService.mockResolvedValue(undefined);

    await expect(
      controller.deleteServiceById(serviceId),
    ).resolves.toBeUndefined();
    expect(catalogService.deleteService).toHaveBeenCalledWith(serviceId);
  });

  it('should propagate the error when CatalogService rejects', async () => {
    const error = new Error('not found');
    catalogService.findServiceById.mockRejectedValue(error);

    await expect(controller.findServiceById(serviceId)).rejects.toBe(error);
  });

  describe('route protection metadata', () => {
    const meta = <T>(key: string, name: keyof ServicesController) =>
      reflector.getAllAndOverride<T>(key, [
        ServicesController.prototype[name] as () => unknown,
        ServicesController,
      ]);

    it('should keep every route private', () => {
      for (const name of [
        'createService',
        'findAllServices',
        'findServiceById',
        'updateService',
        'deleteServiceById',
      ] as const) {
        expect(meta(IS_PUBLIC_KEY, name)).toBeUndefined();
      }
    });

    it('should allow reads to ADMIN, ATTENDANT and MECHANIC', () => {
      for (const name of ['findAllServices', 'findServiceById'] as const) {
        expect(meta(ROLES_KEY, name)).toEqual([
          Role.ADMIN,
          Role.ATTENDANT,
          Role.MECHANIC,
        ]);
      }
    });

    it('should allow create, update and delete only to ADMIN', () => {
      for (const name of [
        'createService',
        'updateService',
        'deleteServiceById',
      ] as const) {
        expect(meta(ROLES_KEY, name)).toEqual([Role.ADMIN]);
      }
    });

    it('should validate the serviceId param as UUID on every route with an id', () => {
      for (const name of [
        'findServiceById',
        'updateService',
        'deleteServiceById',
      ] as const) {
        const args = Reflect.getMetadata(
          '__routeArguments__',
          ServicesController,
          name,
        ) as Record<string, { data: string; pipes: unknown[] }>;
        const params = Object.values(args).filter(
          (arg) => arg.data === 'serviceId',
        );
        expect(params).toHaveLength(1);
        expect(params[0].pipes).toContain(ParseUUIDPipe);
      }
    });
  });
});
