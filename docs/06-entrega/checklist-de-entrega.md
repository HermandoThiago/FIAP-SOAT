# Checklist de entrega — rastreabilidade enunciado → evidência → vídeo

> Documento **vivo**: atualizar a cada PR que fecha um item. Na última semana, outra pessoa (não o dono) confere cada
> linha do zero. Nota máxima = todas as linhas com evidência verificável. Fonte: enunciado da FIAP, versão de
> 23/09/2026 — **não versionado** (propriedade intelectual da FIAP): este checklist é a transcrição dos requisitos, entregáveis
> e itens do vídeo que vale no repositório. O Tech Challenge vale 90 % da nota da fase.

Legenda: ⬜ não iniciado · 🟡 em andamento · ✅ pronto e verificado por outra pessoa

## 1. Funcionalidades obrigatórias (enunciado §5)

| # | Requisito (enunciado) | Evidência no código | Teste | Swagger | Bloco do vídeo | Dono | Status |
|---|---|---|---|---|---|---|---|
| F1 | Identificação do cliente por CPF/CNPJ | `POST /service-orders` aceita `clientId` **ou** `customerDocument` (CPF/CNPJ válido, com ou sem pontuação; os dois divergentes → 422; sem cliente ativo → 404); `GET /customers?usuarioDocumento=` | unit ✔ · integração ✔ | ✔ | 6 | | 🟡 |
| F2 | Cadastro de veículo (placa, marca, modelo, ano) | `POST /vehicles`; VO `LicensePlate` | unit ✔ · integração ✔ | ✔ | 6 | | ⬜ |
| F3 | Inclusão dos serviços solicitados | `POST /service-orders/{id}/items/services` e `DELETE …/items/services/{osServicoId}` (`ServiceOrderItemsService`; serviço ativo do `CatalogService`; snapshot do preço; só em `RECEBIDA`/`EM_DIAGNOSTICO`; entra no orçamento) | unit ✔ · integração ✔ | ✔ | 7 | | 🟡 |
| F4 | Inclusão de peças e insumos | `POST /service-orders/{id}/items/parts` e `DELETE …/items/parts/{osItemId}` (`ServiceOrderItemsService`; snapshot do preço; só em `RECEBIDA`/`EM_DIAGNOSTICO`; 422 sem estoque disponível, sem reservar) | unit ✔ · integração ✔ | ✔ | 7 | | 🟡 |
| F5 | Geração automática do orçamento | orçamento derivado dos itens e recalculado a cada inclusão/remoção (`domain/quote.ts`, `GET /service-orders/{id}/quote`); serviços e peças somam no total | unit ✔ | ✔ | 8 | | 🟡 |
| F6 | Envio ou disponibilização do orçamento para aprovação | `POST …/quote/send` pronto (exige ≥ 1 item; `EM_DIAGNOSTICO` → `AGUARDANDO_APROVACAO`; orçamento `ENVIADO`). Gera o token de acompanhamento (`TrackingTokenService`, `aud=tracking`, 7 dias) e devolve `tracking: { url, token (só fora de produção) }`; notificador por log | unit ✔ · integração ✔ | ✔ | 8 | | 🟡 |
| F7 | **Registro da aprovação ou rejeição do orçamento** | `POST /tracking/service-orders/{id}/quote/approve` (→ `AGUARDANDO_EXECUCAO`) · `…/quote/reject` (→ `ORCAMENTO_RECUSADO`, ADR-010); grava `orcamentoStatus`, `respondidoEm/Por`, motivo e histórico. A aprovação **reserva o estoque** na mesma transação (sem saldo → 422 e nada muda) | unit ✔ · integração ✔ | ✔ | 8 | | ⬜ |
| F8 | 6 status da OS | enum `StatusOrdemServico` no Prisma (**9 valores**: os 6 do enunciado + `AGUARDANDO_EXECUCAO`, `ORCAMENTO_RECUSADO` e `CANCELADA` — divergência da ADR-010 registrada em `decisoes-leves.md`) + `StatusTransitionPolicy` (`service-orders/domain/policies`) | unit parametrizado ✔ (`status-transition.policy.spec.ts`, status × comando) | — | 9 | | 🟡 |
| F9 | Controlar as alterações de status e aplicar as regras de transição (automáticas conforme ações) | `ServiceOrdersService.applyCommand` (política + update condicional + histórico na mesma transação; 409 em transição inválida). Rotas prontas: `diagnosis`, `start-execution`, `complete`, `deliver`, `cancel`. `quote/send` e aprovar/recusar (`/tracking`) prontos; **efeitos de estoque:** a aprovação reserva e a finalização baixa, na mesma transação do status | unit ✔ · integração ✔ | ✔ | 9 | | 🟡 |
| F10 | Consulta do cliente via API | `GET /tracking/service-orders/{id}` (token de acompanhamento ou login `CUSTOMER` — ADR-011; placa e documento mascarados; OS alheia → 404; JWT de equipe → 403) | unit ✔ · integração ✔ | ✔ | 6/8 | | ⬜ |
| F11 | CRUD de clientes | `/customers` (`CustomersService`: usuário com perfil Cliente, sem senha; documento imutável; `DELETE` = exclusão lógica, 409 com OS em aberto; `GET /customers/{id}/vehicles`) | unit ✔ · integração ✔ | ✔ | 6 | | 🟡 |
| F12 | CRUD de veículos | `/vehicles` | unit ✔ · integração ✔ | ✔ | 6 | | 🟡 |
| F13 | CRUD de serviços | `/services` (`CatalogService`; exclusão lógica; nome único) | unit ✔ · integração ✔ | ✔ | 7 | | 🟡 |
| F14 | CRUD de peças e insumos | `/itens` (`ItemController`/`ItemService`, módulo `catalog`); a divergência com o `/parts` do planejamento está registrada em `decisoes-leves.md` e o contrato já usa `/itens`; movimentações em `/itens/{id}/stock-movements`; o `PUT` não altera mais o saldo | unit ✔ · integração ✔ | ✔ | 7 | | 🟡 |
| F15 | Controle de estoque | `StockService` (catalog) + `domain/stock.ts`: movimentações manuais `ENTRADA`/`SAIDA`/`AJUSTE` (`POST`/`GET /itens/{id}/stock-movements`), **reserva** (`RESERVA`) na aprovação e **baixa** (`SAIDA`) na finalização, saldo inicial como `ENTRADA`; `quantidade`/`reservada`/disponível; `FOR UPDATE` em ordem fixa; `CHECK` no banco (ADR-012, `decisoes-leves.md` 02/11/2026) | unit ✔ · integração ✔ (reserva, baixa, rollback, concorrência) | ✔ | 7/8/9 | | 🟡 |
| F16 | Listagem de OS | `GET /service-orders` (filtros `status`, `clientId`, `veiculoId`, `from`, `to`; paginação `page`/`pageSize`) | unit ✔ · integração ✔ | ✔ | 9 | | 🟡 |
| F17 | Detalhamento de OS | `GET /service-orders/{id}`: OS + `cliente`, `veiculo`, `mecanico`, `orcamento` (itens e serviços, total) e `marcos` (data de cada etapa, do histórico de status); cliente só vê a própria OS (alheia → 404) + `/status-history` | unit ✔ · integração ✔ | ✔ | 9 | | 🟡 |
| F18 | Monitoramento ou cálculo do tempo médio de execução | `GET /metrics/average-execution-time?from=&to=&serviceId=` (`MetricsService`: média de `EM_EXECUCAO` → `FINALIZADA` pelo histórico de status, no período de finalização; geral e `byService`; `estimatedMinutes` do contrato não existe no schema e fica de fora) | unit ✔ · integração ✔ | ✔ | 9 | | 🟡 |

