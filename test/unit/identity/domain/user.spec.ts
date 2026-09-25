import { UserRegistered } from '../../../../src/modules/identity/domain/events';
import { PasswordHash } from '../../../../src/modules/identity/domain/password-hash';
import { type RegisterUserProps, User } from '../../../../src/modules/identity/domain/user';
import { ValidationError } from '../../../../src/shared/domain/domain-error';
import { Email } from '../../../../src/shared/domain/email';
import { Role } from '../../../../src/shared/domain/role';
import { aUser, CUSTOMER_ID, FIXED_NOW, SAMPLE_HASH, USER_ID } from '../fakes/builders';

// Invariantes do agregado User (agregados.md §3; ADR-011; PRD-005 §6), sem Nest, Prisma ou bcrypt.
function registerProps(overrides: Partial<RegisterUserProps> = {}): RegisterUserProps {
  return {
    id: USER_ID,
    name: 'Mecânico da oficina',
    email: Email.parse('mechanic@test.oficina.local'),
    passwordHash: PasswordHash.fromHash(SAMPLE_HASH),
    roles: [Role.MECHANIC],
    now: FIXED_NOW,
    ...overrides,
  };
}

function validationErrorOf(action: () => unknown): ValidationError {
  try {
    action();
  } catch (error) {
    if (error instanceof ValidationError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a ValidationError to be thrown');
}

describe('User.register', () => {
  it('should create an active user with the given data when the invariants hold', () => {
    const user = User.register(registerProps({ name: '  Mecânico da oficina  ' }));

    expect(user.id).toBe(USER_ID);
    expect(user.name).toBe('Mecânico da oficina');
    expect(user.email.value).toBe('mechanic@test.oficina.local');
    expect(user.passwordHash.value).toBe(SAMPLE_HASH);
    expect(user.roles).toEqual([Role.MECHANIC]);
    expect(user.customerId).toBeUndefined();
    expect(user.active).toBe(true);
    expect(user.createdAt).toEqual(FIXED_NOW);
    expect(user.updatedAt).toEqual(FIXED_NOW);
  });

  it('should emit UserRegistered with the user id and roles when registered', () => {
    const user = User.register(registerProps({ roles: [Role.ATTENDANT, Role.MANAGER] }));

    const events = user.pullDomainEvents();

    expect(events).toHaveLength(1);
    const event = events[0] as UserRegistered;
    expect(event).toBeInstanceOf(UserRegistered);
    expect(event.name).toBe('UserRegistered');
    expect(event.aggregateId).toBe(USER_ID);
    expect(event.occurredAt).toEqual(FIXED_NOW);
    expect(event.payload).toEqual({ userId: USER_ID, roles: [Role.ATTENDANT, Role.MANAGER] });
    expect(user.pullDomainEvents()).toEqual([]);
  });

  it('should accept the CUSTOMER role when a customerId is given', () => {
    const user = User.register(registerProps({ roles: [Role.CUSTOMER], customerId: CUSTOMER_ID }));

    expect(user.isCustomer()).toBe(true);
    expect(user.customerId).toBe(CUSTOMER_ID);
  });

  it.each([
    ['', 'name'],
    ['   ', 'name'],
    ['a'.repeat(121), 'name'],
  ])('should reject the name %p when it is empty or longer than 120 characters', (name, field) => {
    const error = validationErrorOf(() => User.register(registerProps({ name })));

    expect(error.field).toBe(field);
  });

  it('should accept a name of exactly 120 characters when registering', () => {
    expect(User.register(registerProps({ name: 'a'.repeat(120) })).name).toHaveLength(120);
  });

  it('should reject the registration when no role is given', () => {
    const error = validationErrorOf(() => User.register(registerProps({ roles: [] })));

    expect(error.message).toBe('informe ao menos um papel');
    expect(error.field).toBe('roles');
  });

  it('should reject the registration when a role is repeated', () => {
    const error = validationErrorOf(() => User.register(registerProps({ roles: [Role.MECHANIC, Role.MECHANIC] })));

    expect(error.message).toBe('papéis repetidos');
    expect(error.field).toBe('roles');
  });

  it.each([[[Role.CUSTOMER, Role.ATTENDANT]], [[Role.MANAGER, Role.CUSTOMER]], [[Role.CUSTOMER, Role.MECHANIC]]])(
    'should reject the roles %p when CUSTOMER is combined with a team role',
    (roles) => {
      const error = validationErrorOf(() => User.register(registerProps({ roles, customerId: CUSTOMER_ID })));

      expect(error.field).toBe('roles');
    },
  );

  it('should reject the registration when the role is CUSTOMER and customerId is missing', () => {
    const error = validationErrorOf(() => User.register(registerProps({ roles: [Role.CUSTOMER] })));

    expect(error.message).toBe('customerId é obrigatório para o papel CUSTOMER');
    expect(error.field).toBe('customerId');
  });

  it('should reject the registration when a team user has a customerId', () => {
    const error = validationErrorOf(() => User.register(registerProps({ customerId: CUSTOMER_ID })));

    expect(error.message).toBe('customerId só é permitido para o papel CUSTOMER');
    expect(error.field).toBe('customerId');
  });

  it('should not expose the internal roles array when roles is read', () => {
    const user = User.register(registerProps());

    user.roles.push(Role.MANAGER);

    expect(user.roles).toEqual([Role.MECHANIC]);
  });
});

describe('User.reconstitute', () => {
  it('should rebuild the user without emitting events when loaded from persistence', () => {
    const user = aUser({ active: false, customerId: undefined });

    expect(user.pullDomainEvents()).toEqual([]);
    expect(user.active).toBe(false);
  });

  it('should not validate the invariants when loaded from persistence', () => {
    expect(() => aUser({ roles: [Role.CUSTOMER, Role.MANAGER] })).not.toThrow();
  });
});

describe('User commands and queries', () => {
  it('should deactivate the user and touch updatedAt when deactivate is called', () => {
    const user = aUser();
    const later = new Date('2026-09-26T08:00:00.000Z');

    user.deactivate(later);

    expect(user.active).toBe(false);
    expect(user.updatedAt).toEqual(later);
    expect(user.createdAt).toEqual(FIXED_NOW);
  });

  it('should report the roles it holds when hasRole is called', () => {
    const user = aUser({ roles: [Role.ATTENDANT, Role.MANAGER] });

    expect(user.hasRole(Role.MANAGER)).toBe(true);
    expect(user.hasRole(Role.MECHANIC)).toBe(false);
  });

  it('should not be a customer when the user only has team roles', () => {
    expect(aUser().isCustomer()).toBe(false);
  });
});
