# Tech Challenge — Fase 1 · FIAP Pós Tech Software Architecture (SOAT)

**Sistema de Gestão da Oficina (SGO)** — nome provisório (ver enquete E-01 em `docs/00-guia-do-grupo/enquetes.md`).

Back-end **monolítico (MVP)** para uma oficina mecânica de médio porte: ordens de serviço (OS), clientes, veículos,
serviços, peças/insumos com estoque, orçamento com aprovação do cliente e acompanhamento de status — aplicando
**Domain-Driven Design**, **qualidade de software** (testes ≥ 80% nos domínios críticos) e **desenvolvimento seguro**
(JWT nas APIs administrativas, validação de dados sensíveis, análise de vulnerabilidades).

> **Status atual:** decisões fechadas → esqueleto do código. **Todas as 13 ADRs estão aceitas** (Lotes 1–3 de enquetes
> encerrados em 22/09/2026 — índice em `docs/02-adr/README.md`): TypeScript + NestJS + Prisma (ADR-001, E-17), PostgreSQL
> (ADR-002), **camadas clássicas** em módulos por contexto (ADR-003, revotada em 22/09), JWT próprio (ADR-004), Swagger
> code-first (ADR-005), Testcontainers + BDD (ADR-006), scans Semgrep/Trivy/gitleaks/ZAP (ADR-007), GitFlow + Conventional
> Commits (ADR-008), UUID v4 (ADR-009), status *Cancelada* (ADR-010), token de acompanhamento + login de cliente (ADR-011),
> reserva de estoque na aprovação e baixa na finalização (ADR-012), código em inglês com glossário (ADR-013).
> A Fase 1 exige monólito; as fases seguintes do curso (Kubernetes/EKS, API Gateway, serverless, microsserviços com SAGA)
> vão **refatorar este mesmo projeto**, então as decisões daqui já consideram essa evolução (`docs/04-arquitetura/evolucao-fases.md`).

## Grupo

| Integrante | RM | Discord | Frente (E-02 aprovada; redistribuída em 16/09 — ver `docs/00-guia-do-grupo/frentes-e-responsabilidades.md`) |
|---|---|---|---|
| Victor Hugo Carvalho Dos Reis Santos (Vi) | RM377398 | katomaro | **F1** Arquitetura & Repositório (Tech Lead & Arquiteta) + **F5** Infra (Docker, compose, CI, README, Swagger); apoio em segurança (F4) |
| Shirley Balbino | `preencher` | shirleybalbino | **F2** DDD & Documentação + Produto (Product & DDD Lead) — PRDs, event storming/Miro, BDD (Gherkin), checklist, roteiro e edição do vídeo, PDF |
| Diego Marques | RM369305 | dmosantos | **F3** Domínio & API — core `service-orders`; co-revisão de arquitetura (F1) e testes do core (F4) |
| Hermando Thiago | RM378259 | hermandothiago | **F3** módulos `customers` e `catalog` + **F4** Qualidade & Segurança — testes, cobertura, BDD automatizado, scans e relatório; métrica de tempo médio |

Daniel Henrique (RM377497) deixou o curso em 16/09/2026; a redistribuição está registrada em `docs/02-adr/decisoes-leves.md`.

Nome do grupo: **a definir (enquete E-01)**. Acesso obrigatório ao usuário GitHub `soat-architecture` (repositório privado).

## Mapa da documentação

