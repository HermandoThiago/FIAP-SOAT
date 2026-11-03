# CLAUDE.md — instruções para o Claude neste repositório

Lido automaticamente pelo Claude Code (CLI) e pelas GitHub Actions (`@claude` e revisão de PR). Mantenha curto;
detalhes ficam em `docs/`.

## O projeto

Tech Challenge Fase 1 da FIAP Pós Tech Software Architecture: MVP do back-end **monolítico** de uma oficina mecânica
(ordens de serviço, clientes, veículos, catálogo/estoque, orçamento com aprovação do cliente), com DDD, testes ≥ 80 %
nos domínios críticos e desenvolvimento seguro. **Stack: TypeScript + NestJS + Prisma + PostgreSQL 16** (ADR-001/002).
Responda **em português**. O código implementado mistura idiomas (ver "Nomes" abaixo): siga o padrão do módulo que
você está alterando.

## Fonte da verdade

Em caso de conflito, **o código e o schema Prisma prevalecem** sobre qualquer documento. Os documentos foram alinhados
ao MVP implementado em 02/11/2026.

- Enunciado da FIAP — **não versionado** (propriedade intelectual da FIAP; nunca commitar o PDF).
- `docs/04-arquitetura/contrato-api.md` e o Swagger gerado pelo código (`/docs`, `/docs-json`): rotas, payloads, erros.
- `docs/ddd/linguagem-ubiqua.md` — termo do domínio → identificador no código e situação (implementado, parcial, não
  implementado). `docs/ddd/agregados.md`, `event-storming.md` e `contextos-delimitados.md` completam o DDD.
- `docs/01-requisitos/PRD-*.md` — o que o sistema faz; cada PRD tem o bloco *Situação da implementação*.
- `docs/02-adr/` — decisões. As ADRs são histórico: onde o código divergiu, a divergência está em
  `docs/02-adr/README.md` e em `docs/02-adr/decisoes-leves.md`.
- `docs/06-entrega/checklist-de-entrega.md` — o que precisa existir para a nota; atualize ao fechar um item.

Conceito de negócio que não existe no código (reparo adicional, liberação de reserva, reposição a fornecedor,
estoque mínimo, e-mail real) **não deve ser descrito como funcionalidade**: ver `linguagem-ubiqua.md` §5.

## Arquitetura (como está implementada)

1. Monólito modular em `src/modules/`: `customers`, `catalog`, `service-orders` (core), `identity`; `shared` tem o
   acesso ao banco (`DatabaseService`) e a configuração do Swagger.
2. Por módulo: `controllers/` (+ `dto(s)/`: HTTP, validação, OpenAPI) → `services/` (casos de uso e transações,
   usando o Prisma direto) e `domain/` (entidades de dados, validadores, políticas e funções puras, sem `@nestjs/*`).
   **Não há camada `repositories/`** (divergência registrada em `decisoes-leves.md`). Controller não acessa o banco.
3. Módulos só se comunicam pelo serviço de aplicação exportado pelo outro módulo (`CustomersService`,
   `VehiclesService`, `CatalogService`, `ItemService`, `StockService`, `AuthService`, `TrackingTokenService`), nunca
   por `domain/` de outro módulo.
4. Status da OS: enum `StatusOrdemServico` com **9 valores** (`RECEBIDA`, `EM_DIAGNOSTICO`, `AGUARDANDO_APROVACAO`,
   `AGUARDANDO_EXECUCAO`, `EM_EXECUCAO`, `FINALIZADA`, `ENTREGUE`, `ORCAMENTO_RECUSADO`, `CANCELADA`). Muda **somente**
   por comando, via `StatusTransitionPolicy`: `startDiagnosis`, `sendQuote`, `approveQuote`, `rejectQuote`,
   `startExecution`, `complete`, `deliver`, `cancel` (nunca `PATCH status`). Toda transição grava
   `OrdemServicoStatusHistorico`. Recusa leva a `ORCAMENTO_RECUSADO`; só o Admin cancela, antes da aprovação.
5. O orçamento é derivado dos itens (preço congelado na inclusão) e recalculado a cada mudança; nunca é atribuído.
6. Estoque só muda por `MovimentacaoEstoque`. Peça acima do saldo disponível → `422`. A aprovação **reserva** e a
   finalização **baixa**, cada uma na mesma transação da transição de status. Linhas de estoque são travadas com
   `SELECT … FOR UPDATE`; o banco tem `CHECK` para saldo e reserva.
