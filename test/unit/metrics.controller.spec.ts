import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ROLES_KEY, Role } from '../../src/modules/identity/auth';
import { MetricsController } from '../../src/modules/service-orders/controllers';
import { MetricsService } from '../../src/modules/service-orders/services';

describe('MetricsController', () => {
  let controller: MetricsController;
  const metricsService = { averageExecutionTime: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsService, useValue: metricsService }],
    }).compile();

    controller = module.get(MetricsController);
  });

  it('should delegate the query to MetricsService', async () => {
    const query = { serviceId: 's' };
    metricsService.averageExecutionTime.mockResolvedValue('metric');

    await expect(controller.averageExecutionTime(query)).resolves.toBe(
      'metric',
    );
    expect(metricsService.averageExecutionTime).toHaveBeenCalledWith(query);
  });

  it('should allow only the staff roles of the contract', () => {
    const roles = new Reflector().get<Role[]>(
      ROLES_KEY,
      MetricsController.prototype.averageExecutionTime,
    );

    expect(roles).toEqual([Role.ADMIN, Role.ATTENDANT, Role.MECHANIC]);
    expect(roles).not.toContain(Role.CUSTOMER);
  });
});
