# 00 — Contexto base (colar no início de toda sessão)

```text
Você está ajudando um grupo de pós-graduação (FIAP Pós Tech Software Architecture, Tech Challenge Fase 1) a construir
o MVP do back-end de uma oficina mecânica. Leia e respeite a documentação em docs/ deste repositório e o CLAUDE.md;
eles são a fonte da verdade. Se algo não estiver documentado, pergunte antes de inventar. Responda em português;
escreva código, identificadores e mensagens de commit de código em inglês.

RESUMO DO DOMÍNIO
- Sistema de Gestão da Oficina: ordens de serviço (ServiceOrder), clientes (Customer, CPF/CNPJ), veículos (Vehicle,
  placa), serviços (Service), peças/insumos (Part) com estoque, orçamento (Quote) gerado automaticamente e aprovado
  pelo cliente, status da OS e acompanhamento (tracking) pelo cliente.
- Status (enunciado → código): Recebida RECEIVED → Em diagnóstico IN_DIAGNOSIS → Aguardando aprovação AWAITING_APPROVAL
  → Em execução IN_PROGRESS → Finalizada COMPLETED → Entregue DELIVERED (+ CANCELLED conforme ADR-010). Status muda
  SOMENTE por comandos de negócio; toda transição gera StatusHistoryEntry.
- Quote = Σ serviceItems + Σ partItems (snapshot de nome/preço na inclusão), recalculado a cada alteração; sendQuote
  exige ≥ 1 item; approveQuote inicia a execução automaticamente e baixa o estoque (ADR-012).
- Módulos (contextos delimitados): customers (Customer, Vehicle), catalog (Service, Part, StockMovement),
  service-orders (ServiceOrder — core), identity (User, Role, JWT), shared (Money, Quantity, Document, LicensePlate…).
  Módulos só se comunicam pelas portas expostas (CustomerLookup, CatalogLookup, StockMovements) ou eventos; sem
  import de domain de outro módulo; sem JOIN entre schemas.
- Glossário PT → EN: docs/03-ddd/linguagem-ubiqua.md — única fonte de traduções (Orçamento = Quote, nunca Budget).

DECISÕES ACEITAS
- Linguagem/framework: TypeScript 5 + NestJS 11, Node 22 (ADR-001)
- Banco: PostgreSQL 16, um schema por módulo (ADR-002); ORM/migrações: decisão leve pendente (TypeORM × Prisma)
- Arquitetura: Clean Architecture completa, modular por contexto — domain/ (entities) ← application/ (use cases,
  boundaries, models, ports) ← adapters/ (controllers, presenters, gateways, DTOs) ← infrastructure/ (Nest, ORM,
  migrações, config); dependência de fora para dentro (ADR-003)
- Idioma: tudo em inglês no código/API/enums/tabelas/módulos/escopos de commit; docs, Miro, mensagens ao usuário e
  cenários Gherkin em português (ADR-013)

DECISÕES EM VOTAÇÃO (não assumir; marcar como [dúvida] citando a enquete)
- Autenticação: {{AUTH}} (ADR-004, E-08) · OpenAPI: {{OPENAPI}} (ADR-005, E-09) · Testes/BDD: {{TESTES}} (ADR-006, E-12)
- Scans: {{SCANS}} (ADR-007, E-13) · Git/CI: {{GIT}} (ADR-008, E-10) · Ids: {{IDS}} (ADR-009, E-11)
- Recusa/cancelamento: {{RECUSA}} (ADR-010, E-14) · Acesso do cliente: {{ACESSO_CLIENTE}} (ADR-011, E-15)
- Estoque: {{ESTOQUE}} (ADR-012, E-16)

CONVENÇÕES
- Estrutura e toolchain: docs/04-arquitetura/estrutura-do-repositorio.md. Contrato da API: docs/04-arquitetura/contrato-api.md.
- Casos de uso com sufixo UseCase (nunca Service); um por comando/consulta; presenters onde o formato difere do modelo.
- Money decimal (2 casas), Quantity decimal(10,3), datas UTC ISO-8601, ids gerados na aplicação.
- Erros: Problem Details (422 validação, 409 conflito/transição inválida, 401/403 auth, 404 inexistente ou alheio),
  chaves em inglês e textos em português.
- Todo código vem com testes (it('should … when …')); cobertura ≥ 80 % em service-orders e catalog (domain + application).
- Sem dados pessoais reais em seeds/testes/prompts. Sem segredos no código (.env.example apenas).
- Commits: Conventional Commits em inglês com escopo = módulo (customers, catalog, service-orders, identity, shared,
  infra, ci); docs(<pasta>) para documentação.

MODO DE TRABALHO
1) Antes de gerar, liste suposições e um plano curto. 2) Cite o PRD/ADR que justifica cada regra. 3) Gere código +
testes + atualização de docs/Swagger. 4) Aponte o que ficou fora e por quê.
```
