# Roteiro do vídeo (≤ 15 minutos)

Regras: cobrir **todos** os 15 itens do enunciado na ordem; demonstrar ao vivo (Swagger) em vez de ler slides; cada bloco tem responsável e tempo máximo; ensaio cronometrado obrigatório. O vídeo deve ser **público** no YouTube, com áudio compreensível, mostrar o projeto no **commit informado no PDF** e identificar os integrantes.

Demonstrar só o que existe; o que estiver pendente (relatório de vulnerabilidades, BDD, `/health`) não entra como pronto.

## Preparação

- [ ] `cp .env.example .env`, `docker compose down -v && docker compose up --build` em máquina limpa. O serviço `migrate` aplica migrações e seed; a API sobe em `http://localhost:3001`.
- [ ] Usuários do seed (senha em `SEED_PASSWORD`, `.env.example`): `admin@`, `atendente@`, `mecanico@` e `cliente@oficina.local`.
- [ ] Miro (ou os PNGs revisados em `Revisão`) aberto nos frames: legenda, big picture, fluxos 1–3, mapa de contextos, glossário.
- [ ] Swagger em `http://localhost:3001/docs`, autenticado (colar **só o access token** em *Authorize*).
- [ ] Terminal com o relatório de cobertura; relatórios de scan abertos, se existirem.
- [ ] Resolução 1080p, zoom 125 %, fontes grandes.
- [ ] Branch, tag e hash do commit da entrega definidos; dizê-los na abertura.
- [ ] Publicar como **público**; testar o link em janela anônima; conferir o áudio.

## Blocos

| # | Item do enunciado | Tempo | O que mostrar / dizer | Responsável |
|---|---|---|---|---|
| 1 | **Proposta da solução** | 0:00–0:50 | Grupo 49 e integrantes (nome, RM, papel); branch/tag e hash; problema da oficina; MVP: OS, clientes, veículos, catálogo/estoque, orçamento com aprovação, DDD, qualidade e segurança | F2 (Shirley) |
| 2 | **Arquitetura do projeto** | 0:50–1:50 | `docs/04-arquitetura/visao-geral.md`: atores, API monolítica NestJS, PostgreSQL, compose (`database` → `migrate` → `api`); evolução futura apenas como intenção | F1 |
| 3 | **Organização do monólito e camadas** | 1:50–2:50 | Árvore do repo: módulos `customers`, `catalog`, `service-orders`, `identity` e `shared`. Em cada um: `controllers`/`dtos` → `services` → Prisma pelo `DatabaseService`, com regras puras em `domain/`. **Explicar a divergência** da ADR-003: não há camada `repositories/` nem agregados ricos, por decisão registrada em `decisoes-leves.md`. Módulos colaboram por serviços exportados, mas o banco é compartilhado | F1 |
| 4 | **Escolha e justificativa do banco** | 2:50–3:30 | ADR-002: relacional e transacional (aprovação + reserva e finalização + baixa atômicas), `Decimal` para estoque, constraints `CHECK`, Testcontainers. Um banco compartilhado, sem schema por módulo | F3 (Diego — modelagem do banco) |
| 5 | **Event Storming + elementos de DDD** | 3:30–5:30 | Frames dos três fluxos, a gramática ator → comando → agregado → evento → política, hotspots e situação; mapa de contextos (core/supporting/generic); linguagem ubíqua e relação glossário ↔ código. Dizer que os eventos são **fatos conceituais** e que o DDD tático é parcial (sem agregados ricos nem VOs) | F2 |
| 6 | **Criação e acompanhamento da OS** | 5:30–7:00 | Swagger: cadastrar cliente (CPF) e veículo (placa) → `POST /service-orders` (Recebida; por `customerDocument` ou `clientId`) → `GET /tracking/service-orders/{id}` com token de acompanhamento, e também com o login `cliente@` | F3 |
| 7 | **Serviços, peças e insumos** | 7:00–7:50 | `POST …/diagnosis` → incluir serviço → incluir peça (mostrar o saldo antes e depois: **conferido, não reservado**) → peça sem saldo (422) | F3 |
| 8 | **Geração e aprovação do orçamento** | 7:50–9:00 | `GET …/quote` (calculado) → `POST …/quote/send` (token na resposta; notificação só em log) → `POST /tracking/…/quote/approve` → status **Aguardando execução**; mostrar saldo **reservado** em `GET /itens/{id}` e a movimentação `RESERVA` | F3 |
| 9 | **Alteração dos status da OS** | 9:00–10:00 | Diagrama de 9 status; `POST …/start-execution` → `POST …/complete` (saldo baixado, movimentação `SAIDA`) → `POST …/deliver`; `GET …/status-history`; transição inválida (409); recusa → **Orçamento recusado**; cancelamento do Admin antes da aprovação; listagem por status; `GET /metrics/average-execution-time` | F3 |
| 10 | **Autenticação das APIs administrativas** | 10:00–10:50 | Chamar `/customers` sem token (401) → `POST /auth/login` → *Authorize* → 200; papel insuficiente (403); CPF/placa inválidos (422 ou 400, conforme o DTO); Argon2id e segredos por variável de ambiente; refresh com rotação | F4 |
| 11 | **Execução da aplicação** | 10:50–11:40 | `git clone` → `.env.example` → `docker compose up --build` → logs → Swagger em `/docs`; README na tela. Não existe `/health` | F5 |
| 12 | **Documentação Swagger/OpenAPI** | 11:40–12:10 | UI `/docs` e JSON `/docs-json`; esquema Bearer; tags por módulo; code-first (ADR-005) | F5 |
| 13 | **Testes automatizados** | 12:10–13:20 | `test:cov` (567 testes, cobertura global ≈ 97,5 % linhas e ≈ 84 % branches; domínios críticos > 80 %) e `test:integration`; CI; teste parametrizado da máquina de estados. **Sem BDD** (não existe `test/bdd`) | F4 |
| 14 | **Análise de vulnerabilidades** | 13:20–14:30 | `relatorio-de-vulnerabilidades.md`: ferramentas executadas em 02/11/2026 (Semgrep, gitleaks, Trivy, hadolint, `pnpm audit`) e resultado: 0 achados no código e nos segredos; achados abertos na imagem base e em `fast-uri`, com a decisão do grupo. ZAP só se for executado antes da gravação. Citar as limitações conhecidas (CORS aberto, Swagger sempre exposto, notificação simulada) | F4 |
| 15 | Encerramento | 14:30–15:00 | Recap dos entregáveis (Miro, repositório, relatório, PDF) | F2 (Shirley) |

Responsáveis seguem as frentes de `docs/00-guia-do-grupo/frentes-e-responsabilidades.md`; confirmar com o grupo, pois a redistribuição de 22/09 mudou quem cobre cada frente.

## Dicas

- Falar o **nome do requisito** ao demonstrá-lo.
- O vídeo fica no ar (público) durante a correção e a revisão de notas.
- Dados de demo claros e valores redondos; sem CPF, placa ou e-mail reais.
- Se algo falhar ao vivo, cortar na edição.
- Duração-alvo 14:30.
