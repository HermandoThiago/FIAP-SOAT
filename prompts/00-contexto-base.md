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
  → Em execução IN_PROGRESS → Finalizada COMPLETED → Entregue DELIVERED; + CANCELLED (terminal: recusa do orçamento
  pelo cliente ou cancelamento pelo MANAGER, só antes da aprovação; sem volta para diagnóstico — ADR-010). Status muda
  SOMENTE por comandos de negócio; toda transição gera StatusHistoryEntry (tabela oficial: PRD-004 §2).
- Quote = Σ serviceItems + Σ partItems (snapshot de nome/preço na inclusão), recalculado a cada alteração; sendQuote
  exige ≥ 1 item e gera o token de acompanhamento; approveQuote inicia a execução automaticamente e RESERVA as peças
  (RESERVATION); complete BAIXA as peças reservadas (OUTBOUND) — cada uma na mesma transação da transição (ADR-012).
  Incluir peça sem availableQuantity (= stockQuantity − reservedQuantity) suficiente → 422 estoque insuficiente.
- Módulos (contextos delimitados): customers (Customer, Vehicle), catalog (Service, Part, StockMovement),
  service-orders (ServiceOrder — core), identity (User, Role, JWT), shared (Money, Quantity, Document, LicensePlate…).
  Módulos só se comunicam pelos serviços de aplicação exportados (CustomersService, VehiclesService, CatalogService,
  PartsService, AuthService, TrackingTokenService) ou eventos; sem import de domain/repositories de outro módulo; sem
  JOIN entre schemas.
- Glossário PT → EN: docs/ddd/linguagem-ubiqua.md — única fonte de traduções (Orçamento = Quote, nunca Budget).

DECISÕES ACEITAS (todas as 13 ADRs — índice em docs/02-adr/README.md; nada está em votação)
- Linguagem/framework: TypeScript 5 + NestJS 11, Node 22 (ADR-001); ORM/migrações: Prisma + Prisma Migrate (E-17)
- Banco: PostgreSQL 16, um schema por módulo via multiSchema do Prisma (ADR-002)
- Arquitetura: camadas clássicas dentro de cada módulo por contexto — controllers/ + dto/ → services/ → repositories/,
  todos sobre domain/ (TypeScript puro, sem @nestjs/* e sem @prisma/client); controller nunca chama repositório; regra
  de negócio no agregado, não no service (ADR-003, revotada em 22/09)
- Idioma: tudo em inglês no código/API/enums/tabelas/módulos/escopos de commit; docs, Miro, mensagens ao usuário e
  cenários Gherkin em português (ADR-013)
- Autenticação: JWT próprio HS256 (usuários no banco, bcrypt custo 12), claims sub/roles/iss/aud=api/exp 60 min,
  papéis ATTENDANT/MECHANIC/MANAGER + CUSTOMER (ADR-004)
- Acesso do cliente: /tracking/** aceita token de acompanhamento (aud=tracking, sub=serviceOrderId, 7 dias, gerado no
  quote/send) OU login com papel CUSTOMER (claim customerId); OS alheia → 404; JWT de equipe não entra em /tracking;
  CUSTOMER não entra em rota administrativa (403) (ADR-011)
- OpenAPI: code-first com @nestjs/swagger em /docs e /docs/openapi.json (só dev); contrato-api.md é o acordo antes de
  codar; openapi.json é artefato do CI, não versionado (ADR-005)
- Testes: Jest + supertest + Testcontainers (Postgres 16 real) + Cucumber-js nos 3 fluxos principais; coverageThreshold
  ≥ 80 % (linhas e branches) em service-orders e catalog (domain + services) (ADR-006)
- Scans: Semgrep + npm audit/Trivy fs + Trivy image + hadolint + gitleaks + ZAP; 0 críticas/altas na entrega (ADR-007)
- Git: GitFlow — branches de trabalho (feat/, fix/, docs/, test/, chore/) saem de develop e voltam por PR com squash;
  master só recebe release/* e hotfix/* com tag; Conventional Commits obrigatórios, validados no título do PR (ADR-008)
- Ids: UUID v4 gerado na aplicação (crypto.randomUUID, IdGenerator) + número da OS OS-AAAA-NNNNNN por sequência
  anual; VOs Document/LicensePlate/Email/Phone validados (ADR-009)

CONVENÇÕES
- Estrutura e toolchain: docs/04-arquitetura/estrutura-do-repositorio.md. Contrato da API: docs/04-arquitetura/contrato-api.md.
- Serviços de aplicação com sufixo Service (ServiceOrdersService, PartsService); a entidade Service do catálogo é
  mantida por CatalogService (nunca ServicesService); um método por caso de uso; DTOs de saída com fromDomain().
- Money decimal (2 casas), Quantity decimal(10,3), datas UTC ISO-8601, ids gerados na aplicação.
- Erros: Problem Details (422 validação, 409 conflito/transição inválida, 401/403 auth, 404 inexistente ou alheio),
  chaves em inglês e textos em português.
- Todo código vem com testes (it('should … when …')); cobertura ≥ 80 % em service-orders e catalog (domain + services).
- Sem dados pessoais reais em seeds/testes/prompts. Sem segredos no código (.env.example apenas).
- Commits: Conventional Commits em inglês com escopo = módulo (customers, catalog, service-orders, identity, shared,
  infra, ci); docs(<pasta>) para documentação. Base das branches e dos PRs: develop.

MODO DE TRABALHO
1) Antes de gerar, liste suposições e um plano curto. 2) Cite o PRD/ADR que justifica cada regra. 3) Gere código +
testes + atualização de docs/Swagger. 4) Aponte o que ficou fora e por quê.
```
