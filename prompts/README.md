# Prompts para sessões de IA (referência do grupo)

> Combinado em `docs/00-guia-do-grupo/como-trabalhamos.md` §7: a IA gera esqueleto e apoio; **a pessoa da frente
> entende, revisa, testa e sabe explicar no vídeo**. Nada gerado entra sem PR + revisão + CI.

## Como usar

1. Abra uma sessão nova (Claude Code, Claude.ai com projeto, ou similar) **na pasta do repositório** para que a IA leia `docs/`.
2. Cole primeiro o **`00-contexto-base.md`** (ou aponte a IA para ele) — ele resume domínio, decisões e convenções.
3. Cole o prompt da frente (`01`–`09`), preenchendo os placeholders `{{...}}` com os resultados das ADRs.
4. Peça sempre: *"antes de gerar, liste as suposições e o plano em 10 linhas; só então implemente"*.
5. Revise o resultado contra o PRD/ADR; rode testes; abra PR com o template.

## Placeholders (preencher após as enquetes)

| Placeholder | Fonte | Exemplo |
|---|---|---|
| `{{LINGUAGEM}}` / `{{FRAMEWORK}}` | ADR-001 ✅ | **TypeScript 5 / NestJS 11 (Node 22)** — já preenchido nos prompts |
| `{{BANCO}}` / `{{ORM}}` / `{{MIGRACOES}}` | ADR-002 ✅ / decisão leve | **PostgreSQL 16** / `{{ORM}}` = TypeORM ou Prisma (pendente em `decisoes-leves.md`) |
| `{{ARQUITETURA}}` | ADR-003 ✅ | **Clean Architecture completa, modular por contexto** — já preenchido |
| `{{AUTH}}` | ADR-004 | `JWT próprio HS256, bcrypt, papéis ATTENDANT/MECHANIC/MANAGER` |
| `{{OPENAPI}}` | ADR-005 | `code-first com @nestjs/swagger` |
| `{{TESTES}}` | ADR-006 | `Jest + supertest + Testcontainers + Cucumber-js; coverageThreshold 80 %` |
| `{{SCANS}}` | ADR-007 | `Semgrep + npm audit/Trivy fs + Trivy image + gitleaks + ZAP` |
| `{{GIT}}` | ADR-008 | `trunk-based, conventional commits, squash` |
| `{{IDS}}` | ADR-009 | `UUID v7 + número OS-AAAA-NNNNNN` |
| `{{RECUSA}}` | ADR-010 | `volta para IN_DIAGNOSIS; CANCELLED existe` |
| `{{ACESSO_CLIENTE}}` | ADR-011 | `token de acompanhamento JWT aud=cliente` |
| `{{ESTOQUE}}` | ADR-012 | `baixa na aprovação; bloquear sem estoque` |
| `{{IDIOMA}}` | ADR-013 ✅ | **tudo em inglês com glossário** (`docs/03-ddd/linguagem-ubiqua.md`) — já preenchido |

## Índice

| Prompt | Frente | Quando |
|---|---|---|
| `00-contexto-base.md` | todos | início de toda sessão |
| `01-event-storming-miro.md` | F2 | semana 2 |
| `02-esqueleto-do-projeto.md` | F1 + F5 (Vi) | agora (Lote 1 aceito) |
| `03-modulo-atendimento.md` (módulo `service-orders`) | F3 — Diego | semanas 3–5 |
| `04-modulo-catalogo-estoque.md` (módulo `catalog`) | F3 — Hermando | semanas 3–5 |
| `05-modulos-cadastro-e-identidade.md` (módulos `customers` e `identity`) | F3 Hermando / F4 | semana 3 |
| `06-testes-bdd-e-cobertura.md` | F4 | semanas 4–6 |
| `07-seguranca-e-scans.md` | F4 | semanas 5–6 |
| `08-readme-video-e-entrega.md` | F5 | semanas 7–8 |
| `09-revisao-de-pr.md` | todos | a cada PR |

## Regras de ouro ao usar IA neste projeto

- Não colar dados pessoais reais; usar geradores de CPF/CNPJ/placa fictícios válidos.
- Pedir **testes junto com o código**, sempre.
- Pedir que a IA **cite o documento** (`docs/...`) que justifica cada regra implementada — se não houver, é scope creep.
- Trechos que ninguém do grupo consegue explicar: simplificar ou remover.
