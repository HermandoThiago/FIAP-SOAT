# CLAUDE.md — instruções para o Claude neste repositório

Lido automaticamente pelo Claude Code (CLI) e pelas GitHub Actions (`@claude` e revisão de PR). Mantenha curto;
detalhes ficam em `docs/`.

## O projeto

Tech Challenge Fase 1 da FIAP Pós Tech Software Architecture: MVP do back-end **monolítico** de uma oficina mecânica
(ordens de serviço, clientes, veículos, catálogo/estoque, orçamento com aprovação do cliente), com DDD, testes ≥ 80 %
nos domínios críticos e desenvolvimento seguro. **Stack (ADR-001/002 + E-17): TypeScript + NestJS + Prisma + PostgreSQL 16.**
Responda **em português**; escreva código, nomes e mensagens de commit de código **em inglês** (ADR-013, Aceita).

## Fonte da verdade (leia antes de propor qualquer coisa)

- Enunciado da FIAP (versão de 23/09/2026) — **não versionado**: propriedade intelectual da FIAP, nunca commitar o PDF
  (`.gitignore`). Requisitos, entregáveis e itens do vídeo transcritos em `docs/06-entrega/checklist-de-entrega.md`.
- `docs/01-requisitos/PRD-*.md` — o que o sistema faz (RF), regras (RN), critérios de aceite.
- `docs/02-adr/` — decisões de arquitetura. **Todas as 13 ADRs estão Aceitas** (Lotes 1–3 encerrados em 22/09/2026); vale
  a seção *Decisão* de cada uma — opções e recomendações são só registro. Decisões leves (Tipo 2, ex.: ORM = Prisma)
  estão em `docs/02-adr/decisoes-leves.md`. Regra que dependa de algo não decidido: diga qual ADR/enquete resolve e pare.
- `docs/ddd/linguagem-ubiqua.md` — **tradução oficial de cada termo para o código** (§1 módulos, §2–§6 identificadores,
  §7 status, §8 eventos, §9 serviços de aplicação). Termo sem tradução no glossário não entra no código: proponha a linha no glossário.
- `docs/ddd/agregados.md` — agregados, invariantes e eventos de domínio.
- `docs/04-arquitetura/contrato-api.md` — rotas, payloads, códigos de erro (Problem Details); depois de implementado, o
  Swagger gerado pelo código é a versão oficial (ADR-005, code-first).
- `docs/04-arquitetura/estrutura-do-repositorio.md` — camadas clássicas por módulo, árvore de pastas, toolchain, regras de dependência.
- `docs/06-entrega/checklist-de-entrega.md` — o que precisa existir para a nota; atualize quando fechar um item.

Se algo não está documentado, é **scope creep**: aponte, não implemente.

## Regras de arquitetura

Cada regra cita a fonte. Divergência de uma regra é `[bloqueia]` na revisão de PR.

1. Monólito modular por contexto delimitado: módulos `customers`, `catalog`, `service-orders` (core), `identity` e
   `shared` (monólito: enunciado; módulos e nomes: `docs/ddd/contextos-delimitados.md`, ADR-013).
2. ADR-003 (Aceita; revotada em 22/09) — **camadas clássicas dentro de cada módulo**: `controllers/` + `dto/` (HTTP,
   validação sintática, OpenAPI) → `services/` (serviços de aplicação: orquestram os casos de uso, as transações e as
   chamadas a outros módulos) → `repositories/` (Prisma ↔ agregados), todos sobre `domain/` (agregados, VOs, eventos,
   políticas — TypeScript puro). Controller nunca chama repositório; `domain/` não importa `@nestjs/*` nem
   `@prisma/client`; regra de negócio fica no agregado, não no service.
3. ADR-003 (Aceita) — módulos só se comunicam pelo **serviço de aplicação exportado** pelo módulo Nest do outro
   (`CustomersService`, `VehiclesService`, `CatalogService`, `PartsService`, `AuthService`, `TrackingTokenService`) ou por
   eventos de domínio — nunca import de `domain/` ou `repositories/` de outro módulo, nunca JOIN entre schemas. Serviços
   de aplicação usam o sufixo `Service` (`ServiceOrdersService`); a entidade `Service` do catálogo mantém o nome e o
   serviço de aplicação que a mantém é `CatalogService` (nunca `ServicesService`).
4. ADR-010 (Aceita) — status da OS (`ServiceOrderStatus`: `RECEIVED`, `IN_DIAGNOSIS`, `AWAITING_APPROVAL`, `IN_PROGRESS`,
   `COMPLETED`, `DELIVERED` + terminal `CANCELLED`) muda **somente** por comandos de negócio (`startDiagnosis`, `sendQuote`,
   `approveQuote`, `rejectQuote`, `complete`, `deliver`, `cancel`); nunca `PATCH status`. Recusa do orçamento pelo cliente
   e cancelamento pelo `MANAGER` (só antes da aprovação) levam a `CANCELLED`; não há volta para diagnóstico (renegociar =
   nova OS). Toda transição gera `StatusHistoryEntry`; a tabela oficial é a da PRD-004 §2.
5. `Quote` é derivado dos itens (snapshot de nome/preço na inclusão), recalculado a cada mudança; nunca atribuído (PRD-003).
6. ADR-012 (Aceita) — estoque só muda por `StockMovement` registrado; `stockQuantity >= 0` e
   `0 <= reservedQuantity <= stockQuantity` no domínio e no banco (PRD-002). Incluir peça sem `availableQuantity`
   suficiente → `422 estoque insuficiente`; a aprovação do orçamento **reserva** (`RESERVATION`) e a finalização **baixa**
   (`OUTBOUND`), cada uma na mesma transação da transição de status.
