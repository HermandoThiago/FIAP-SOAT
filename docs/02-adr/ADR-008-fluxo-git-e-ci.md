# ADR-008 — Fluxo Git, revisão de código e integração contínua

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 2) |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-10** |
| Data | 2026-09-14 |
| Relacionadas | `docs/00-guia-do-grupo/como-trabalhamos.md`, ADR-006, ADR-007 |

## Contexto e problema

Time assíncrono, 3–5 pessoas, prazo curto, repositório privado com avaliador externo (`soat-architecture`). Precisamos de
um fluxo que evite conflitos, mantenha `main` sempre demonstrável e produza evidências (CI verde, cobertura, scans). A
Fase 2 aprofunda CI/CD com GitHub Actions e SonarQube — o que fizermos agora é a base.

## Opções consideradas

### Opção A — Trunk-based com branches curtas

`main` protegida; branches `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…` com vida ≤ 3 dias; PR com template;
**1 aprovação** de outro membro; CI verde obrigatório; **squash merge**; tags `v0.x` nos marcos (M2–M7).

- **Prós:** simples; poucas branches vivas; `main` sempre integrada; ideal para times pequenos e assíncronos.
- **Contras:** exige PRs pequenos e feature flags/`Could` desligáveis quando algo fica pela metade (raro no MVP).

### Opção B — GitFlow (`develop`, `release/*`, `hotfix/*`)

- **Prós:** separação entre "em desenvolvimento" e "entregue".
- **Contras:** overhead para 1 entrega; merges duplos; `develop` diverge de `main`; não há "produção" nesta fase.

## Sub-decisões

| Item | Proposta |
|---|---|
| Commits | **Conventional Commits** (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`) com escopo = módulo |
| Revisão | 1 aprovação; autor não aprova o próprio PR; revisar em ≤ 24 h (check-in cobra) |
| CI (todo PR) | build → lint/format → testes unit + integração → cobertura com gate → Semgrep/SCA/gitleaks → build da imagem + Trivy |
| CI (`main`) | tudo acima + publica `openapi.json` + relatório de cobertura como artefatos; ZAP manual/agendado |
| Proteções | `main`: sem push direto; exigir CI; exigir 1 aprovação; branches apagadas após merge |
| Versionamento | Tags anotadas SemVer nos marcos (`v0.1.0` M2 → `v0.2.0` M3 → `v0.3.0` M4 → `v1.0.0-rc.1` freeze → **`v1.0.0` entrega**); release no GitHub só na entrega, com notas automáticas e anexos; Fase 2 começa em `v2.0.0` (detalhes em `docs/00-guia-do-grupo/como-trabalhamos.md`) |
| Issues/PR | templates em `_github/` (mover para `.github/`) |

## Recomendação (não vinculante)

**Opção A + Conventional Commits.**

## Decisão

> Preencher após a enquete E-10.

## Consequências

- Configurar proteção de `main` no dia 1 (mesmo com docs apenas).
- Workflows: `ci.yml` (build/test/cobertura) e `security.yml` (scans) — esqueleto gerado após ADR-001 (`prompts/02-esqueleto-do-projeto.md`).

## Enquete (texto para o Discord)

> **Enquete E-10 — ADR-008 Git/CI** (prazo 48 h)
> 🌳 Trunk-based (recomendada) · 🌊 GitFlow
> Conventional Commits obrigatórios? 👍 / 👎
