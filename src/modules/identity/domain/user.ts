import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { ValidationError } from '../../../shared/domain/domain-error';
import { type Email } from '../../../shared/domain/email';
import { isTeamRole, Role } from '../../../shared/domain/role';
import { UserRegistered } from './events';
import { type PasswordHash } from './password-hash';

// Agregado User (agregados.md §3; PRD-005 §6; ADR-011): e-mail único (garantido pelo repositório/banco), senha sempre
// em hash, ≥ 1 papel; CUSTOMER é exclusivo e exige customerId; equipe não tem customerId. TypeScript puro (ADR-003).

export const USER_NAME_MAX_LENGTH = 120;

export interface UserProps {
  id: string;
  name: string;
  email: Email;
  passwordHash: PasswordHash;
  roles: Role[];
  customerId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterUserProps {
  id: string;
  name: string;
  email: Email;
  passwordHash: PasswordHash;
  roles: Role[];
  customerId?: string;
  now: Date;
}

export class User extends AggregateRoot {
  private constructor(private readonly props: UserProps) {
    super();
  }

  /** Cadastro (UsersService.register e seed do MANAGER): valida as invariantes e emite UserRegistered. */
  static register(props: RegisterUserProps): User {
    const name = validateName(props.name);
    const roles = validateRoles(props.roles);
    validateCustomerId(roles, props.customerId);
    const user = new User({
      id: props.id,
      name,
      email: props.email,
      passwordHash: props.passwordHash,
      roles,
      customerId: props.customerId,
      active: true,
      createdAt: props.now,
      updatedAt: props.now,
    });
    user.addDomainEvent(new UserRegistered({ userId: props.id, roles: [...roles] }, props.now));
    return user;
  }

  /** Reidratação pelo repositório: sem validação nem evento. */
  static reconstitute(props: UserProps): User {
    return new User({ ...props, roles: [...props.roles] });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }

  get roles(): Role[] {
    return [...this.props.roles];
  }

  get customerId(): string | undefined {
    return this.props.customerId;
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  deactivate(now: Date): void {
    this.props.active = false;
    this.props.updatedAt = now;
  }

  isCustomer(): boolean {
    return this.hasRole(Role.CUSTOMER);
  }

  hasRole(role: Role): boolean {
    return this.props.roles.includes(role);
  }
}

function validateName(raw: string): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name.length === 0) {
    throw new ValidationError('nome obrigatório', 'name');
  }
  if (name.length > USER_NAME_MAX_LENGTH) {
    throw new ValidationError(`nome deve ter no máximo ${USER_NAME_MAX_LENGTH} caracteres`, 'name');
  }
  return name;
}

function validateRoles(roles: Role[]): Role[] {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new ValidationError('informe ao menos um papel', 'roles');
  }
  if (new Set(roles).size !== roles.length) {
    throw new ValidationError('papéis repetidos', 'roles');
  }
  if (roles.includes(Role.CUSTOMER) && roles.some(isTeamRole)) {
    throw new ValidationError('o papel CUSTOMER não se combina com papéis da equipe', 'roles');
  }
  return [...roles];
}

function validateCustomerId(roles: Role[], customerId: string | undefined): void {
  const isCustomer = roles.includes(Role.CUSTOMER);
  if (isCustomer && !customerId) {
    throw new ValidationError('customerId é obrigatório para o papel CUSTOMER', 'customerId');
  }
  if (!isCustomer && customerId) {
    throw new ValidationError('customerId só é permitido para o papel CUSTOMER', 'customerId');
  }
}