7. `Money` em decimal (2 casas); datas UTC ISO-8601 (`docs/04-arquitetura/contrato-api.md`). Ids UUID v4 gerados na
   aplicação (`IdGenerator`), nunca pelo banco; número da OS `OS-AAAA-NNNNNN` (ADR-009, Aceita).
8. Erros: 422 validação, 409 conflito/transição inválida, 401/403 auth, 404 inexistente **ou alheio** (cliente) —
   Problem Details com chaves em inglês e textos em português (`contrato-api.md` §5).

## Segurança e dados

- Nunca inclua CPF/CNPJ/placas reais, e-mails reais ou segredos (use `.env.example`, geradores de dados válidos fictícios).
  O repositório fica **público** na entrega (enunciado): nada sensível em nenhum arquivo nem no histórico.
- PII mascarada em logs e nas respostas ao cliente. Validação de CPF/CNPJ (dígitos verificadores) e placa (antiga e Mercosul)
  nos VOs `Document` e `LicensePlate`.
- ADR-004 (Aceita) — rotas administrativas exigem JWT próprio HS256 (`POST /auth/login`, usuários no banco, bcrypt,
  papéis `ATTENDANT`/`MECHANIC`/`MANAGER`). ADR-011 (Aceita) — `/tracking/**` aceita o token de acompanhamento
  (`aud=tracking`, uma OS, gerado no envio do orçamento) **ou** o login do cliente (papel `CUSTOMER`, claim `customerId`);
  OS alheia → 404; JWT de equipe não entra em `/tracking`. Públicas só `/auth/login`, `/health`, `/ready`, `/docs` (dev).

## Testes e qualidade

- ADR-006 (Aceita) — todo código vem com testes. Descrições em inglês: `it('should <resultado> when <condição>')`; cenários
  BDD em português (Cucumber-js nos 3 fluxos principais). Domínio testado sem banco/HTTP; integração com Testcontainers.
- Cobertura ≥ 80 % (linhas e branches) em `service-orders` e `catalog` (`domain/` + `services/`); o CI tem gate.
- Máquina de estados: testes parametrizados cobrindo **todas** as combinações status × comando.
- ADR-007 (Aceita) — scans no CI (`security.yml`): Semgrep, `npm audit` + Trivy fs, Trivy image, hadolint, gitleaks, ZAP.

## Git

- ADR-008 (Aceita) — **GitFlow**: branches de trabalho `feat/<modulo>-<descricao>`, `fix/…`, `docs/…`, `test/…`, `chore/…`
  saem de **`develop`** e voltam para `develop` por PR (template preenchido, ≤ 400 linhas, 1 aprovação humana, CI verde,
  squash merge, branch apagada). `master` só recebe `release/*` e `hotfix/*` (F1), sempre com tag; nunca abra PR de
  trabalho contra `master`. **Ninguém tem bypass**: tudo que chega em `master` e `develop` vem por PR (enunciado); os
  commits diretos até 23/09 são exceção registrada em `docs/02-adr/decisoes-leves.md`.
- **Conventional Commits obrigatórios** (o CI valida o título do PR). Escopos: módulo em inglês (`customers`, `catalog`,
  `service-orders`, `identity`, `shared`) ou transversal (`infra`, `ci`); `docs` é tipo, não escopo — mudanças só de
  documentação usam `docs(<pasta>)` — detalhes em `docs/00-guia-do-grupo/como-trabalhamos.md` §4.
- Branches criadas pelo Claude usam o prefixo `claude/`, saem de `develop` e abrem PR para `develop` (configuração do workflow).

## Como revisar um PR (para a action de revisão e para `@claude revise`)

Siga `prompts/09-revisao-de-pr.md`: rastreabilidade → arquitetura → domínio → API → segurança → testes → docs.
Classifique cada apontamento como `[bloqueia]`, `[sugestão]` ou `[dúvida]` e termine com o veredito.
Nome fora do glossário ou tradução divergente (ex.: `Budget` em vez de `Quote`) é `[bloqueia]`.

## Comandos

- Subir tudo: `cp .env.example .env && docker compose up --build` (PostgreSQL → `prisma migrate deploy` + seed → API em
  `http://localhost:8080`, Swagger em `/docs` com `APP_ENV=dev`).
- Desenvolvimento: `docker compose up -d postgres`, `npm ci`, `npm run prisma:migrate` (migrate dev + generate),
  `npm run prisma:seed`, `npm run start:dev`.
- Qualidade: `npm run lint` (ESLint + Prettier), `npm run depcruise` (regras de camadas — falha o CI), `npm run build`.
- Testes: `npm test` (unitários), `npm run test:integration` (Testcontainers), `npm run test:bdd` (Cucumber-js),
  `npm run test:e2e` (os dois), `npm run test:cov` (cobertura com gate ≥ 80 % por pasta em `service-orders` e `catalog`).
  Sem Docker: `TEST_DATABASE_URL=postgresql://…/banco_vazio` antes dos comandos de integração/BDD/cobertura.
- OpenAPI: `npm run openapi:export` → `reports/openapi.json` (artefato do CI, não versionado — ADR-005).
- Prisma: `npm run prisma:generate`; nova migração = `npx prisma migrate dev --create-only --name <nome>`, editar o SQL à
  mão (constraints/sequência) e `npm run prisma:migrate` (detalhes em `prisma/README.md`).
