# ADR-008 — Fluxo Git, revisão de código e integração contínua

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-10 encerrada em 22/09/2026: **GitFlow** (Opção B, diferente da recomendação) + **Conventional Commits obrigatórios** |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-10** (duas perguntas: fluxo e commits) |
| Data | 2026-09-14 (proposta) · 2026-09-22 (decisão) |
| Relacionadas | `docs/00-guia-do-grupo/como-trabalhamos.md`, ADR-006, ADR-007 |

## Contexto e problema

Time assíncrono, 3–5 pessoas, prazo curto, repositório privado com avaliador externo (`soat-architecture`). Precisamos de
um fluxo que evite conflitos, mantenha `master` sempre demonstrável e produza evidências (CI verde, cobertura, scans). A
Fase 2 aprofunda CI/CD com GitHub Actions e SonarQube — o que fizermos agora é a base.

## Opções consideradas

### Opção A — Trunk-based com branches curtas

`master` protegida; branches `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…` com vida ≤ 3 dias; PR com template;
**1 aprovação** de outro membro; CI verde obrigatório; **squash merge**; tags `v0.x` nos marcos (M2–M7).

- **Prós:** simples; poucas branches vivas; `master` sempre integrada; ideal para times pequenos e assíncronos.
- **Contras:** exige PRs pequenos e feature flags/`Could` desligáveis quando algo fica pela metade (raro no MVP).

### Opção B — GitFlow (`develop`, `release/*`, `hotfix/*`)

- **Prós:** separação entre "em desenvolvimento" e "entregue".
- **Contras:** overhead para 1 entrega; merges duplos; `develop` diverge de `master`; não há "produção" nesta fase.

## Sub-decisões propostas

