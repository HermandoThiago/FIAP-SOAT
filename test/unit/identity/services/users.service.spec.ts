import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { type CustomersService } from '../../../../src/modules/customers/services/customers.service';
import { PasswordHasher } from '../../../../src/modules/identity/services/password-hasher';
import { type RegisterUserCommand, UsersService } from '../../../../src/modules/identity/services/users.service';
import { FixedClock } from '../../../../src/shared/clock';
import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { Role } from '../../../../src/shared/domain/role';
import { FixedIdGenerator } from '../../../../src/shared/id-generator';
import { anActor, createPublisherStub, CUSTOMER_ID, FIXED_NOW, isUserRegistered, USER_ID } from '../fakes/builders';
import { InMemoryUserRepository } from '../fakes/in-memory-user.repository';

// Cadastro de usuários (contrato-api.md §3.1; RF-064; ADR-011) e seed do MANAGER (RF-062), com fakes em memória.
const hasher = new PasswordHasher(4);
const NEW_USER_ID = 'a7b3c9d1-2e4f-4a6b-8c1d-3e5f7a9b0c2d';

interface Setup {
  service: UsersService;
  repository: InMemoryUserRepository;
  findById: jest.Mock;
  published: ReturnType<typeof createPublisherStub>['published'];
}

function setup(customer: { id: string; name: string; active: boolean } | null = null): Setup {
  const repository = new InMemoryUserRepository();
  const findById = jest.fn().mockResolvedValue(customer);
  const customersService = { findById } as unknown as CustomersService;
  const { publisher, published } = createPublisherStub();
  const service = new UsersService(
    repository.asRepository(),
    hasher,
    customersService,
    publisher,
    new FixedIdGenerator([NEW_USER_ID, USER_ID]),
    new FixedClock(FIXED_NOW),
  );
  return { service, repository, findById, published };
}

function teamCommand(overrides: Partial<RegisterUserCommand> = {}): RegisterUserCommand {
  return {
    name: 'Mecânico da oficina',
    email: 'mechanic@test.oficina.local',
    password: 'mechanic-password',
    roles: [Role.MECHANIC],
    ...overrides,
  };
}

function customerCommand(overrides: Partial<RegisterUserCommand> = {}): RegisterUserCommand {
  return teamCommand({
    name: 'Cliente da oficina',
    email: 'customer@test.oficina.local',
    roles: [Role.CUSTOMER],
    customerId: CUSTOMER_ID,
    ...overrides,
  });
}

const activeCustomer = { id: CUSTOMER_ID, name: 'Cliente fictício', active: true };

