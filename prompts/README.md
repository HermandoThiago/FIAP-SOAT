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
| `{{LINGUAGEM}}` / `{{FRAMEWORK}}` | ADR-001 | `Java 21` / `Spring Boot 3.3` |
| `{{BANCO}}` / `{{ORM}}` / `{{MIGRACOES}}` | ADR-002 | `PostgreSQL 16` / `Spring Data JPA` / `Flyway` |
| `{{ARQUITETURA}}` | ADR-003 | `monólito modular + hexagonal` |
| `{{AUTH}}` | ADR-004 | `JWT próprio HS256, bcrypt, papéis ATENDENTE/MECANICO/GERENTE` |
| `{{OPENAPI}}` | ADR-005 | `code-first com springdoc` |
| `{{TESTES}}` | ADR-006 | `JUnit 5 + Testcontainers + Cucumber; JaCoCo gate 80 %` |
| `{{SCANS}}` | ADR-007 | `Semgrep + Dependency-Check + Trivy + gitleaks + ZAP` |
| `{{GIT}}` | ADR-008 | `trunk-based, conventional commits, squash` |
| `{{IDS}}` | ADR-009 | `UUID v7 + número OS-AAAA-NNNNNN` |
| `{{RECUSA}}` | ADR-010 | `volta para EM_DIAGNOSTICO; CANCELADA existe` |
| `{{ACESSO_CLIENTE}}` | ADR-011 | `token de acompanhamento JWT aud=cliente` |
| `{{ESTOQUE}}` | ADR-012 | `baixa na aprovação; bloquear sem estoque` |
| `{{IDIOMA}}` | ADR-013 | `domínio em português, técnico em inglês` |

## Índice

| Prompt | Frente | Quando |
|---|---|---|
| `00-contexto-base.md` | todos | início de toda sessão |
| `01-event-storming-miro.md` | F2 | semana 2 |
| `02-esqueleto-do-projeto.md` | F1 | após Lote 1 |
| `03-modulo-atendimento.md` | F3 | semanas 3–5 |
| `04-modulo-catalogo-estoque.md` | F3 | semanas 3–5 |
| `05-modulos-cadastro-e-identidade.md` | F3/F4 | semana 3 |
| `06-testes-bdd-e-cobertura.md` | F4 | semanas 4–6 |
| `07-seguranca-e-scans.md` | F4 | semanas 5–6 |
| `08-readme-video-e-entrega.md` | F5 | semanas 7–8 |
| `09-revisao-de-pr.md` | todos | a cada PR |

## Regras de ouro ao usar IA neste projeto

- Não colar dados pessoais reais; usar geradores de CPF/CNPJ/placa fictícios válidos.
- Pedir **testes junto com o código**, sempre.
- Pedir que a IA **cite o documento** (`docs/...`) que justifica cada regra implementada — se não houver, é scope creep.
- Trechos que ninguém do grupo consegue explicar: simplificar ou remover.