## 2. Requisitos técnicos obrigatórios (enunciado §6)

| # | Requisito | Evidência | Dono | Status |
|---|---|---|---|---|
| T1 | Back-end monolítico | 1 processo de API no compose; `docs/04-arquitetura/visao-geral.md` | | ⬜ |
| T2 | Organização em camadas (clássicas, por módulo — ADR-003) explicada | ADR-003 + árvore do repo + bloco 3 do vídeo | Hermando | ⬜ |
| T3 | Banco de dados de livre escolha, com decisão justificada | ADR-002 + README §9 + bloco 4 | Diego | ⬜ |
| T4 | APIs RESTful + Swagger/OpenAPI | `src/shared/swagger.ts` registra o esquema HTTP Bearer usado por `@ApiBearerAuth()`; `main.ts` aplica a configuração; UI `/docs` e JSON `/docs-json`. Cinco testes de regressão aprovados (`test/unit/swagger.spec.ts`): esquema nas rotas, login público, documentação HTTP pública, 401 sem token/inválido e 200 com JWT. Controllers/guards reais, serviços simulados, sem banco. Build/typecheck e 567 testes sem banco aprovados com Node 24.22.2 (02/11/2026). Em 03/11/2026 o fluxo completo foi validado por HTTP e manualmente no Swagger contra o compose com PostgreSQL (`docs/06-entrega/evidencias/validacao-http-integrada.md`); falta a evidência no vídeo | | 🟡 |
| T5 | Autenticação JWT para APIs administrativas | guard JWT HS256 + `/auth/login`, `/auth/refresh` (rotação de refresh token) e `/auth/logout`; papéis via `RolesGuard`; `DELETE /users/{id}` = exclusão lógica (`usuarioAtivo`), que bloqueia login/refresh e preserva o histórico (ADR-004). Integração 401/403 e rotação do refresh ✔ (`test/integration/auth.int-spec.ts`) | | 🟡 |
| T6 | Validação de CPF ou CNPJ · validação da placa | VOs `Document` e `LicensePlate` + 422 | unit exaustivo | ⬜ |
| T7 | Testes unitários · testes de integração dos fluxos principais | `test/unit` e `test/services` já cobrem auth, users, vehicles, itens e **service-orders** (service, controller e política de status: ≈ 310 testes); `test/integration` (`npm run test:integration`: Testcontainers + PostgreSQL 16, migrações e seed; auth, cadastros, fluxo completo da OS, tracking, métrica e rollback do envio do orçamento) ✔; `ci.yml` roda tudo; falta `test/bdd` — CI verde | | 🟡 |
| T8 | **Evidência** de cobertura mínima de 80 % nos domínios críticos | `docs/06-entrega/evidencias/cobertura.md` (revalidado localmente após correção Swagger em 02/11/2026: 567 testes, global 97,51 % linhas / 83,99 % branches; domínios críticos acima de 80 %, gate aprovado) + `coverage/lcov.info` local. Base `6f62d13` com alterações ainda não commitadas; remedido em 02/11/2026 (567 testes, global 97,51 % linhas / 83,99 % branches) e integração com 82 testes aprovados; repetir/vincular ao hash final | | 🟡 |
| T9 | Instruções para execução local (README completo) | README com os 13 itens do enunciado; outro membro executa só pelo README | Hermando | 🟡 README reescrito com os 13 itens e o roteiro; falta outro membro executar só pelo README |
| T10 | **Tratamento adequado das transações** nos principais fluxos | `$transaction` em aprovar (status + resposta do orçamento + reserva), finalizar (status + baixa), enviar orçamento e criar item com saldo inicial; update condicional por status (corrida → 409). **Testes de integração** (`stock.int-spec.ts`): falta de estoque no meio da aprovação desfaz as reservas já feitas, o status e o orçamento (422); duas aprovações concorrentes disputando as últimas unidades → só uma vence | Diego | 🟡 |
| T11 | Dockerfile para build · docker-compose orquestrando o ambiente completo | `Dockerfile` multi-stage (usuário não-root, healthcheck) + `docker-compose.yaml` (`database` → `migrate` → `api`); validado em 02/11/2026 (build, migrações, seed, login e rota protegida). Trivy na imagem executado em 02/11/2026 (ver `relatorio-de-vulnerabilidades.md`). Pendente: teste em máquina limpa por outro membro | Hermando | 🟡 |
| T12 | Repositório **público** durante a correção e a revisão de notas, só com arquivos necessários, sem credenciais/tokens | visibilidade pública ligada na entrega; gitleaks limpo no histórico | | ⬜ |
| T13 | Versão identificada (branch, tag ou hash) informada no PDF; código do vídeo = código da documentação = commit entregue | tag `v1.0.0` em `master` + hash no PDF | | ⬜ |
| T14 | **Branch principal protegida, tudo via PR** (enunciado, entregáveis §2: "a branch main deve sempre estar protegida e tudo que chegar nela deve vir através de PR") | `master` e `develop` protegidas **sem bypass para ninguém**; todo commit desde 23/09 chega por PR; os commits diretos da fase de planejamento até 23/09 estão registrados como exceção em `docs/02-adr/decisoes-leves.md` | Hermando | ⬜ |

