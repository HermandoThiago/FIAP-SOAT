# Documento de entrega — Tech Challenge Fase 1 (template do PDF único)

> O enunciado (versão de 23/09/2026) exige **um único arquivo PDF** com todas as informações e links necessários. Gerar a
> partir deste Markdown (VS Code + *Markdown PDF*, ou Google Docs). Conferir todos os links em janela anônima antes de
> enviar: a avaliação considera **exclusivamente** a branch e o hash de commit informados aqui.

---

# FIAP Pós Tech — Software Architecture (SOAT)
## Tech Challenge — Fase 1

### 1. Identificação da entrega (obrigatória na primeira página)

| Campo | Valor |
|---|---|
| Curso | SOAT — Software Architecture |
| Fase | 1 |
| Número do grupo | 49 |
| Linguagem e principais tecnologias | TypeScript 5 + NestJS 11 (Node 22) · Prisma · PostgreSQL 16 · JWT (HS256) + bcrypt · Jest, Testcontainers, Cucumber-js · Swagger (`@nestjs/swagger`) · Docker + docker compose · GitHub Actions (Semgrep, Trivy, gitleaks, ZAP) |

| Nome completo | RM | Username no Discord |
|---|---|---|
| Shirley Balbino | `<RM>` | shirleybalbino |
| Diego Marques | RM369305 | dmosantos |
| Hermando Thiago | RM378259 | hermandothiago |

### 2. Repositório do projeto

| Item | Valor |
|---|---|
| Repositório (**público** durante a correção e a revisão de notas) | `<https://github.com/…/FIAP-SOAT>` |
| Branch da entrega | `master` |
| Tag e **hash do commit** da entrega | `v1.0.0` · `<hash completo>` |
| README (objetivo, solução, arquitetura, tecnologias, pré-requisitos, execução, testes, Swagger, banco, credenciais, diretórios, links) | `<link para o README.md nesse commit>` |
| Documentação da API (Swagger/OpenAPI) | `http://localhost:8080/docs` após `docker compose up` (instruções no README) |
| Relatório da análise de vulnerabilidades | `<link para docs/06-entrega/relatorio-de-vulnerabilidades.md nesse commit>` |
| Evidência de cobertura ≥ 80 % nos domínios críticos | `<link para docs/06-entrega/evidencias/cobertura.md>` |

### 3. Vídeo da entrega

| Item | Valor |
|---|---|
| YouTube (**público**, ≤ 15 min, mesmo commit informado acima) | `<link>` |

### 4. Documentação DDD

| Item | Valor |
|---|---|
| Miro (acessível **sem solicitação de permissão**) | `<link>` |
| Exportação no repositório | `docs/ddd/event-storming.pdf` · `docs/ddd/diagramas.pdf` · `docs/ddd/linguagem-ubiqua.md` |

### 5. Como executar (resumo — detalhes no README)

```bash
git clone <repositório> && cd FIAP-SOAT
cp .env.example .env
docker compose up --build
# Swagger: http://localhost:8080/docs
# Login:   POST /api/v1/auth/login  { "email": "<ADMIN_EMAIL>", "password": "<ADMIN_PASSWORD>" }
```

### 6. Rastreabilidade (opcional, ajuda a correção)

Tabela resumida de `docs/06-entrega/checklist-de-entrega.md`: funcionalidade/requisito obrigatório → endpoint e teste →
minuto do vídeo.

---
