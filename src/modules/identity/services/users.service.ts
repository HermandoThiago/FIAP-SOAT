import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { type AuthenticatedUser } from '../../../shared/auth/principal';
import { type Clock, CLOCK } from '../../../shared/clock';
import { Email } from '../../../shared/domain/email';
import { Role } from '../../../shared/domain/role';
import { DomainEventPublisher } from '../../../shared/events/domain-event-publisher';
import { ID_GENERATOR, type IdGenerator } from '../../../shared/id-generator';
import { CustomersService } from '../../customers/services/customers.service';
import { User } from '../domain/user';
import { UserRepository } from '../repositories/user.repository';
import { PasswordHasher } from './password-hasher';

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
  roles: Role[];
  customerId?: string;
}

const ADMIN_USER_NAME = 'Administrador';

// Serviço de aplicação (glossário §9: register; list/update/deactivate chegam com o CRUD — Should, RF-064).
@Injectable()
export class UsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly customersService: CustomersService,
    private readonly events: DomainEventPublisher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * POST /users (contrato-api.md §3.1; ADR-011): equipe só por MANAGER; usuário CUSTOMER por ATTENDANT ou MANAGER,
   * com o cliente existente e ativo no módulo customers. As invariantes do usuário ficam no agregado (422).
   */
  async register(command: RegisterUserCommand, actor: AuthenticatedUser): Promise<User> {
    const customerOnly = isCustomerOnly(command.roles);
    this.authorize(customerOnly, actor);
    const email = Email.parse(command.email);
    if (await this.users.existsByEmail(email)) {
      throw new ConflictException('E-mail já cadastrado');
    }
    if (customerOnly && command.customerId) {
      await this.assertActiveCustomer(command.customerId);
    }
    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = User.register({
      id: this.ids.next(),
      name: command.name,
      email,
      passwordHash,
      roles: command.roles,
      customerId: command.customerId,
      now: this.clock.now(),
    });
    await this.users.insert(user);
    await this.events.publishAll(user.pullDomainEvents());
    return user;
  }

  /**
   * RF-062 / ADR-004 (seed): cria o MANAGER a partir de ADMIN_EMAIL/ADMIN_PASSWORD se ainda não existir usuário com
   * o e-mail. Idempotente: nunca altera a senha de um usuário existente.
   */
  async ensureAdminUser(email: string, password: string): Promise<void> {
    const adminEmail = Email.parse(email);
    if (await this.users.existsByEmail(adminEmail)) {
      return;
    }
    const user = User.register({
      id: this.ids.next(),
      name: ADMIN_USER_NAME,
      email: adminEmail,
      passwordHash: await this.passwordHasher.hash(password),
      roles: [Role.MANAGER],
      now: this.clock.now(),
    });
    try {
      await this.users.insert(user);
    } catch (error) {
      // Duas instâncias subindo ao mesmo tempo: a segunda perde a corrida e o usuário já existe.
      if (error instanceof ConflictException) {
        return;
      }
      throw error;
    }
    await this.events.publishAll(user.pullDomainEvents());
  }

  /**
   * contrato-api.md §3.1: acesso do cliente (só CUSTOMER) → ATTENDANT ou MANAGER; qualquer papel de equipe no pedido
   * (inclusive misturado com CUSTOMER) → só MANAGER. A autorização vem antes de qualquer validação do agregado, para o
   * ATTENDANT receber 403, e não 404/422, ao pedir o que não pode.
   */
  private authorize(customerOnly: boolean, actor: AuthenticatedUser): void {
    if (customerOnly) {
      if (!actor.roles.includes(Role.ATTENDANT) && !actor.roles.includes(Role.MANAGER)) {
        throw new ForbiddenException('Apenas ATTENDANT ou MANAGER podem criar o acesso do cliente');
      }
      return;
    }
    if (!actor.roles.includes(Role.MANAGER)) {
      throw new ForbiddenException('Apenas MANAGER pode criar usuários da equipe');
    }
  }

  private async assertActiveCustomer(customerId: string): Promise<void> {
    const customer = await this.customersService.findById(customerId);
    if (!customer || !customer.active) {
      throw new NotFoundException('Cliente não encontrado');
    }
  }
}

function isCustomerOnly(roles: Role[]): boolean {
  return roles.every((role) => role === Role.CUSTOMER);
}