## 3. Entregáveis (enunciado §1–§4)

| # | Entregável | Evidência | Dono | Status |
|---|---|---|---|---|
| E1 | **PDF único** com a primeira página obrigatória (Curso SOAT — Software Architecture; Fase 1; grupo **49**; nome completo, RM e Discord de todos; linguagem e tecnologias) e todos os links | `documento-de-entrega-template.md` preenchido e exportado | F2 | ⬜ |
| E2 | Branch e **hash do commit** da entrega no PDF (a avaliação considera só essa versão) | tag `v1.0.0` em `master` + hash | F1 | ⬜ |
| E3 | README completo no repositório (objetivo, solução, arquitetura, tecnologias, pré-requisitos, execução, testes, Swagger, banco, credenciais de demonstração, diretórios, links DDD e vídeo) | `README.md` no commit da entrega | F5 infra | 🟡 faltam links do Miro/vídeo e o hash |
| E4 | Vídeo ≤ 15 min, **público no YouTube**, áudio compreensível, mostrando o commit da entrega, a documentação, as decisões e os integrantes | link + roteiro cumprido (§4) | F5 entrega | ⬜ |
| E5 | Event storming — criação da OS | `docs/ddd/event-storming.md` revisado; versão visual em `docs/ddd/diagramas/` e `docs/ddd/event-storming.pdf` | F2 | 🟡 |
| E6 | Event storming — acompanhamento da OS | `docs/ddd/event-storming.md` revisado; versão visual em `docs/ddd/diagramas/` e `docs/ddd/event-storming.pdf` | F2 | 🟡 |
| E7 | Event storming — gestão de peças e insumos | `docs/ddd/event-storming.md` revisado; versão visual em `docs/ddd/diagramas/` e `docs/ddd/event-storming.pdf` | F2 | 🟡 |
| E8 | Eventos de domínio, comandos, políticas, atores, agregados, entidades, objetos de valor, bounded contexts e diagramas da disciplina (domain storytelling, context map, agregados, máquina de estados) | textos revisados em `docs/ddd/*.md`; diagramas (9 `.drawio` + `.png`, incluindo domain storytelling e agregados/entidades/objetos de valor) em `docs/ddd/diagramas/`, com `diagramas.pdf`; link público no Drive preenchido. DDD tático parcial, declarado | F2 | 🟡 |
| E9 | Linguagem ubíqua + glossário + **relação documentação ↔ código** | `docs/ddd/linguagem-ubiqua.md` revisado em 02/11/2026 (colunas *No código* e *Situação*); falta incorporar a planilha da colega (`.gsheet` não lido) | F2/F3 | 🟡 |
| E10 | Link da documentação DDD **acessível sem pedir permissão** | pasta pública no Drive (<https://drive.google.com/drive/folders/1-5cyDTGdb8r-q7zIxAUV7Ahn6Kfzl2W4?usp=sharing>); acesso anônimo testado em 03/11/2026 (requisição HTTP e aba anônima do navegador) | F2 | ✅ |
| E11 | Relatório ou resultado da análise de vulnerabilidades **no repositório** | `docs/06-entrega/relatorio-de-vulnerabilidades.md` + `evidencias/scan/` (execuções de 02 e 03/11/2026: Semgrep, gitleaks, Trivy, hadolint, `pnpm audit`); V-003 e V-004 corrigidos e scans repetidos; ZAP executado em 03/11/2026 (sem alertas de risco); falta a decisão de aceitar V-001/V-002 (Debian sem correção) | F4 | 🟡 |

## 4. Itens do vídeo (lista literal do enunciado) → bloco do roteiro

| Item do vídeo | Bloco | Responsável | Pronto |
|---|---|---|---|
| A proposta da solução | 1 | | ⬜ |
| A arquitetura do projeto | 2 | | ⬜ |
| A organização do monólito e suas camadas | 3 | | ⬜ |
| A escolha e a justificativa do banco de dados | 4 | | ⬜ |
| O processo de Event Storming | 5 | | ⬜ |
| Os principais elementos de DDD utilizados | 5 | | ⬜ |
| O fluxo de criação e acompanhamento de uma OS | 6 | | ⬜ |
| A inclusão de serviços, peças e insumos | 7 | | ⬜ |
| A geração e aprovação do orçamento | 8 | | ⬜ |
| A alteração dos status da OS | 9 | | ⬜ |
| A autenticação das APIs administrativas | 10 | | ⬜ |
| A execução da aplicação | 11 | | ⬜ |
| A documentação Swagger ou OpenAPI | 12 | | ⬜ |
| Os testes automatizados | 13 | | ⬜ |
| O resultado da análise de vulnerabilidades | 14 | | ⬜ |

Também exigido do vídeo: apresentar a participação ou identificação dos integrantes (bloco 1) e o projeto correspondente
ao commit informado no PDF (dizer branch/tag/hash na abertura).

## 5. Revisão cruzada final (D-2)

- [ ] Clone limpo → `docker compose up` → Swagger → fluxo completo em < 5 min (pessoa ≠ dono da infra — Hermando)
- [ ] Repositório **público**; links do PDF abertos em janela anônima (Miro sem pedido de permissão; YouTube público; README e relatório no commit da entrega)
- [ ] Branch + hash do PDF = tag `v1.0.0` = commit mostrado no vídeo
- [ ] `master` e `develop` protegidas sem bypass; todo commit desde 23/09 chegou por PR (T14)
- [ ] Vídeo assistido inteiro com cronômetro (≤ 15:00), áudio ok, integrantes identificados, checklist §4 marcado
- [ ] README lido do início ao fim contra os 13 itens do enunciado; comandos copiados e executados
- [ ] Relatório de vulnerabilidades com datas, versões e antes × depois; evidência de cobertura ≥ 80 % versionada
- [ ] `docs/ddd/event-storming.pdf` e `diagramas.pdf` correspondem ao Miro e ao código entregue
- [ ] Nenhum segredo, token ou dado real em nenhum arquivo nem no histórico (gitleaks)
