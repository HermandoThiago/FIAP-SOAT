# Tech Challenge — Fase 1 · FIAP Pós Tech Software Architecture (SOAT) · Grupo 49

**Sistema de Gestão da Oficina (SGO)** — back-end monolítico de uma oficina mecânica (API REST em NestJS + PostgreSQL).

> Enunciado da FIAP (versão de 23/09/2026) — não versionado; requisitos transcritos em
> `docs/06-entrega/checklist-de-entrega.md`. Itens marcados `<a preencher>` fecham na entrega.
> Status das decisões: todas as 13 ADRs aceitas (`docs/02-adr/README.md`).

> **Quem vai testar ou gravar o vídeo:** siga o [`GUIA-DE-USO-E-TESTES.md`](GUIA-DE-USO-E-TESTES.md) — como subir, todas as
> rotas, roteiro de teste passo a passo (com os resultados esperados) e como rodar os testes automatizados.

## 1. Objetivo do projeto

Desenvolver a primeira versão (MVP) do **back-end monolítico** de uma oficina mecânica de médio porte, com foco em gestão
de ordens de serviço (OS), clientes, veículos, serviços, peças/insumos com estoque, orçamento com aprovação do cliente e
acompanhamento de status — aplicando **Domain-Driven Design**, **qualidade de software** (testes ≥ 80 % nos domínios
críticos) e **desenvolvimento seguro** (JWT nas APIs administrativas, validação de dados sensíveis, análise de
vulnerabilidades). Requisitos rastreados em `docs/06-entrega/checklist-de-entrega.md`.

## 2. Descrição resumida da solução

O atendente cadastra o cliente (CPF/CNPJ) e o veículo (placa) e abre a OS (*Recebida*) informando o cliente pelo id ou pelo
CPF/CNPJ. O mecânico inicia o diagnóstico e
inclui **serviços** do catálogo e **peças/insumos** do estoque (só com quantidade disponível); o **orçamento é derivado dos
itens e recalculado a cada mudança**, com o preço congelado no momento da inclusão. Ao enviar o orçamento, o sistema gera
um **token de acompanhamento** e "notifica" o cliente (simulado em log); o cliente consulta a OS, com dados mascarados, e
**aprova ou recusa** pela API (`/tracking`), com o token ou com o próprio login. A aprovação **reserva** as peças no estoque; depois disso o mecânico executa, a
finalização **baixa** o estoque e o atendente entrega. O status só muda por **comandos de negócio** (nunca por `PATCH status`), cada mudança
gera um histórico auditável, e o gerente consulta o **tempo médio de execução** (geral e por serviço).

Status da OS (9): `RECEBIDA` → `EM_DIAGNOSTICO` → `AGUARDANDO_APROVACAO` → `AGUARDANDO_EXECUCAO` → `EM_EXECUCAO` →
`FINALIZADA` → `ENTREGUE`; terminais alternativos: `ORCAMENTO_RECUSADO` e `CANCELADA`.

## 3. Arquitetura utilizada

Monólito **modular por contexto delimitado**: um único processo NestJS e um único banco PostgreSQL, com os módulos
`customers`, `catalog`, `service-orders` (core), `identity` e `shared`. Dentro de cada módulo, camadas clássicas:

```text
controllers/ + dtos/   HTTP: rotas, validação sintática (class-validator), papéis (JWT) e OpenAPI
        ↓
services/              serviços de aplicação: orquestram o caso de uso e as transações (prisma.$transaction)
        ↓
domain/                regras puras em TypeScript: política de transição de status, orçamento, validadores de
                       CPF/CNPJ e placa, tempo de execução, entidades (sem dependência de framework)
```

- Módulos só conversam pelos **serviços exportados** (`CustomersService`, `VehiclesService`, `CatalogService`,
  `ItemService`, `UsersService`…) — nunca pelo banco um do outro.
- O acesso ao banco é feito nos serviços, pelo `DatabaseService` (Prisma Client); o MVP **não tem camada separada de
  repositórios**.
- **Transações:** a transição de status, o histórico e os efeitos da transição acontecem na mesma transação; a mudança é
  um `UPDATE` condicional pelo status esperado, então de duas requisições concorrentes só uma vence (a outra recebe 409).
- Diagramas C4 em `docs/04-arquitetura/visao-geral.md`; árvore e regras de dependência em
  `docs/04-arquitetura/estrutura-do-repositorio.md`; decisões (ADR-001…013) em `docs/02-adr/`; divergências assumidas em
  `docs/02-adr/decisoes-leves.md`.

