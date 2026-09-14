# CLAUDE.md — instruções para o Claude neste repositório

Lido automaticamente pelo Claude Code (CLI) e pelas GitHub Actions (`@claude` e revisão de PR). Mantenha curto;
detalhes ficam em `docs/`.

## O projeto

Tech Challenge Fase 1 da FIAP Pós Tech Software Architecture: MVP do back-end **monolítico** de uma oficina mecânica
(ordens de serviço, clientes, veículos, catálogo/estoque, orçamento com aprovação do cliente), com DDD, testes ≥ 80 %
nos domínios críticos e desenvolvimento seguro. Responda **em português**.

## Fonte da verdade (leia antes de propor qualquer coisa)

- `docs/01-requisitos/PRD-*.md` — o que o sistema faz (RF), regras (RN), critérios de aceite.
- `docs/02-adr/` — decisões de arquitetura. Só ADRs com status **Aceita** valem; as demais estão em votação — não
  assuma o resultado. Se uma tarefa depende de ADR não aceita, diga qual e pare.
- `docs/03-ddd/linguagem-ubiqua.md` — nomes canônicos. O idioma do código e da API (proposta: domínio em português,
  termos técnicos em inglês) é definido pela ADR-013 — 🗳️ enquete E-07.
- `docs/03-ddd/agregados.md` — agregados, invariantes e eventos de domínio.
- `docs/04-arquitetura/contrato-api.md` — rotas, payloads, códigos de erro (Problem Details).
- `docs/04-arquitetura/estrutura-do-repositorio.md` — onde cada coisa mora e a regra de dependência.
- `docs/06-entrega/checklist-de-entrega.md` — o que precisa existir para a nota; atualize quando fechar um item.

Se algo não está documentado, é **scope creep**: aponte, não implemente.

## Regras de arquitetura

Cada regra cita a fonte. As marcadas com 🗳️ são a **proposta em votação** (decisão do grupo na issue #1): só bloqueiam
PR quando a ADR estiver **Aceita** — até lá, aponte divergências como `[dúvida]` citando a enquete, nunca como `[bloqueia]`.

1. Monólito modular com os módulos `cadastro`, `catalogo-estoque`, `atendimento` (core), `identidade` e `shared`
   (monólito: enunciado; módulos: `docs/03-ddd/contextos-delimitados.md`).
2. 🗳️ ADR-003 (E-06) — dentro do módulo: `domain` (puro, sem framework/ORM) ← `application` (casos de uso, portas) ←
   `adapters/in` (REST) e `adapters/out` (persistência, JWT, notificação, relógio, ids). Dependência sempre de fora para dentro.
3. 🗳️ ADR-003 (E-06) — módulos só se comunicam por **portas de aplicação** ou eventos de domínio — nunca import de
   `domain` de outro módulo, nunca JOIN entre schemas.
4. Status da OS muda **somente** por comandos de negócio (`iniciarDiagnostico`, `enviarOrcamento`, `aprovarOrcamento`,
   `finalizar`, `entregar`…); nunca `PATCH status`. Toda transição gera histórico (PRD-004). Recusa do orçamento e
   cancelamento: 🗳️ ADR-010 (E-14).
5. Orçamento é derivado dos itens (snapshot de nome/preço na inclusão), recalculado a cada mudança; nunca atribuído (PRD-003).
6. Estoque só muda por movimentação registrada; `quantidadeEstoque >= 0` no domínio e no banco (PRD-002).
   Momento da baixa e comportamento sem estoque: 🗳️ ADR-012 (E-16).
7. Dinheiro em decimal (2 casas); datas UTC ISO-8601 (`docs/04-arquitetura/contrato-api.md`). Ids gerados na aplicação
   (UUID): 🗳️ ADR-009 (E-11).
8. Erros: 422 validação, 409 conflito/transição inválida, 401/403 auth, 404 inexistente **ou alheio** (cliente) —
   `docs/04-arquitetura/contrato-api.md`.

## Segurança e dados

- Nunca inclua CPF/CNPJ/placas reais, e-mails reais ou segredos (use `.env.example`, geradores de dados válidos fictícios).
- PII mascarada em logs e nas respostas ao cliente. Validação de CPF/CNPJ (dígitos verificadores) e placa (antiga e Mercosul).
- Rotas administrativas exigem JWT (enunciado; mecanismo: 🗳️ ADR-004, E-08); `/acompanhamento/**` usa o mecanismo da
  ADR-011 (🗳️ E-15); públicas só `/auth/login`, `/health`, `/ready`.

## Testes e qualidade

- Todo código vem com testes. Nome: `deve_<resultado>_quando_<condição>`. Domínio testado sem banco/HTTP.
- Cobertura ≥ 80 % (linhas e branches) em `atendimento` e `catalogo-estoque` (`domain` + `application`); o CI tem gate.
- Máquina de estados: testes parametrizados cobrindo **todas** as combinações status × comando.
- 🗳️ ADR-006 (E-12) define ferramentas, banco nos testes de integração e BDD.

## Git

- 🗳️ ADR-008 (E-10) — proposta: branches `feat/<modulo>-<descricao>`, `fix/…`, `docs/…`, `test/…`, `chore/…`;
  Conventional Commits com escopo = módulo; PRs pequenos (≤ 400 linhas), template preenchido, 1 aprovação humana, CI verde, squash merge.
- Branches criadas pelo Claude usam o prefixo `claude/` (configuração do workflow).

## Como revisar um PR (para a action de revisão e para `@claude revise`)

Siga `prompts/09-revisao-de-pr.md`: rastreabilidade → arquitetura → domínio → API → segurança → testes → docs.
Classifique cada apontamento como `[bloqueia]`, `[sugestão]` ou `[dúvida]` e termine com o veredito.

## Comandos

> Preencher após a ADR-001 (linguagem) ser aceita: build, testes, cobertura, lint, `docker compose up`.