describe('UsersService.register', () => {
  it('should create the team user with a hashed password when the actor is MANAGER', async () => {
    const { service, repository, published } = setup();

    const user = await service.register(teamCommand(), anActor(Role.MANAGER));

    expect(user.id).toBe(NEW_USER_ID);
    expect(user.name).toBe('Mecânico da oficina');
    expect(user.email.value).toBe('mechanic@test.oficina.local');
    expect(user.roles).toEqual([Role.MECHANIC]);
    expect(user.customerId).toBeUndefined();
    expect(user.active).toBe(true);
    expect(user.createdAt).toEqual(FIXED_NOW);
    expect(user.passwordHash.value).not.toContain('mechanic-password');
    await expect(hasher.verify('mechanic-password', user.passwordHash)).resolves.toBe(true);
    expect(repository.users).toEqual([user]);
    expect(published).toHaveLength(1);
    expect(isUserRegistered(published[0])).toBe(true);
    expect(published[0]).toMatchObject({ aggregateId: NEW_USER_ID, payload: { roles: [Role.MECHANIC] } });
  });

  it('should create the CUSTOMER user when the actor is ATTENDANT and the customer is active', async () => {
    const { service, findById } = setup(activeCustomer);

    const user = await service.register(customerCommand(), anActor(Role.ATTENDANT));

    expect(user.isCustomer()).toBe(true);
    expect(user.customerId).toBe(CUSTOMER_ID);
    expect(findById).toHaveBeenCalledWith(CUSTOMER_ID);
  });

  it('should create the CUSTOMER user when the actor is MANAGER', async () => {
    const { service } = setup(activeCustomer);

    await expect(service.register(customerCommand(), anActor(Role.MANAGER))).resolves.toMatchObject({
      customerId: CUSTOMER_ID,
    });
  });

  it('should reject with 403 when an ATTENDANT creates a team user', async () => {
    const { service, repository } = setup();

    await expect(service.register(teamCommand(), anActor(Role.ATTENDANT))).rejects.toThrow(ForbiddenException);
    expect(repository.users).toEqual([]);
  });

  it.each([[teamCommand()], [customerCommand()]])(
    'should reject with 403 when a MECHANIC creates any user (%o)',
    async (command) => {
      const { service } = setup(activeCustomer);

      await expect(service.register(command, anActor(Role.MECHANIC))).rejects.toThrow(ForbiddenException);
    },
  );

  it('should reject with 403 when a CUSTOMER actor creates a user', async () => {
    const { service } = setup(activeCustomer);

    await expect(service.register(customerCommand(), anActor(Role.CUSTOMER))).rejects.toThrow(ForbiddenException);
  });

  it('should reject with 422 on customerId when the role is CUSTOMER and customerId is missing', async () => {
    const { service, findById } = setup(activeCustomer);

    await expect(service.register(customerCommand({ customerId: undefined }), anActor(Role.MANAGER))).rejects.toThrow(
      expect.objectContaining({ field: 'customerId' }) as ValidationError,
    );
    expect(findById).not.toHaveBeenCalled();
  });

  it('should reject with 422 on roles when CUSTOMER is combined with a team role', async () => {
    const { service } = setup(activeCustomer);

    await expect(
      service.register(customerCommand({ roles: [Role.CUSTOMER, Role.ATTENDANT] }), anActor(Role.MANAGER)),
    ).rejects.toThrow(ValidationError);
  });

  it('should reject with 404 when the customer does not exist', async () => {
    const { service } = setup(null);

    await expect(service.register(customerCommand(), anActor(Role.ATTENDANT))).rejects.toThrow(
      new NotFoundException('Cliente não encontrado'),
    );
  });

  it('should reject with 404 when the customer is inactive', async () => {
    const { service } = setup({ ...activeCustomer, active: false });

    await expect(service.register(customerCommand(), anActor(Role.ATTENDANT))).rejects.toThrow(NotFoundException);
  });

  it('should reject with 409 when the e-mail is already registered', async () => {
    const { service } = setup();
    await service.register(teamCommand(), anActor(Role.MANAGER));

    await expect(
      service.register(teamCommand({ email: 'MECHANIC@test.oficina.local', name: 'Outro' }), anActor(Role.MANAGER)),
    ).rejects.toThrow(new ConflictException('E-mail já cadastrado'));
  });

  it('should reject with 422 on email when the e-mail is malformed', async () => {
    const { service } = setup();

    await expect(service.register(teamCommand({ email: 'not-an-email' }), anActor(Role.MANAGER))).rejects.toThrow(
      expect.objectContaining({ field: 'email' }) as ValidationError,
    );
  });
});

describe('UsersService.ensureAdminUser', () => {
  const ADMIN_EMAIL = 'manager@test.oficina.local';
  const ADMIN_PASSWORD = 'manager-test-password';

  it('should create the MANAGER named Administrador when no user has the e-mail', async () => {
    const { service, repository, published } = setup();

    await service.ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);

    expect(repository.users).toHaveLength(1);
    const admin = repository.users[0];
    expect(admin.name).toBe('Administrador');
    expect(admin.email.value).toBe(ADMIN_EMAIL);
    expect(admin.roles).toEqual([Role.MANAGER]);
    expect(admin.customerId).toBeUndefined();
    await expect(hasher.verify(ADMIN_PASSWORD, admin.passwordHash)).resolves.toBe(true);
    expect(published).toHaveLength(1);
    expect(isUserRegistered(published[0])).toBe(true);
  });

  it('should keep the existing user and password when called again', async () => {
    const { service, repository, published } = setup();
    await service.ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    const original = repository.users[0];

    await service.ensureAdminUser(ADMIN_EMAIL, 'another-password');

    expect(repository.users).toEqual([original]);
    expect(original.passwordHash.equals(repository.users[0].passwordHash)).toBe(true);
    expect(published).toHaveLength(1);
  });

  it('should not fail when another instance inserted the admin in the meantime', async () => {
    const { service, repository, published } = setup();
    const existsByEmail = jest.spyOn(repository, 'existsByEmail').mockResolvedValueOnce(false);
    await service.ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    existsByEmail.mockResolvedValueOnce(false);

    await expect(service.ensureAdminUser(ADMIN_EMAIL, ADMIN_PASSWORD)).resolves.toBeUndefined();
    expect(repository.users).toHaveLength(1);
    expect(published).toHaveLength(1);
  });
});