| Item | Proposta |
|---|---|
| Commits | **Conventional Commits** (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`) com escopo = módulo ou transversal (`infra`, `ci`); no tipo `docs`, escopo = pasta afetada — lista em `docs/00-guia-do-grupo/como-trabalhamos.md` §4 |
| Revisão | 1 aprovação; autor não aprova o próprio PR; revisar em ≤ 24 h (check-in cobra) |
| CI (todo PR) | build → lint/format → testes unit + integração → cobertura com gate → Semgrep/SCA/gitleaks → build da imagem + Trivy |
| CI (`master`) | tudo acima + publica `openapi.json` + relatório de cobertura como artefatos; ZAP manual/agendado |
| Proteções | `master`: sem push direto; exigir CI; exigir 1 aprovação; branches apagadas após merge |
| Versionamento | Tags anotadas SemVer nos marcos (`v0.1.0` M2 → `v0.2.0` M3 → `v0.3.0` M4 → `v1.0.0-rc.1` freeze → **`v1.0.0` entrega**); release no GitHub só na entrega, com notas automáticas e anexos; Fase 2 começa em `v2.0.0` (detalhes em `docs/00-guia-do-grupo/como-trabalhamos.md`) |
| Issues/PR | templates em `.github/` (`ISSUE_TEMPLATE/tarefa.md`, `ISSUE_TEMPLATE/decisao.md`, `PULL_REQUEST_TEMPLATE.md`) |

## Recomendação (não vinculante)

**Opção A + Conventional Commits.**

## Decisão

**GitFlow** (Opção B) **com Conventional Commits obrigatórios**, checados no CI. Adaptado ao tamanho do grupo (3 pessoas desde 22/09,
1 entrega com 5 marcos):

| Branch | Papel | Sai de | Volta para | Regras |
|---|---|---|---|---|
| `master` | O que está **entregue/demonstrável**; só recebe `release/*` e `hotfix/*`; cada merge recebe uma tag | — | — | protegida: sem push direto, PR + 1 aprovação + CI verde; **sem bypass para ninguém** desde 23/09 (o enunciado exige tudo via PR; antes, bypass de emergência — issue #1) |
| `develop` | **Integração contínua**; base de todo trabalho | `master` (criada uma vez por F1) | — | protegida com as mesmas regras da `master` |
| `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…` | Trabalho do dia a dia — são as *feature branches* do GitFlow, com os prefixos já combinados (`tipo/escopo-descricao`) | `develop` | `develop` | vida ≤ 3 dias; PR com template; **squash merge**; apagada após o merge |
| `release/vX.Y.Z` | Fechamento de um marco (M2–M7): só correções, docs e ensaio do vídeo | `develop` | `master` (**merge commit**, `--no-ff`) + tag anotada `vX.Y.Z` em `master` + merge de volta em `develop` | criada por F1; correções entram por `fix/…` com PR para a release |
| `hotfix/vX.Y.Z` | Correção em algo já taggeado (ex.: o scan 2 achou algo em `v1.0.0-rc.1`) | `master` | `master` (+ tag patch) + merge de volta em `develop` | criada por F1 |

Sub-decisões fechadas:

| Item | Decisão |
|---|---|
| Conventional Commits | **Obrigatórios.** O CI valida o **título do PR** (`amannn/action-semantic-pull-request`) porque, com squash, é ele que vira a mensagem do commit em `develop`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`; escopos em `como-trabalhamos.md` §4. Commits individuais na branch seguem o mesmo formato (commitlint local via husky é Could) |
| Branch padrão no GitHub | continua `master` (o avaliador cai na versão entregue). Todo PR de trabalho aponta para **`develop`** — o template de PR lembra, e o CI recusa PR para `master` cuja origem não seja `release/*` ou `hotfix/*` |
| Revisão | 1 aprovação de outro membro; autor não aprova o próprio PR; revisar em ≤ 24 h |
| CI em PR (para `develop`, `release/*` ou `master`) | título Conventional → lint → `dependency-cruiser` → unitários → integração (Testcontainers) → BDD → cobertura com gate → Semgrep/SCA/gitleaks/hadolint → build da imagem + Trivy |
| CI em push em `develop` | tudo acima + publica relatório de cobertura e `openapi.json` como artefatos |
| CI em push em `master` / tag | tudo acima + imagem `<sistema>-api:vX.Y.Z` + ZAP (manual ou agendado) |
| Versionamento | tags criadas **no merge da `release/*` em `master`**: `v0.1.0` (M2) → `v0.2.0` (M3) → `v0.3.0` (M4) → `v1.0.0-rc.1` (M6) → `v1.0.0` (M7); release no GitHub só em `v1.0.0`; Fase 2 começa em `v2.0.0` |
| `@claude` no GitHub | branches `claude/*` criadas a partir de `develop` (input `base_branch: develop` da action) com PR para `develop` |

## Consequências

- **F1 cria `develop`** a partir de `master` e aplica a mesma proteção (registro em `decisoes-leves.md`, 22/09); a
  proteção da `master` (issue #1) continua.
- `como-trabalhamos.md` §4, `CONTRIBUTING.md`, `CLAUDE.md`, o template de PR e os workflows do Claude atualizados em
  22/09/2026.
- Custo aceito: merges duplos (release → master → develop) em 5 marcos e `develop` à frente de `master` entre marcos —
  a demo do vídeo e o PDF usam sempre uma tag em `master`.
- Workflows `ci.yml` e `security.yml` (esqueleto, `prompts/02-esqueleto-do-projeto.md`) com gatilhos em PR e em push
  para `develop` e `master`.
- **Enunciado atualizado (23/09):** o repositório deve ser **público** durante a correção e o PDF informa branch + hash da
  entrega. O texto cita "a branch main deve sempre estar protegida e tudo que chegar nela deve vir através de PR" — com a
  proteção **sem bypass** (decisoes-leves, 23/09), a `master` cumpre a regra daqui em diante; os commits diretos da fase de
  planejamento até 23/09 ficaram registrados como exceção, sem reescrever o histórico. Renomear `master` → `main` é decisão leve de F1 (custo baixo antes do esqueleto; se fizer,
  atualizar workflows, docs e a proteção).

## Enquete (texto para o Discord)

> **Enquete E-10 — ADR-008 Git/CI** (prazo 72 h)
> 🌳 Trunk-based (recomendada) · 🌊 GitFlow
> Conventional Commits obrigatórios? 👍 / 👎
