import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ROLES_KEY, Role } from '../../src/modules/identity/auth';
import { ServiceOrdersController } from '../../src/modules/service-orders/controllers';
import { ServiceOrdersService } from '../../src/modules/service-orders/services';

describe('ServiceOrdersController', () => {
  let controller: ServiceOrdersController;
  const reflector = new Reflector();
  const service = {
    createServiceOrder: jest.fn(),
    findAll: jest.fn(),
    findServiceOrderById: jest.fn(),
    updateServiceOrder: jest.fn(),
    cancelServiceOrder: jest.fn(),
    startDiagnosis: jest.fn(),
    startExecution: jest.fn(),
    completeServiceOrder: jest.fn(),
    deliverServiceOrder: jest.fn(),
    findStatusHistory: jest.fn(),
  };
  const id = '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11';

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [ServiceOrdersController],
      providers: [{ provide: ServiceOrdersService, useValue: service }],
    }).compile();
    controller = module.get(ServiceOrdersController);
  });

  const rolesOf = (handler: object) =>
    reflector.get<Role[]>(ROLES_KEY, handler as () => void);

  it('should delegate each route to ServiceOrdersService', async () => {
    service.createServiceOrder.mockResolvedValue('created');
    service.findAll.mockResolvedValue('list');
    service.findServiceOrderById.mockResolvedValue('one');
    service.updateServiceOrder.mockResolvedValue('updated');
    service.cancelServiceOrder.mockResolvedValue('cancelled');

    const create = { clientId: 'a' } as never;
    const query = { page: 1, pageSize: 20 } as never;
    const update = { ordemServicoDiagnostico: 'x' } as never;
    const cancel = { reason: 'x' } as never;

    await expect(controller.createServiceOrder(create)).resolves.toBe(
      'created',
    );
    await expect(controller.findAllServiceOrders(query)).resolves.toBe('list');
    await expect(controller.findServiceOrderById(id)).resolves.toBe('one');
    await expect(controller.updateServiceOrderById(id, update)).resolves.toBe(
      'updated',
    );
    await expect(controller.cancelServiceOrderById(id, cancel)).resolves.toBe(
      'cancelled',
    );

    expect(service.createServiceOrder).toHaveBeenCalledWith(create);
    expect(service.updateServiceOrder).toHaveBeenCalledWith(id, update);
    expect(service.cancelServiceOrder).toHaveBeenCalledWith(id, cancel);
  });

  it('should restrict the routes to the expected roles', () => {
    const proto = ServiceOrdersController.prototype;

    expect(rolesOf(proto.createServiceOrder)).toEqual([
      Role.ADMIN,
      Role.ATTENDANT,
    ]);
    expect(rolesOf(proto.findAllServiceOrders)).not.toContain(Role.CUSTOMER);
    expect(rolesOf(proto.findServiceOrderById)).toContain(Role.CUSTOMER);
    expect(rolesOf(proto.updateServiceOrderById)).not.toContain(Role.CUSTOMER);
    expect(rolesOf(proto.cancelServiceOrderById)).toEqual([Role.ADMIN]);
  });

  it.each([
    ['startDiagnosis', 'startDiagnosis'],
    ['startExecution', 'startExecution'],
    ['completeServiceOrder', 'completeServiceOrder'],
    ['deliverServiceOrder', 'deliverServiceOrder'],
    ['findStatusHistory', 'findStatusHistory'],
  ] as const)(
    'should delegate %s to the service',
    async (method, serviceMethod) => {
      service[serviceMethod].mockResolvedValue('result');

      await expect(controller[method](id)).resolves.toBe('result');
      expect(service[serviceMethod]).toHaveBeenCalledWith(id);
    },
  );

  it('should restrict the command routes to the roles of the contract', () => {
    const proto = ServiceOrdersController.prototype;
    const mechanic = [Role.ADMIN, Role.MECHANIC];

    expect(rolesOf(proto.startDiagnosis)).toEqual(mechanic);
    expect(rolesOf(proto.startExecution)).toEqual(mechanic);
    expect(rolesOf(proto.completeServiceOrder)).toEqual(mechanic);
    expect(rolesOf(proto.deliverServiceOrder)).toEqual([
      Role.ADMIN,
      Role.ATTENDANT,
    ]);
    expect(rolesOf(proto.findStatusHistory)).not.toContain(Role.CUSTOMER);
  });
});
