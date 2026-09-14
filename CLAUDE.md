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
- `docs/03-ddd/linguagem-ubiqua.md` — nomes canônicos (idioma dos nomes no código/API: ADR-013, em votação — E-07).
- `docs/03-ddd/agregados.md` — agregados, invariantes e eventos de domínio.
- `docs/04-arquitetura/contrato-api.md` — rotas, payloads, códigos de erro (Problem Details).
- `docs/04-arquitetura/estrutura-do-repositorio.md` — onde cada coisa mora e a regra de dependência.
- `docs/06-entrega/checklist-de-entrega.md` — o que precisa existir para a nota; atualize quando fechar um item.

Se algo não está documentado, é **scope creep**: aponte, não implemente.

## Regras de arquitetura

**Fixas** — vêm do enunciado, dos PRDs e do contrato da API; não dependem de enquete:

1. Back-end **monolítico** nesta fase; módulos = contextos delimitados (`docs/03-ddd/contextos-delimitados.md`):
   `cadastro`, `catalogo-estoque`, `atendimento` (core), `identidade`, mais `shared`.
2. Status da OS muda **somente** por comandos de negócio (`iniciarDiagnostico`, `enviarOrcamento`, `aprovarOrcamento`,
   `finalizar`, `entregar`…); nunca `PATCH status`. Toda transição gera histórico (PRD-004).
3. Orçamento é derivado dos itens (snapshot de nome/preço na inclusão), recalculado a cada mudança; nunca atribuído (PRD-003).
4. Estoque só muda por movimentação registrada; `quantidadeEstoque >= 0` no domínio e no banco (PRD-002).
5. Dinheiro em decimal (2 casas); datas UTC ISO-8601; erros: 422 validação, 409 conflito/transição inválida, 401/403 auth,
   404 inexistente **ou alheio** (cliente) — `docs/04-arquitetura/contrato-api.md`.

**Definidas por votação** — só valem depois de a ADR ficar *Aceita*. Até lá: não implemente código que dependa delas e,
em revisão de PR, aponte como `[dúvida]`, nunca `[bloqueia]`. Quando a ADR for aceita, mova a regra para a lista fixa.

| Regra proposta | ADR (enquete) |
|---|---|
| Camadas por módulo: `domain` (puro, sem framework/ORM) ← `application` (casos de uso, portas) ← `adapters/in` (REST) e `adapters/out` (persistência, JWT, notificação, relógio, ids); dependência sempre de fora para dentro; módulos só se comunicam por **portas de aplicação** ou eventos de domínio, nunca por import de `domain` de outro módulo | ADR-003 (E-06) |
| Um schema por módulo; nunca JOIN entre schemas | ADR-002 (E-05) |
| Ids gerados na aplicação (UUID) + número legível da OS | ADR-009 (E-11) |
| Idioma dos nomes: domínio em português, termos técnicos em inglês | ADR-013 (E-07) |
| Recusa/cancelamento do orçamento (7º status, comandos `recusar`/`cancelar`) | ADR-010 (E-14) |
| Momento da baixa de estoque na OS e peça sem estoque | ADR-012 (E-16) |
| Mecanismo de acesso do cliente em `/acompanhamento/**` | ADR-011 (E-15) |
| Banco nos testes de integração, BDD e ferramentas de cobertura | ADR-006 (E-12) |
| Fluxo Git (trunk-based, squash, 1 aprovação, Conventional Commits) | ADR-008 (E-10) |

## Segurança e dados

- Nunca inclua CPF/CNPJ/placas reais, e-mails reais ou segredos (use `.env.example`, geradores de dados válidos fictícios).
- PII mascarada em logs e nas respostas ao cliente. Validação de CPF/CNPJ (dígitos verificadores) e placa (antiga e Mercosul).
- Rotas administrativas exigem JWT (enunciado; implementação conforme ADR-004, E-08); `/acompanhamento/**` usa o
  mecanismo da ADR-011 (E-15); públicas só `/auth/login`, `/health`, `/ready`.

## Testes e qualidade

- Todo código vem com testes. Nome: `deve_<resultado>_quando_<condição>`. Domínio testado sem banco/HTTP.
- Cobertura ≥ 80 % em `atendimento` e `catalogo-estoque` (`domain` + `application`) é do enunciado; métrica (linhas e
  branches), ferramentas e BDD conforme ADR-006 (E-12); o CI tem gate.
- Máquina de estados: testes parametrizados cobrindo **todas** as combinações status × comando.

## Git

- Convenção **provisória** até a ADR-008 (E-10) ser aceita — já usada nos PRs de documentação: branches
  `feat/<modulo>-<descricao>`, `fix/…`, `docs/…`, `test/…`, `chore/…`; Conventional Commits com escopo = módulo
  (`cadastro`, `catalogo-estoque`, `atendimento`, `identidade`, `shared`) ou área transversal (`docs`, `adr`, `guia`,
  `github`, `infra`, `ci`).
- PRs pequenos (≤ 400 linhas), template preenchido, 1 aprovação humana, CI verde, squash merge. Branches criadas pelo
  Claude usam o prefixo `claude/`.

## Como revisar um PR (para a action de revisão e para `@claude revise`)

Siga `prompts/09-revisao-de-pr.md`: rastreabilidade → arquitetura → domínio → API → segurança → testes → docs.
Classifique cada apontamento como `[bloqueia]`, `[sugestão]` ou `[dúvida]` e termine com o veredito.

## Comandos

> Preencher após a ADR-001 (linguagem) ser aceita: build, testes, cobertura, lint, `docker compose up`.
