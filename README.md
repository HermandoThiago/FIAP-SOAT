# Tech Challenge — Fase 1 · FIAP Pós Tech Software Architecture (SOAT) · Grupo 49

**Sistema de Gestão da Oficina (SGO)** — nome do sistema provisório (enquete E-01); o enunciado pede o **número do grupo: 49**.

> Estrutura no formato mínimo exigido pelo enunciado da FIAP (versão de 23/09/2026 — não versionado; requisitos transcritos
> em `docs/06-entrega/checklist-de-entrega.md`).
> Itens marcados `<a preencher>` fecham na entrega (marcos M6/M7). Status do planejamento: **todas as 13 ADRs aceitas**
> (`docs/02-adr/README.md`); esqueleto do código em construção (`prompts/02-esqueleto-do-projeto.md`).

## 1. Objetivo do projeto

Desenvolver a primeira versão (MVP) do **back-end monolítico** de uma oficina mecânica de médio porte, com foco em gestão
de ordens de serviço (OS), clientes, veículos, serviços, peças/insumos com estoque, orçamento com aprovação do cliente e
acompanhamento de status — aplicando **Domain-Driven Design**, **qualidade de software** (testes ≥ 80 % nos domínios
críticos) e **desenvolvimento seguro** (JWT nas APIs administrativas, validação de dados sensíveis, análise de
vulnerabilidades). Requisitos rastreados em `docs/06-entrega/checklist-de-entrega.md`.

## 2. Descrição resumida da solução

O atendente identifica o cliente por CPF/CNPJ e o veículo pela placa e abre a OS (*Recebida*). O mecânico inicia o
diagnóstico, inclui serviços e peças (só com estoque disponível) e o **orçamento é calculado automaticamente**. Ao enviar o
orçamento, o sistema gera um **token de acompanhamento** e "notifica" o cliente (simulado); o cliente consulta a OS e
**aprova ou recusa** pela API (`/tracking`), com o token ou com o próprio login. A aprovação inicia a execução e **reserva**
as peças; a finalização **baixa** o estoque; a entrega encerra a OS. Os seis status do enunciado mudam só por comandos de
negócio (+ *Cancelada* para recusa/desistência), com histórico auditável e métrica de tempo médio de execução.

## 3. Arquitetura utilizada

Monólito **modular por contexto delimitado** (`customers`, `catalog`, `service-orders`, `identity`, `shared`) com
**camadas clássicas** em cada módulo — `controllers/` + `dto/` → `services/` → `repositories/` — sobre um **domínio rico**
(agregados, value objects, eventos) sem dependência de framework. Um schema PostgreSQL por módulo; módulos se comunicam só
pelos serviços exportados. Diagramas C4 em `docs/04-arquitetura/visao-geral.md`; camadas e árvore em
`docs/04-arquitetura/estrutura-do-repositorio.md`; decisões (ADR-001…013) em `docs/02-adr/`; evolução para as próximas
fases (Kubernetes, API Gateway, microsserviços) em `docs/04-arquitetura/evolucao-fases.md`.

## 4. Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Linguagem / runtime | TypeScript 5 · Node 22 LTS |
| Framework | NestJS 11 (`class-validator`, `@nestjs/swagger`, `@nestjs/jwt`) |
| Banco / ORM | PostgreSQL 16 · Prisma (Prisma Migrate, `multiSchema`) |
| Segurança | JWT HS256 + bcrypt · validação de CPF/CNPJ e placa em value objects · Semgrep, `npm audit`/Trivy, gitleaks, OWASP ZAP |
| Testes | Jest · supertest · Testcontainers (PostgreSQL real) · Cucumber-js (BDD em português) · cobertura com gate ≥ 80 % |
| Execução / CI | Docker + docker compose · GitHub Actions (CI, segurança, revisão automática de PR) |

## 5. Pré-requisitos

- Docker e Docker Compose v2 (`docker compose version`) — também usados pelos testes de integração (Testcontainers).
- Para desenvolvimento local fora do contêiner: Node 22 LTS (≥ 22.12) e npm 10; Git.

## 6. Instruções para execução

```bash
git clone <repositório> && cd FIAP-SOAT
cp .env.example .env           # valores de exemplo, todos fictícios (nunca versione o .env)
docker compose up --build      # PostgreSQL 16 → prisma migrate deploy + seed (APP_ENV=dev) → API
# API:      http://localhost:8080/api/v1
# Health:   http://localhost:8080/health  ·  Readiness (checa o banco): http://localhost:8080/ready
# Swagger:  http://localhost:8080/docs   (APP_ENV=dev)
```

Desenvolvimento local (só o banco no Docker):

```bash
docker compose up -d postgres
npm ci
npm run prisma:migrate          # prisma migrate dev: aplica as migrações e gera o cliente em src/generated/prisma
npm run prisma:seed             # dados de demonstração (só com APP_ENV=dev)
npm run start:dev               # http://localhost:8080 com recarga automática
```

