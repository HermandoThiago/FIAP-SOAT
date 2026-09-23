# Prompts para sessões de IA (referência do grupo)

> Combinado em `docs/00-guia-do-grupo/como-trabalhamos.md` §7: a IA gera esqueleto e apoio; **a pessoa da frente
> entende, revisa, testa e sabe explicar no vídeo**. Nada gerado entra sem PR + revisão + CI.

## Como usar

1. Abra uma sessão nova (Claude Code, Claude.ai com projeto, ou similar) **na pasta do repositório** para que a IA leia `docs/`.
2. Cole primeiro o **`00-contexto-base.md`** (ou aponte a IA para ele) — ele resume domínio, decisões e convenções.
3. Cole o prompt da frente (`01`–`09`). Os placeholders `{{...}}` já foram substituídos pelos resultados das enquetes
   (Lotes 1–3 encerrados em 22/09/2026); se encontrar algum, a fonte é a tabela abaixo.
4. Peça sempre: *"antes de gerar, liste as suposições e o plano em 10 linhas; só então implemente"*.
5. Revise o resultado contra o PRD/ADR; rode testes; abra PR para `develop` com o template.

## Decisões que os prompts assumem (todas fechadas)

| Tema | Fonte | Valor |
|---|---|---|
| Linguagem / framework | ADR-001 ✅ | TypeScript 5 / NestJS 11 (Node 22) |
| Banco / ORM / migrações | ADR-002 ✅ / E-17 ✅ | PostgreSQL 16 (um schema por módulo) / Prisma / Prisma Migrate |
| Arquitetura | ADR-003 ✅ (revotada 22/09) | Camadas clássicas por módulo: `controllers/` + `dto/` → `services/` → `repositories/`, sobre `domain/` |
| Autenticação | ADR-004 ✅ | JWT próprio HS256, bcrypt, papéis `ATTENDANT`/`MECHANIC`/`MANAGER` + `CUSTOMER` |
| OpenAPI | ADR-005 ✅ | Code-first com `@nestjs/swagger` (`/docs`, `/docs/openapi.json`) |
| Testes | ADR-006 ✅ | Jest + supertest + Testcontainers + Cucumber-js; `coverageThreshold` 80 % em `domain` + `services` |
| Scans | ADR-007 ✅ | Semgrep + npm audit/Trivy fs + Trivy image + hadolint + gitleaks + ZAP |
| Git | ADR-008 ✅ | GitFlow (`develop`/`release`/`hotfix`) + Conventional Commits obrigatórios |
| Ids | ADR-009 ✅ | UUID v4 (`crypto.randomUUID`) + número `OS-AAAA-NNNNNN` |
| Recusa / cancelamento | ADR-010 ✅ | → `CANCELLED` (terminal), só antes da aprovação; sem volta para diagnóstico |
| Acesso do cliente | ADR-011 ✅ | Token de acompanhamento (`aud=tracking`) **ou** login `CUSTOMER` |
| Estoque | ADR-012 ✅ | Reserva na aprovação + baixa na finalização; 422 sem estoque |
| Idioma | ADR-013 ✅ | Tudo em inglês com glossário (`docs/ddd/linguagem-ubiqua.md`) |

## Índice

| Prompt | Frente | Quando |
|---|---|---|
| `00-contexto-base.md` | todos | início de toda sessão |
| `01-event-storming-miro.md` | F2 | semana 2 |
| `02-esqueleto-do-projeto.md` | F1 + F5 infra — Hermando; Etapa 2 (banco/Prisma) com Diego | agora (todas as ADRs aceitas) |
| `03-modulo-atendimento.md` (módulo `service-orders`) | F3 — Diego | semanas 3–5 |
| `04-modulo-catalogo-estoque.md` (módulo `catalog`) | F3 — Hermando | semanas 3–5 |
| `05-modulos-cadastro-e-identidade.md` (módulos `customers` e `identity`) | F3 Hermando / F4 | semana 3 |
| `06-testes-bdd-e-cobertura.md` | F4 | semanas 4–6 |
| `07-seguranca-e-scans.md` | F4 | semanas 5–6 |
| `08-readme-video-e-entrega.md` | F5 — Hermando (README/execução) · Shirley (roteiro, PDF) | semanas 7–8 |
| `09-revisao-de-pr.md` | todos | a cada PR |

## Regras de ouro ao usar IA neste projeto

- Não colar dados pessoais reais; usar geradores de CPF/CNPJ/placa fictícios válidos.
- Pedir **testes junto com o código**, sempre.
- Pedir que a IA **cite o documento** (`docs/...`) que justifica cada regra implementada — se não houver, é scope creep.
- Trechos que ninguém do grupo consegue explicar: simplificar ou remover.