## 4. Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Linguagem / runtime | TypeScript · Node 22 LTS |
| Framework | NestJS 12 (`class-validator`, `@nestjs/swagger`, `@nestjs/jwt`) |
| Banco / ORM | PostgreSQL 16 · Prisma 7 (Prisma Migrate, adapter `pg`) |
| Segurança | JWT HS256 · senhas com Argon2id · validação de CPF/CNPJ e placa · `helmet` · gitleaks, `pnpm audit` e hadolint no CI |
| Testes | Jest · supertest · Testcontainers (PostgreSQL real) · cobertura com gate ≥ 80 % |
| Execução / CI | Docker + docker compose · GitHub Actions (`ci.yml`) · pnpm |

## 5. Pré-requisitos

- **Para rodar a aplicação:** Docker e Docker Compose v2 (`docker compose version`). Nada mais.
- **Para desenvolver e testar fora do contêiner:** Node 22+, pnpm 10 (`corepack enable`), Git e Docker (os testes de
  integração usam Testcontainers).

## 6. Instruções para execução

### Tudo em contêineres (recomendado)

```bash
git clone <repositório> && cd FIAP-SOAT
cp .env.example .env            # valores de exemplo, todos fictícios
docker compose up --build       # PostgreSQL + migrações do Prisma + seed + API
```

O compose sobe, em ordem: `database` (PostgreSQL 16, com healthcheck) → `migrate` (aplica as migrações e o seed
idempotente e termina) → `api` (só inicia depois do `migrate` terminar com sucesso).

- API: `http://localhost:3001` · Swagger: `http://localhost:3001/docs`
- Porta ocupada? Ajuste `API_PORT` / `POSTGRES_PORT` no `.env`.
- Zerar o ambiente (apaga o banco): `docker compose down -v`.

### Desenvolvimento local (só o banco no Docker)

```bash
cp .env.example .env
docker compose up -d database
pnpm install                    # o postinstall gera o client do Prisma
pnpm prisma:deploy              # aplica as migrações
pnpm db:seed                    # dados de demonstração (idempotente)
pnpm start:dev                  # http://localhost:3001 com hot reload
```

### Roteiro rápido para ver o fluxo funcionando

```bash
API=http://localhost:3001
login() { curl -s $API/auth/login -H 'content-type: application/json' -d "{\"email\":\"$1\",\"senha\":\"Demo@Oficina2026\"}" | jq -r .accessToken; }
ATT=$(login atendente@oficina.local); MEC=$(login mecanico@oficina.local)

# 1. cliente e veículo (documento e placa fictícios, mas válidos)
CUS=$(curl -s $API/customers -H "authorization: Bearer $ATT" -H 'content-type: application/json' \
  -d '{"usuarioNome":"Maria Teste","usuarioEmail":"maria@example.com","usuarioDocumento":"52998224725","usuarioTipoDocumento":"CPF"}' | jq -r .usuarioId)
VEH=$(curl -s $API/vehicles -H "authorization: Bearer $ATT" -H 'content-type: application/json' \
  -d "{\"usuarioId\":\"$CUS\",\"veiculoPlaca\":\"BRA2E19\",\"veiculoMarca\":\"Fiat\",\"veiculoModelo\":\"Argo\",\"veiculoAnoFabricacao\":2022,\"veiculoCor\":\"Prata\"}" | jq -r .veiculoId)

# 2. abre a OS (o mecânico responsável é o do seed) — veja o Swagger para os ids de serviço e peça
MECID=$(curl -s "$API/users?pageSize=100" -H "authorization: Bearer $ATT" | jq -r '.users[]|select(.usuarioEmail=="mecanico@oficina.local").usuarioId')
OS=$(curl -s $API/service-orders -H "authorization: Bearer $ATT" -H 'content-type: application/json' \
  -d "{\"clientId\":\"$CUS\",\"veiculoId\":\"$VEH\",\"mecanicoId\":\"$MECID\",\"ordemServicoDescricaoProblema\":\"Barulho ao frear\"}" | jq -r .ordemServicoId)
```

A sequência completa (itens, diagnóstico, envio do orçamento, aprovação pelo cliente, execução, finalização, entrega e
métrica) está automatizada em `test/integration/service-order-flow.int-spec.ts` e documentada no Swagger.

## 7. Instruções para execução dos testes

```bash
pnpm test                  # unitários (domínio, services, controllers e DTOs; sem banco)
pnpm run test:cov          # unitários + cobertura, com gate: falha se < 80 %
pnpm run test:integration  # integração: PostgreSQL real via Testcontainers (exige Docker em execução)
```

- **Unitários (562):** regras de domínio, máquina de estados (todas as combinações status × comando), serviços com o
  Prisma simulado, controllers (papéis e delegação) e DTOs (validação).
