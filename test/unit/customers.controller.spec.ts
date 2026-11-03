import { ParseUUIDPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { CustomersController } from '../../src/modules/customers/controllers';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  ListVehiclesQueryDto,
  UpdateCustomerDto,
} from '../../src/modules/customers/dtos';
import {
  CustomersService,
  VehiclesService,
} from '../../src/modules/customers/services';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  Role,
} from '../../src/modules/identity/auth';

describe('CustomersController', () => {
  let controller: CustomersController;
  const reflector = new Reflector();
  const customersService = {
    createCustomer: jest.fn(),
    findAll: jest.fn(),
    findCustomerById: jest.fn(),
    updateCustomer: jest.fn(),
    deleteCustomer: jest.fn(),
  };
  const vehiclesService = { findAll: jest.fn() };
  const customerId = '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11';

  const rolesOf = (handler: object) =>
    reflector.get<Role[]>(ROLES_KEY, handler as never);

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: customersService },
        { provide: VehiclesService, useValue: vehiclesService },
      ],
    }).compile();

    controller = module.get(CustomersController);
  });

  it('should delegate the creation to CustomersService', async () => {
    const payload = { usuarioNome: 'Maria' } as CreateCustomerDto;
    customersService.createCustomer.mockResolvedValue('created');

    await expect(controller.createCustomer(payload)).resolves.toBe('created');
    expect(customersService.createCustomer).toHaveBeenCalledWith(payload);
  });

  it('should delegate the listing, lookup, update and deletion', async () => {
    const query = { page: 1, pageSize: 20 } as ListCustomersQueryDto;
    const update = { usuarioNome: 'Maria' } as UpdateCustomerDto;
    customersService.findAll.mockResolvedValue('list');
    customersService.findCustomerById.mockResolvedValue('one');
    customersService.updateCustomer.mockResolvedValue('updated');
    customersService.deleteCustomer.mockResolvedValue(undefined);

    await expect(controller.findAllCustomers(query)).resolves.toBe('list');
    await expect(controller.findCustomerById(customerId)).resolves.toBe('one');
    await expect(controller.updateCustomer(customerId, update)).resolves.toBe(
      'updated',
    );
    await expect(
      controller.deleteCustomer(customerId),
    ).resolves.toBeUndefined();

    expect(customersService.updateCustomer).toHaveBeenCalledWith(
      customerId,
      update,
    );
    expect(customersService.deleteCustomer).toHaveBeenCalledWith(customerId);
  });

  it('should list the vehicles of the customer after checking that it exists', async () => {
    const query = { page: 1, pageSize: 20 } as ListVehiclesQueryDto;
    customersService.findCustomerById.mockResolvedValue('one');
    vehiclesService.findAll.mockResolvedValue('vehicles');

    await expect(
      controller.findCustomerVehicles(customerId, query),
    ).resolves.toBe('vehicles');

    expect(customersService.findCustomerById).toHaveBeenCalledWith(customerId);
    expect(vehiclesService.findAll).toHaveBeenCalledWith({
      ...query,
      usuarioId: customerId,
    });
  });

  it('should not list the vehicles when the customer does not exist', async () => {
    customersService.findCustomerById.mockRejectedValue(new Error('404'));

    await expect(
      controller.findCustomerVehicles(customerId, {} as ListVehiclesQueryDto),
    ).rejects.toThrow('404');
    expect(vehiclesService.findAll).not.toHaveBeenCalled();
  });

  it('should restrict the routes to the roles of the contract', () => {
    const proto = CustomersController.prototype;
    const readers = [Role.ADMIN, Role.ATTENDANT, Role.MECHANIC];
    const writers = [Role.ADMIN, Role.ATTENDANT];

    expect(rolesOf(proto.createCustomer)).toEqual(writers);
    expect(rolesOf(proto.updateCustomer)).toEqual(writers);
    expect(rolesOf(proto.findAllCustomers)).toEqual(readers);
    expect(rolesOf(proto.findCustomerById)).toEqual(readers);
    expect(rolesOf(proto.findCustomerVehicles)).toEqual(readers);
    expect(rolesOf(proto.deleteCustomer)).toEqual([Role.ADMIN]);
  });

  it('should keep every route protected (none is public)', () => {
    const proto = CustomersController.prototype;

    for (const handler of [
      proto.createCustomer,
      proto.findAllCustomers,
      proto.findCustomerById,
      proto.updateCustomer,
      proto.deleteCustomer,
      proto.findCustomerVehicles,
    ]) {
      expect(reflector.get<boolean>(IS_PUBLIC_KEY, handler)).toBeUndefined();
    }
  });

  it('should validate the customer id as an UUID', () => {
    const pipe = new ParseUUIDPipe();

    return expect(
      pipe.transform('not-a-uuid', { type: 'param' }),
    ).rejects.toThrow();
  });
});