| Pasta | O que tem | Quando usar |
|---|---|---|
| `docs/00-guia-do-grupo/` | Como trabalhamos (assíncrono, GitFlow), frentes e responsabilidades, cronograma, **enquetes e seus resultados** | Todo dia |
| `docs/01-requisitos/` | PRDs (requisitos de produto por módulo, com regras de negócio e critérios de aceite) | Antes de codar uma feature |
| `docs/02-adr/` | ADRs — decisões de arquitetura, **todas aceitas** (opções e enquetes ficam como registro); decisões leves | Ao codar; ao revisar PR |
| `docs/03-ddd/` | Linguagem ubíqua, domain storytelling, event storming, contextos delimitados, agregados | Documentação DDD (Miro) e vídeo |
| `docs/04-arquitetura/` | Visão geral (C4), camadas do monólito, modelo de dados, contrato da API, fluxos, evolução para as próximas fases | Codar e gravar o vídeo |
| `docs/05-qualidade-e-seguranca/` | Estratégia de testes, checklist OWASP, plano da análise de vulnerabilidades | Frente de qualidade/segurança |
| `docs/06-entrega/` | Checklist de entrega (rastreabilidade enunciado → evidência), roteiro do vídeo (15 min), templates do PDF e do relatório | Últimas 2 semanas |
| `prompts/` | Prompts prontos para sessões de IA por frente (referência, não obrigatório) | Ao abrir uma sessão |
| `CLAUDE.md` | Regras que o Claude segue neste repositório (fonte da verdade, arquitetura, segurança, testes, Git); lido pelo CLI e pelas actions | Ao usar IA; ao revisar PR |
| `CONTRIBUTING.md` | Resumo das regras de contribuição (branch, commits, PR, Definition of Done, decisões) | Antes do primeiro PR |
| `.github/` | Templates de issue/PR e workflows do Claude (`@claude` e revisão automática de PR) — guia *Claude no GitHub* em `docs/README.md` | Ao abrir issue/PR; setup do repo |

Comece por: `docs/00-guia-do-grupo/como-trabalhamos.md` → `docs/02-adr/README.md` → `docs/03-ddd/linguagem-ubiqua.md`
(tradução oficial de cada termo para o código) → `docs/04-arquitetura/estrutura-do-repositorio.md`.

## Como executar

> Alvo (esqueleto em construção — `prompts/02-esqueleto-do-projeto.md`): `docker compose up` sobe API (NestJS) + PostgreSQL +
> migrações do Prisma + seed em um comando. Esta seção vira o passo a passo real assim que o esqueleto for mesclado.

```bash
cp .env.example .env
docker compose up --build
# API:      http://localhost:8080/api/v1
# Swagger:  http://localhost:8080/docs   (documento OpenAPI: /docs/openapi.json)
# Health:   http://localhost:8080/health
# Login:    POST /api/v1/auth/login  { "email": "<ADMIN_EMAIL>", "password": "<ADMIN_PASSWORD>" }

# desenvolvimento local (só o banco no Docker)
docker compose up -d postgres
npm ci && npx prisma migrate dev && npm run start:dev
npm test            # unitários
npm run test:e2e    # integração (Testcontainers) + BDD (Cucumber-js)
npm run test:cov    # cobertura com gate (≥ 80 % em service-orders e catalog)
```

**Banco de dados — justificativa (ADR-002):** o domínio é relacional e transacional (aprovar o orçamento muda o status da
OS e reserva o estoque na mesma transação; finalizar baixa as peças reservadas), `NUMERIC` evita erro de arredondamento
em dinheiro, constraints garantem invariantes (estoque ≥ 0, reservado ≤ estoque, documento único) e o tempo médio de
execução é SQL simples. PostgreSQL é gratuito, roda em um contêiner no compose, tem Testcontainers para testes de
integração e caminho direto para RDS/Aurora nas próximas fases.

## Entregáveis da Fase 1 (resumo do enunciado)

1. **Vídeo de até 15 min** demonstrando todos os pontos (roteiro em `docs/06-entrega/roteiro-do-video.md`).
2. **Documentação DDD** (Miro ou equivalente): event storming completo dos fluxos *criação e acompanhamento da OS* e
   *gestão de peças e insumos*; diagramas da disciplina de DDD; linguagem ubíqua aplicada.
3. **Código-fonte** em repositório privado (acesso a `soat-architecture`): APIs conforme requisitos, `Dockerfile`,
   `docker-compose.yml`, `README.md` completo.
4. **Relatório com análise de vulnerabilidades** (scan realizado no código).
5. **Documento de entrega (PDF)**: nome do grupo, participantes e usernames do Discord, link da documentação, link do
   repositório, relatório de vulnerabilidades.

Requisitos obrigatórios completos e rastreados: `docs/06-entrega/checklist-de-entrega.md`.