- **Integração (82):** sobem um PostgreSQL 16 descartável, aplicam as migrações e o seed e exercitam a API inteira: auth e
  papéis, cadastros, fluxo completo da OS (aprovada e recusada), acompanhamento do cliente, detalhamento, métrica, estoque
  (reserva, baixa, rollback e concorrência) e atomicidade das transições. Para usar um banco já existente e vazio (ex.: serviço do CI), defina `INTEGRATION_DATABASE_URL`.
- **Cobertura:** metas em `jest.config.ts` (`coverageThreshold`); resultado versionado em
  `docs/06-entrega/evidencias/cobertura.md` (global: 97 % de linhas e 83 % de branches; `service-orders` e `catalog`
  acima de 80 %).
- **CI:** `.github/workflows/ci.yml` roda título do PR (Conventional Commits), build, lint, unitários com gate, integração,
  imagem Docker + compose, gitleaks e auditoria de dependências.

## 8. Acesso ao Swagger / documentação da API

- **Swagger UI:** `http://localhost:3001/docs` · documento OpenAPI (JSON): `http://localhost:3001/docs-json`.
- Gerado a partir do código (code-first, ADR-005). Execute `POST /auth/login`, clique em **Authorize** e cole somente o
  `accessToken`, **sem** o prefixo `Bearer`. O Swagger envia `Authorization: Bearer <token>` nas rotas protegidas.
- Contrato combinado antes de codar: `docs/04-arquitetura/contrato-api.md` (os identificadores do código estão em
  português nas rotas e nos campos, conforme `docs/02-adr/decisoes-leves.md`).

Principais rotas:

| Área | Rotas |
|---|---|
| Auth | `POST /auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/register` |
| Clientes / veículos | `/customers` (CRUD, `/{id}/vehicles`) · `/vehicles` (CRUD) |
| Catálogo | `/services` (CRUD) · `/itens` (peças e insumos, CRUD) |
| Estoque | `POST /itens/{id}/stock-movements` (ENTRADA, SAIDA, AJUSTE) · `GET /itens/{id}/stock-movements` (histórico) |
| Ordens de serviço | `/service-orders` (CRUD; `GET /{id}` detalha itens, orçamento e marcos; `/{id}/status-history`) · comandos: `/diagnosis`, `/quote/send`, `/start-execution`, `/complete`, `/deliver`, `/cancel` |
| Itens e orçamento | `/service-orders/{id}/items/services` · `/items/parts` · `/quote` |
| Cliente (acompanhamento) | `GET /tracking/service-orders/{id}` · `POST …/quote/approve` · `POST …/quote/reject` |
| Métricas | `GET /metrics/average-execution-time?from=&to=&serviceId=` |

Valores monetários são **inteiros em centavos** (`15000` = R$ 150,00); datas em UTC (ISO-8601); erros: 400 validação,
401/403 autenticação/papel, 404 inexistente, 409 conflito ou transição inválida, 422 regra de negócio.

## 9. Decisão e justificativa do banco de dados

**PostgreSQL 16** (ADR-002): o domínio é relacional e transacional (uma transição de status grava a OS, o histórico e o
orçamento na mesma transação), `NUMERIC` evita erro de arredondamento nas quantidades de estoque, índices únicos
garantem invariantes (documento, e-mail e nome de serviço únicos; uma OS aberta por veículo é checada na aplicação) e o tempo médio de
execução sai do histórico de status com consultas simples. É gratuito, roda em um contêiner no compose, tem Testcontainers
para testes de integração e caminho direto para RDS/Aurora nas próximas fases. O esquema é versionado com Prisma Migrate
(`prisma/migrations`); o modelo está em `prisma/schema.prisma` e em `docs/04-arquitetura/modelo-de-dados.md`.

## 10. Usuários e credenciais de demonstração

Criados pelo seed (`pnpm db:seed`, já executado pelo `docker compose`). A senha de todos vem de `SEED_PASSWORD` no `.env`
(no `.env.example`: `Demo@Oficina2026`) — **valores fictícios, só para demonstração; troque fora do ambiente local**.

| Papel | E-mail | Pode |
|---|---|---|
| Admin (gerente) | `admin@oficina.local` | tudo, inclusive cancelar OS e excluir cadastros |
| Atendente | `atendente@oficina.local` | clientes, veículos, abrir e entregar OS |
| Mecânico | `mecanico@oficina.local` | diagnóstico, itens, orçamento, execução e finalização |
| Cliente | `cliente@oficina.local` | acompanhar as próprias OS em `/tracking` |

- Login: `POST /auth/login { "email", "senha" }` → `accessToken` (15 min) e `refreshToken` (rotativo).
- O seed também cria 4 serviços, 4 itens de estoque e um veículo (`ABC1D23`) do cliente de demonstração.
- Acesso do cliente à OS: o **token de acompanhamento** vem na resposta de `POST /service-orders/{id}/quote/send` (fora de
  produção) **ou** o login do cliente; ambos usam as rotas `/tracking/**`. O token vale para uma única OS; OS de outro
  cliente responde 404 e o JWT da equipe não entra em `/tracking`.

