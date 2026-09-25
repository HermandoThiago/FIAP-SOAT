// Projeção mínima do cliente que o módulo customers expõe pelo CustomersService no walking skeleton (identity confere
// que o cliente do usuário CUSTOMER existe e está ativo — ADR-011). Tipo puro (ADR-003, domain/ sem framework): o
// agregado Customer, com os VOs Document/Email/Phone e as invariantes da PRD-001, chega no prompt 05 e passa a ser o
// que o repositório reidrata e o serviço devolve.
export interface CustomerSummary {
  id: string;
  name: string;
  active: boolean;
}
