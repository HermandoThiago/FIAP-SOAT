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
| Linguagem e principais tecnologias | TypeScript 6 + NestJS 12 (Node 22 no Docker e no CI) · Prisma 7 · PostgreSQL 16 · JWT (HS256) + Argon2id · Jest e Testcontainers · Swagger (`@nestjs/swagger`) · Docker + docker compose · GitHub Actions (build, lint, testes, hadolint, gitleaks, `pnpm audit`). *Conferir `package.json` e o CI no commit da entrega; incluir Semgrep, Trivy ou ZAP somente se forem de fato executados.* |

| Nome completo | RM | Username no Discord |
|---|---|---|
| Shirley Balbino | RM378258 | shirleybalbino |
| Diego Marques | RM369305 | dmosantos |
| Hermando Thiago | RM378259 | hermandothiago |

### 2. Repositório do projeto

| Item | Valor |
|---|---|
| Repositório (**público** durante a correção e a revisão de notas) | `<https://github.com/…/FIAP-SOAT>` |
| Branch da entrega | `master` |
| Tag e **hash do commit** da entrega | `v1.0.0` · `<hash completo>` |
| README (objetivo, solução, arquitetura, tecnologias, pré-requisitos, execução, testes, Swagger, banco, credenciais, diretórios, links) | `<link para o README.md nesse commit>` |
| Documentação da API (Swagger/OpenAPI) | `http://localhost:3001/docs` (JSON em `/docs-json`) após `docker compose up` (instruções no README) |
| Relatório da análise de vulnerabilidades | `<link para docs/06-entrega/relatorio-de-vulnerabilidades.md nesse commit>` |
| Evidência de cobertura ≥ 80 % nos domínios críticos | `<link para docs/06-entrega/evidencias/cobertura.md>` |

### 3. Vídeo da entrega

| Item | Valor |
|---|---|
| YouTube (**público**, ≤ 15 min, mesmo commit informado acima) | `<link>` |

### 4. Documentação DDD

| Item | Valor |
|---|---|
| Documentação DDD (pasta pública no Drive, **sem solicitação de permissão**) | <https://drive.google.com/drive/folders/1-5cyDTGdb8r-q7zIxAUV7Ahn6Kfzl2W4?usp=sharing> |
| Exportação no repositório | `docs/ddd/event-storming.pdf` · `docs/ddd/diagramas.pdf` · `docs/ddd/linguagem-ubiqua.md` |

### 5. Como executar (resumo — detalhes no README)

```bash
git clone <repositório> && cd FIAP-SOAT
cp .env.example .env
docker compose up --build
# Swagger: http://localhost:3001/docs
# Login:   POST /auth/login  { "email": "admin@oficina.local", "senha": "<SEED_PASSWORD do .env>" }
```

### 6. Rastreabilidade (opcional, ajuda a correção)

Tabela resumida de `docs/06-entrega/checklist-de-entrega.md`: funcionalidade/requisito obrigatório → endpoint e teste →
minuto do vídeo.

---