## 11. Estrutura dos principais diretórios

```text
src/modules/<contexto>/     controllers/ · dtos/ · services/ · domain/ · <contexto>.module.ts
src/shared/                 DatabaseService (Prisma Client) e módulo compartilhado
src/scripts/seed.ts         dados de demonstração (idempotente)
prisma/                     schema.prisma e migrations/
test/unit/ · test/services/ testes unitários (controllers, DTOs, domínio e serviços)
test/integration/           testes de integração (Testcontainers) e suporte
docs/                       guia do grupo, PRDs, ADRs, ddd/ (entrega DDD), arquitetura, qualidade e segurança, entrega
Dockerfile · docker-compose.yaml · .github/workflows/ci.yml
```

Detalhes: `docs/04-arquitetura/estrutura-do-repositorio.md`.

## 12. Documentação DDD

- Documentação DDD (pasta pública no Google Drive, sem pedir permissão): <https://drive.google.com/drive/folders/1-5cyDTGdb8r-q7zIxAUV7Ahn6Kfzl2W4?usp=sharing>
- Exportação no repositório (estrutura pedida pelo enunciado): `docs/ddd/event-storming.pdf`, `docs/ddd/diagramas.pdf`,
  `docs/ddd/linguagem-ubiqua.md` — versões Mermaid em `docs/ddd/*.md` (`docs/ddd/README.md` explica o mapeamento).

## 13. Vídeo da entrega

- YouTube (público, ≤ 15 min): `<link a preencher>` · roteiro: `docs/06-entrega/roteiro-do-video.md`.
- Versão entregue: branch `master`, tag `v1.0.0`. O hash completo do commit está no PDF de entrega (um commit não pode conter o próprio hash).

## Controle de estoque

- O saldo de um item (`itemEstoqueQuantidade`, `itemEstoqueReservada`; disponível = quantidade − reservada) **só muda por
  uma movimentação registrada**, na mesma transação do saldo: `PUT /itens/{id}` não altera mais o saldo.
- **Manuais** (`POST /itens/{id}/stock-movements`): `ENTRADA` soma; `SAIDA` tira só do disponível; `AJUSTE` define o novo
  saldo físico (contagem de inventário, motivo obrigatório, nunca abaixo do reservado). O item criado com saldo já gera a
  `ENTRADA` de saldo inicial.
- **Da OS:** incluir peça só confere o disponível. **Aprovar o orçamento reserva** (`RESERVA`) as peças e **finalizar a OS
  baixa** (`SAIDA`) o reservado, cada uma na mesma transação da mudança de status. Sem saldo para qualquer peça → `422` e
  nada muda (nem as reservas já feitas, nem o status, nem a resposta do orçamento). As linhas dos itens são bloqueadas
  (`SELECT … FOR UPDATE`) em ordem fixa, então aprovações concorrentes não vendem a mesma unidade duas vezes.
- Invariantes também no banco (`CHECK`): `quantidade >= 0` e `0 <= reservada <= quantidade`.

## Limitações conhecidas (MVP)

- **Nomes:** os identificadores são mistos: rotas em inglês ou português (`/itens`), schema e DTOs em português. Divergências das ADRs em `docs/02-adr/README.md`.
- **Notificação:** o envio do orçamento é simulado (log); não há e-mail.
- **Operação:** não há `/health` nem `/ready`; o CORS está aberto e o Swagger fica sempre exposto (`docs/05-qualidade-e-seguranca/seguranca.md`).
- **DDD tático:** sem agregados ricos, objetos de valor nem eventos publicados; as regras estão em funções e políticas de `domain/` (`docs/ddd/agregados.md`).

## Grupo 49

| Integrante | RM | Discord | Frente (E-02 aprovada; redistribuída em 16/09 e 22/09 — ver `docs/00-guia-do-grupo/frentes-e-responsabilidades.md`) |
|---|---|---|---|
| Shirley Balbino | RM378258 | shirleybalbino | **F2** DDD & Documentação + Produto (Product & DDD Lead) — PRDs, event storming/Miro (com apoio dos dois), BDD (Gherkin), checklist, facilitação do assíncrono; **F5** entrega — roteiro e edição do vídeo, PDF |
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
4. **Documentação DDD** em pasta pública do Google Drive (sem pedir permissão) e exportada em `docs/ddd/`.
5. Funcionalidades e requisitos técnicos obrigatórios rastreados em `docs/06-entrega/checklist-de-entrega.md`.
