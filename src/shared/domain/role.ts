// Papéis de autorização (glossário §5; ADR-004; ADR-011). Papel é conceito do `identity`, mas (1) o agregado User precisa
// dele nas invariantes (CUSTOMER exclusivo, customerId) e (2) os controllers de todos os módulos usam @Roles() e os guards
// de shared/auth o consultam. Como domain/ só pode importar shared/domain/ (estrutura §4.1; .dependency-cruiser.cjs
// `domain-no-upper-layers` inclui shared/auth), o enum mora aqui, em TypeScript puro — decisão leve a registrar em
// docs/02-adr/decisoes-leves.md pelo autor do PR.
export enum Role {
  ATTENDANT = 'ATTENDANT',
  MECHANIC = 'MECHANIC',
  MANAGER = 'MANAGER',
  CUSTOMER = 'CUSTOMER',
}

/** Papéis da equipe da oficina: acessam as rotas administrativas; MANAGER inclui tudo da equipe (ADR-004). */
export const TEAM_ROLES: readonly Role[] = [Role.ATTENDANT, Role.MECHANIC, Role.MANAGER];

export function isTeamRole(role: Role): boolean {
  return TEAM_ROLES.includes(role);
}