7. Dinheiro em **centavos** (inteiro); quantidades de estoque `Decimal(12,3)`; datas em ISO-8601 UTC; ids UUID.
8. Erros: `400` validação de entrada, `401`/`403` autenticação e papel, `404` inexistente **ou alheio** (cliente),
   `409` conflito ou transição inválida, `422` regra de negócio (ex.: estoque insuficiente).

### Nomes

Rotas: `/customers`, `/vehicles`, `/services`, `/service-orders`, `/tracking`, `/metrics`, `/auth`, `/users`, mas o CRUD
de peças e insumos é `/itens`. Modelos Prisma, campos e DTOs estão em português (`OrdemServico`, `usuarioNome`,
`itemEstoquePrecoVenda`). Termo novo entra primeiro em `docs/ddd/linguagem-ubiqua.md`.

## Segurança e dados

- Nunca inclua CPF/CNPJ/placas reais, e-mails reais ou segredos (use `.env.example` e dados fictícios válidos).
  O repositório é **público** na entrega: nada sensível em arquivo algum nem no histórico.
- Autenticação: JWT HS256 (`POST /auth/login`), senhas com **Argon2id**, refresh token opaco com rotação. Papéis:
  `Admin`, `Atendente`, `Mecanico`, `Cliente` (`Role` em `identity/auth/roles.ts`). Rotas administrativas exigem JWT.
- `/tracking/**` aceita o token de acompanhamento (`aud=tracking`, uma OS, gerado no envio do orçamento) **ou** o login
  do Cliente; OS alheia → 404; JWT de equipe não entra em `/tracking`. Públicas: `POST /auth/login`, `/docs` e
  `/docs-json` (as demais rotas de `/auth` seguem `auth.controller.ts`).
- Validação de CPF/CNPJ (dígitos verificadores) e de placa (antiga e Mercosul) nos validadores de `domain/`.
- Limitações conhecidas (CORS aberto, Swagger sempre exposto, sem rate limit, notificação só em log):
  `docs/05-qualidade-e-seguranca/seguranca.md`.

## Testes e qualidade

- Todo código novo vem com testes. Domínio e serviços sem banco em `test/unit` e `test/services`; integração com
  Testcontainers em `test/integration` (exige Docker).
- O `jest.config.ts` tem gate de **80 % (linhas e branches)** global e em `service-orders/domain`,
  `service-orders/services` e `catalog/services`.
- Máquina de estados: testes cobrem as combinações status × comando.
- BDD (Cucumber, ADR-006) **não foi implementado**.
- Scans: no CI estão commitlint do título do PR, lint, testes com gate, integração, hadolint, gitleaks e
  `pnpm audit --prod --audit-level high`. Semgrep, Trivy e ZAP são manuais; resultados em
  `docs/06-entrega/relatorio-de-vulnerabilidades.md`.

## Git

- Fluxo definido na ADR-008: branches de trabalho (`feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…`) voltam por PR para
  a branch de integração; `master` só recebe release com tag. Tudo que chega em `master` e `develop` vem por PR.
  Confirme o nome real da branch de integração no repositório antes de abrir PR.
- **Conventional Commits** (o CI valida o título do PR). `docs` é tipo, não escopo: `docs(<pasta>)`.
- Branches criadas pelo Claude usam o prefixo `claude/`.
- Não commite sem o usuário pedir.

## Como revisar um PR

Siga `prompts/09-revisao-de-pr.md`: rastreabilidade → arquitetura → domínio → API → segurança → testes → docs.
Classifique cada apontamento como `[bloqueia]`, `[sugestão]` ou `[dúvida]` e termine com o veredito. Documento que
afirme algo que o código não faz é `[bloqueia]`.

## Comandos

`pnpm install` · `pnpm start:dev` · `pnpm test` · `pnpm run test:cov` (gate de cobertura) · `pnpm run test:integration`
(Testcontainers, exige Docker) · `pnpm lint` · `pnpm prisma:deploy` / `pnpm prisma:migrate` · `pnpm db:seed` ·
`docker compose up --build` (banco + migrações + seed + API; `cp .env.example .env` antes).

Local: os testes exigem Node 24 (o Node 22.14 falha no carregamento ESM); o Docker e o CI usam Node 22.
