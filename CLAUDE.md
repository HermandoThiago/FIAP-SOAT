# CLAUDE.md — instruções para o Claude neste repositório

Lido automaticamente pelo Claude Code (CLI) e pelas GitHub Actions (`@claude` e revisão de PR). Mantenha curto;
detalhes ficam em `docs/`.

## O projeto

Tech Challenge Fase 1 da FIAP Pós Tech Software Architecture: MVP do back-end **monolítico** de uma oficina mecânica
(ordens de serviço, clientes, veículos, catálogo/estoque, orçamento com aprovação do cliente), com DDD, testes ≥ 80 %
nos domínios críticos e desenvolvimento seguro. **Stack (ADR-001/002, Aceitas): TypeScript + NestJS + PostgreSQL 16.**
Responda **em português**; escreva código, nomes e mensagens de commit de código **em inglês** (ADR-013, Aceita).

## Fonte da verdade (leia antes de propor qualquer coisa)

- `docs/01-requisitos/PRD-*.md` — o que o sistema faz (RF), regras (RN), critérios de aceite.
- `docs/02-adr/` — decisões de arquitetura. Só ADRs com status **Aceita** valem (hoje: 001, 002, 003, 013); as demais
  estão em votação — não assuma o resultado. Se uma tarefa depende de ADR não aceita, diga qual e pare.
  Decisões leves (Tipo 2) estão em `docs/02-adr/decisoes-leves.md`.
- `docs/03-ddd/linguagem-ubiqua.md` — **tradução oficial de cada termo para o código** (§1 módulos, §2–§6 identificadores,
  §7 status, §8 eventos, §9 casos de uso). Termo sem tradução no glossário não entra no código: proponha a linha no glossário.
- `docs/03-ddd/agregados.md` — agregados, invariantes e eventos de domínio.
- `docs/04-arquitetura/contrato-api.md` — rotas, payloads, códigos de erro (Problem Details).
- `docs/04-arquitetura/estrutura-do-repositorio.md` — camadas da Clean Architecture, árvore de pastas, toolchain, regras de dependência.
- `docs/06-entrega/checklist-de-entrega.md` — o que precisa existir para a nota; atualize quando fechar um item.

Se algo não está documentado, é **scope creep**: aponte, não implemente.

## Regras de arquitetura

Cada regra cita a fonte. As marcadas com 🗳️ são a **proposta em votação**: só bloqueiam PR quando a ADR estiver
**Aceita** — até lá, aponte divergências como `[dúvida]` citando a enquete, nunca como `[bloqueia]`.

1. Monólito modular por contexto delimitado: módulos `customers`, `catalog`, `service-orders` (core), `identity` e
   `shared` (monólito: enunciado; módulos e nomes: `docs/03-ddd/contextos-delimitados.md`, ADR-013).
2. ADR-003 (Aceita) — **Clean Architecture** em cada módulo: `domain/` (entities: agregados, VOs, eventos, políticas —
   TypeScript puro) ← `application/` (use cases, input/output boundaries, request/response models, portas de saída) ←
   `adapters/` (controllers, presenters, gateways que mapeiam ORM ↔ domínio, DTOs) ← `infrastructure/` (módulo Nest, ORM,
   migrações, config). Dependência sempre de fora para dentro; `domain/` e `application/` não importam `@nestjs/*` nem ORM.
3. ADR-003 (Aceita) — módulos só se comunicam pela **porta exposta** em `application/ports` do outro (`CustomerLookup`,
   `CatalogLookup`, `StockMovements`) ou por eventos de domínio — nunca import de `domain/` de outro módulo, nunca JOIN
   entre schemas. Sufixo `UseCase` nas classes de caso de uso; nunca `Service` (colide com a entidade `Service` do catálogo).
4. Status da OS (`ServiceOrderStatus`: `RECEIVED`, `IN_DIAGNOSIS`, `AWAITING_APPROVAL`, `IN_PROGRESS`, `COMPLETED`,
   `DELIVERED`) muda **somente** por comandos de negócio (`startDiagnosis`, `sendQuote`, `approveQuote`, `complete`,
   `deliver`…); nunca `PATCH status`. Toda transição gera `StatusHistoryEntry` (PRD-004). Recusa do orçamento e
   cancelamento (`CANCELLED`): 🗳️ ADR-010 (E-14).
5. `Quote` é derivado dos itens (snapshot de nome/preço na inclusão), recalculado a cada mudança; nunca atribuído (PRD-003).
6. Estoque só muda por `StockMovement` registrado; `stockQuantity >= 0` no domínio e no banco (PRD-002).
   Momento da baixa e comportamento sem estoque: 🗳️ ADR-012 (E-16).
7. `Money` em decimal (2 casas); datas UTC ISO-8601 (`docs/04-arquitetura/contrato-api.md`). Ids gerados na aplicação
   (UUID): 🗳️ ADR-009 (E-11).
8. Erros: 422 validação, 409 conflito/transição inválida, 401/403 auth, 404 inexistente **ou alheio** (cliente) —
   Problem Details com chaves em inglês e textos em português (`contrato-api.md` §5).

## Segurança e dados

- Nunca inclua CPF/CNPJ/placas reais, e-mails reais ou segredos (use `.env.example`, geradores de dados válidos fictícios).
- PII mascarada em logs e nas respostas ao cliente. Validação de CPF/CNPJ (dígitos verificadores) e placa (antiga e Mercosul)
  nos VOs `Document` e `LicensePlate`.
- Rotas administrativas exigem JWT (enunciado; mecanismo: 🗳️ ADR-004, E-08); `/tracking/**` usa o mecanismo da
  ADR-011 (🗳️ E-15); públicas só `/auth/login`, `/health`, `/ready`, `/docs` (dev).

## Testes e qualidade

- Todo código vem com testes. Descrições em inglês: `it('should <resultado> when <condição>')`; cenários BDD em português.
  Domínio testado sem banco/HTTP.
- Cobertura ≥ 80 % (linhas e branches) em `service-orders` e `catalog` (`domain` + `application`); o CI tem gate.
- Máquina de estados: testes parametrizados cobrindo **todas** as combinações status × comando.
- 🗳️ ADR-006 (E-12) define ferramentas, banco nos testes de integração e BDD.

## Git

- 🗳️ ADR-008 (E-10) — proposta: branches `feat/<modulo>-<descricao>`, `fix/…`, `docs/…`, `test/…`, `chore/…`;
  Conventional Commits; PRs pequenos (≤ 400 linhas), template preenchido, 1 aprovação humana, CI verde, squash merge.
- Escopos de commit: módulo em inglês (`customers`, `catalog`, `service-orders`, `identity`, `shared`) ou transversal
  (`infra`, `ci`); `docs` é tipo, não escopo — mudanças só de documentação usam `docs(<pasta>)` — detalhes em
  `docs/00-guia-do-grupo/como-trabalhamos.md` §4.
- Branches criadas pelo Claude usam o prefixo `claude/` (configuração do workflow).

## Como revisar um PR (para a action de revisão e para `@claude revise`)

Siga `prompts/09-revisao-de-pr.md`: rastreabilidade → arquitetura → domínio → API → segurança → testes → docs.
Classifique cada apontamento como `[bloqueia]`, `[sugestão]` ou `[dúvida]` e termine com o veredito.
Nome fora do glossário ou tradução divergente (ex.: `Budget` em vez de `Quote`) é `[bloqueia]`.

## Comandos

> Preencher quando o esqueleto (prompt 02) for mesclado: `npm ci`, `npm run start:dev`, `npm test`, `npm run test:e2e`,
> `npm run test:cov`, `npm run lint`, `docker compose up --build`.