Outros scripts: `npm run build` (compila para `dist/`), `npm run lint` (ESLint + Prettier), `npm run depcruise`
(regras de dependência entre camadas — `docs/04-arquitetura/estrutura-do-repositorio.md` §4), `npm run openapi:export`
(gera `reports/openapi.json` sem subir o servidor — artefato do CI, ADR-005), `npm run prisma:generate`.

## 7. Instruções para execução dos testes

```bash
npm test                 # unitários (domínio, value objects e services com fakes — sem banco, sem HTTP)
npm run test:integration # integração: sobe um PostgreSQL 16 real (Testcontainers), aplica as migrações e usa supertest
npm run test:bdd         # BDD: cenários Gherkin em português (Cucumber-js) contra a API real
npm run test:e2e         # integração + BDD
npm run test:cov         # unitários + integração com cobertura e gate ≥ 80 % (linhas e branches) por pasta em
                         # src/modules/{service-orders,catalog}/{domain,services} (jest.config.ts)
```

Sem Docker (ou para reaproveitar um PostgreSQL 16 já em execução), aponte `TEST_DATABASE_URL` para um banco **vazio**
que os testes possam zerar: `TEST_DATABASE_URL=postgresql://oficina:oficina@localhost:5432/oficina_test npm run test:e2e`.

Evidência de cobertura versionada em `docs/06-entrega/evidencias/cobertura.md` `<a preencher em M4>`.

## 8. Acesso ao Swagger / documentação da API

- Swagger UI: `http://localhost:8080/docs` · documento OpenAPI: `http://localhost:8080/docs/openapi.json` (ambos com `APP_ENV=dev`).
- Gerado a partir do código (code-first, ADR-005); contrato combinado antes de codar em `docs/04-arquitetura/contrato-api.md`.

## 9. Decisão e justificativa do banco de dados

**PostgreSQL 16** (ADR-002): o domínio é relacional e transacional (aprovar o orçamento muda o status da OS e reserva o
estoque na mesma transação; finalizar baixa as peças reservadas), `NUMERIC` evita erro de arredondamento em dinheiro,
constraints garantem invariantes (estoque ≥ 0, reservado ≤ estoque, documento único) e o tempo médio de execução é SQL
simples. É gratuito, roda em um contêiner no compose, tem Testcontainers para testes de integração e caminho direto para
RDS/Aurora nas próximas fases.

## 10. Usuários e credenciais de demonstração

- Na subida, a API garante o usuário `MANAGER` de `ADMIN_EMAIL`/`ADMIN_PASSWORD` (RF-062). O seed de demonstração
  (`npm run prisma:seed`, só em `APP_ENV=dev`) acrescenta `mechanic@oficina.local`, `attendant@oficina.local` e o cliente
  com login `customer@oficina.local` (papel `CUSTOMER`), todos com a senha `SEED_PASSWORD` — valores do `.env.example`,
  nenhum dado real.
- Autenticação: `POST /api/v1/auth/login { "email", "password" }` → `accessToken`; no Swagger, colar em **Authorize**.
- Acesso do cliente: token de acompanhamento gerado em `POST /service-orders/{id}/quote/send` (em dev aparece no log e na
  resposta) **ou** login com papel `CUSTOMER` — rotas `/api/v1/tracking/**`.

## 11. Estrutura dos principais diretórios

```text
src/main.ts · src/app.module.ts · src/app.setup.ts   bootstrap, módulo raiz e configuração comum (prefixo /api/v1, Swagger em dev)
src/modules/<contexto>/     controllers/ · dto/ · services/ · repositories/ · domain/ · <contexto>.module.ts
src/shared/                 domain/ (value objects, erros, eventos) · auth/ (guards JWT, @Roles, @Public) · http/ (Problem
                            Details, logs com máscara de PII, /health e /ready) · prisma/ · events/ · config/ · clock e ids
src/generated/prisma/       cliente do Prisma gerado por `prisma generate` (não versionado)
prisma/                     schema.prisma (um schema PostgreSQL por módulo), migrations/ (SQL versionado), seed.ts, README.md
test/                       unit/ · integration/ (Testcontainers + supertest) · bdd/ (features em português) · support/
scripts/                    export-openapi.ts (artefato openapi.json do CI)
docs/                       guia do grupo, PRDs, ADRs, ddd/ (entrega DDD), arquitetura, qualidade e segurança, entrega
prompts/ · .github/         prompts de IA por frente · templates de issue/PR e workflows (ci.yml, security.yml, claude*.yml)
```

Detalhes: `docs/04-arquitetura/estrutura-do-repositorio.md`.

## 12. Documentação DDD

- Miro (acessível sem pedir permissão): `<link a preencher>`
- Exportação no repositório (estrutura pedida pelo enunciado): `docs/ddd/event-storming.pdf`, `docs/ddd/diagramas.pdf`,
  `docs/ddd/linguagem-ubiqua.md` — versões Mermaid em `docs/ddd/*.md` (`docs/ddd/README.md` explica o mapeamento).

## 13. Vídeo da entrega

- YouTube (público, ≤ 15 min): `<link a preencher>` · roteiro: `docs/06-entrega/roteiro-do-video.md`.
- Versão entregue: branch `master`, tag `v1.0.0`, commit `<hash a preencher>` (mesmo commit informado no PDF).

## Grupo 49

| Integrante | RM | Discord | Frente (E-02 aprovada; redistribuída em 16/09 e 22/09 — ver `docs/00-guia-do-grupo/frentes-e-responsabilidades.md`) |
|---|---|---|---|
| Shirley Balbino | `preencher` | shirleybalbino | **F2** DDD & Documentação + Produto (Product & DDD Lead) — PRDs, event storming/Miro (com apoio dos dois), BDD (Gherkin), checklist, facilitação do assíncrono; **F5** entrega — roteiro e edição do vídeo, PDF |
| Diego Marques | RM369305 | dmosantos | **F3** Domínio & API — core `service-orders` + **modelagem do banco de dados** (modelo, Prisma, migrações, seed, justificativa da ADR-002); co-revisão de arquitetura (F1), testes do core e revisão de segurança (F4) |
| Hermando Thiago | RM378259 | hermandothiago | **F1** Arquitetura & Repositório — **estrutura do código** (esqueleto, camadas, CI/compose) **+ ADRs**, revisão de PRs; **F3** módulos `customers` e `catalog`; **F4** Qualidade & Segurança — testes, cobertura, BDD automatizado, scans e relatório; métrica de tempo médio |

Daniel Henrique (RM377497) deixou o curso em 16/09/2026 e Victor Hugo Carvalho Dos Reis Santos (Vi, RM377398) em 22/09/2026;
as redistribuições estão registradas em `docs/02-adr/decisoes-leves.md` e as pendências de transição em
`docs/00-guia-do-grupo/frentes-e-responsabilidades.md` §7.

## Mapa da documentação

| Pasta | O que tem | Quando usar |
|---|---|---|
| `docs/00-guia-do-grupo/` | Como trabalhamos (assíncrono, GitFlow), frentes e responsabilidades, cronograma, enquetes e resultados (o enunciado da FIAP não é versionado; requisitos transcritos no checklist de entrega) | Todo dia |
| `docs/01-requisitos/` | PRDs (requisitos de produto por módulo, com regras de negócio e critérios de aceite) | Antes de codar uma feature |
| `docs/02-adr/` | ADRs — decisões de arquitetura, **todas aceitas** (opções e enquetes ficam como registro); decisões leves | Ao codar; ao revisar PR |
| `docs/ddd/` | **Pasta de entrega DDD** do enunciado: glossário (linguagem ubíqua), event storming, agregados, contextos, domain storytelling; PDFs exportados do Miro em M5 | Documentação DDD (Miro) e vídeo |
| `docs/04-arquitetura/` | Visão geral (C4), camadas do monólito, modelo de dados, contrato da API, fluxos, evolução para as próximas fases | Codar e gravar o vídeo |
| `docs/05-qualidade-e-seguranca/` | Estratégia de testes, checklist OWASP, plano da análise de vulnerabilidades | Frente de qualidade/segurança |
| `docs/06-entrega/` | Checklist de entrega (enunciado → evidência → vídeo), roteiro do vídeo (15 min), template do PDF único e do relatório | Últimas 2 semanas |
| `prompts/` | Prompts prontos para sessões de IA por frente (referência, não obrigatório) | Ao abrir uma sessão |
| `CLAUDE.md` | Regras que o Claude segue neste repositório (fonte da verdade, arquitetura, segurança, testes, Git); lido pelo CLI e pelas actions | Ao usar IA; ao revisar PR |
| `CONTRIBUTING.md` | Resumo das regras de contribuição (branch, commits, PR, Definition of Done, decisões) | Antes do primeiro PR |
| `.github/` | Templates de issue/PR e workflows do Claude (`@claude` e revisão automática de PR) — guia *Claude no GitHub* em `docs/README.md` | Ao abrir issue/PR; setup do repo |

Comece por: `docs/00-guia-do-grupo/como-trabalhamos.md` → `docs/02-adr/README.md` → `docs/ddd/linguagem-ubiqua.md`
(tradução oficial de cada termo para o código) → `docs/04-arquitetura/estrutura-do-repositorio.md`.

## Entrega (resumo do enunciado atualizado)

1. **Um único PDF** (template em `docs/06-entrega/documento-de-entrega-template.md`): primeira página com curso, fase,
   grupo 49, nome/RM/Discord de todos, linguagem e tecnologias; links; **branch e hash do commit** da entrega.
2. **Repositório público** no GitHub durante a correção e a revisão de notas, só com arquivos necessários e sem segredos,
   com README completo, testes ≥ 80 %, Swagger e o relatório da análise de vulnerabilidades.
3. **Vídeo público no YouTube** (≤ 15 min) demonstrando os 15 itens do enunciado no commit entregue.
4. **Documentação DDD** no Miro (acessível sem pedir permissão) e exportada em `docs/ddd/`.
5. Funcionalidades e requisitos técnicos obrigatórios rastreados em `docs/06-entrega/checklist-de-entrega.md`.
