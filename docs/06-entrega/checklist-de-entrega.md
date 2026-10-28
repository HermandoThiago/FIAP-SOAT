# Checklist de entrega — rastreabilidade enunciado → evidência → vídeo

> Documento **vivo**: atualizar a cada PR que fecha um item. Na última semana, outra pessoa (não o dono) confere cada
> linha do zero. Nota máxima = todas as linhas com evidência verificável. Fonte: enunciado da FIAP, versão de
> 23/09/2026 — **não versionado** (propriedade intelectual da FIAP): este checklist é a transcrição dos requisitos, entregáveis
> e itens do vídeo que vale no repositório. O Tech Challenge vale 90 % da nota da fase.

Legenda: ⬜ não iniciado · 🟡 em andamento · ✅ pronto e verificado por outra pessoa

## 1. Funcionalidades obrigatórias (enunciado §5)

| # | Requisito (enunciado) | Evidência no código | Teste | Swagger | Bloco do vídeo | Dono | Status |
|---|---|---|---|---|---|---|---|
| F1 | Identificação do cliente por CPF/CNPJ | `POST /service-orders` aceita `customerDocument`; VO `Document` | unit + integração | ✔ | 6 | | ⬜ |
| F2 | Cadastro de veículo (placa, marca, modelo, ano) | `POST /vehicles`; VO `LicensePlate` | unit + integração | ✔ | 6 | | ⬜ |
| F3 | Inclusão dos serviços solicitados | `POST /service-orders/{id}/items/services` | integração | ✔ | 7 | | ⬜ |
| F4 | Inclusão de peças e insumos | `POST /service-orders/{id}/items/parts` (verifica disponibilidade; 422 sem estoque) | integração | ✔ | 7 | | ⬜ |
| F5 | Geração automática do orçamento | `ServiceOrder.recalculateQuote()` | unit | ✔ | 8 | | ⬜ |
| F6 | Envio ou disponibilização do orçamento para aprovação | `POST …/quote/send` + notificador (log) + token de acompanhamento | integração | ✔ | 8 | | ⬜ |
| F7 | **Registro da aprovação ou rejeição do orçamento** | `POST /tracking/…/quote/approve` (→ `IN_PROGRESS`) · `POST /tracking/…/quote/reject` (→ `CANCELLED`, ADR-010); `quote.status`, `respondedAt`, histórico | integração | ✔ | 8 | | ⬜ |
| F8 | 6 status da OS | enum `ServiceOrderStatus` (6 do enunciado + `CANCELLED`, ADR-010) + `StatusTransitionPolicy` | unit parametrizado | — | 9 | | ⬜ |
| F9 | Controlar as alterações de status e aplicar as regras de transição (automáticas conforme ações) | transições dentro dos comandos; 409 em transição inválida; histórico | unit + integração | ✔ | 9 | | ⬜ |
| F10 | Consulta do cliente via API | `GET /tracking/service-orders/{id}` (token de acompanhamento ou login `CUSTOMER` — ADR-011) | integração | ✔ | 6/8 | | ⬜ |
| F11 | CRUD de clientes | `/customers` | integração | ✔ | 6 | | ⬜ |
| F12 | CRUD de veículos | `/vehicles` | integração | ✔ | 6 | | ⬜ |
| F13 | CRUD de serviços | `/services` | integração | ✔ | 7 | | ⬜ |
| F14 | CRUD de peças e insumos | `/parts` — em andamento na `feat/crud_pecas`: CRUD em `/itens` (`ItemController`/`ItemService`, módulo `catalog`); **pendente** alinhar rota/nomes ao contrato e glossário (`/parts`, `Part`/`PartsService`), movimentações e teste de integração | unit ✔ · integração ⬜ | ✔ | 7 | | 🟡 |
| F15 | Controle de estoque | movimentações (`/parts/{id}/stock-movements`) + reserva na aprovação e baixa na finalização (ADR-012); `stockQuantity`/`reservedQuantity`/`availableQuantity` | unit + integração | ✔ | 7/8/9 | | ⬜ |
| F16 | Listagem de OS | `GET /service-orders` (filtros, paginação) | integração | ✔ | 9 | | ⬜ |
| F17 | Detalhamento de OS | `GET /service-orders/{id}` + `/status-history` | integração | ✔ | 9 | | ⬜ |
| F18 | Monitoramento ou cálculo do tempo médio de execução | `GET /metrics/average-execution-time` | integração (seed) | ✔ | 9 | | ⬜ |

## 2. Requisitos técnicos obrigatórios (enunciado §6)

| # | Requisito | Evidência | Dono | Status |
|---|---|---|---|---|
| T1 | Back-end monolítico | 1 processo de API no compose; `docs/04-arquitetura/visao-geral.md` | | ⬜ |
| T2 | Organização em camadas (clássicas, por módulo — ADR-003) explicada | ADR-003 + árvore do repo + bloco 3 do vídeo | Hermando | ⬜ |
| T3 | Banco de dados de livre escolha, com decisão justificada | ADR-002 + README §9 + bloco 4 | Diego | ⬜ |
| T4 | APIs RESTful + Swagger/OpenAPI | `/docs` no ar; `openapi.json` gerado pelo código (artefato do CI — ADR-005) | | ⬜ |
| T5 | Autenticação JWT para APIs administrativas | guard JWT HS256 + `/auth/login`, `/auth/refresh` (rotação de refresh token) e `/auth/logout`; papéis via `RolesGuard`; `DELETE /users/{id}` = exclusão lógica (`usuarioAtivo`), que bloqueia login/refresh e preserva o histórico (ADR-004). Pendente: teste de integração 401/403 | | 🟡 |
| T6 | Validação de CPF ou CNPJ · validação da placa | VOs `Document` e `LicensePlate` + 422 | unit exaustivo | ⬜ |
| T7 | Testes unitários · testes de integração dos fluxos principais | `test/unit` (controllers de auth e users) e `test/services` (`AuthService`, `UsersService`) já existem; faltam `test/integration` e `test/bdd` — CI verde | | 🟡 |
| T8 | **Evidência** de cobertura mínima de 80 % nos domínios críticos | `docs/06-entrega/evidencias/cobertura.md` (percentual por módulo) + gate no CI | | ⬜ |
| T9 | Instruções para execução local (README completo) | README com os 13 itens do enunciado; outro membro executa só pelo README | Hermando | ⬜ |
| T10 | **Tratamento adequado das transações** nos principais fluxos | `prisma.$transaction` em aprovar (status + reserva) e finalizar (status + baixa); teste de integração de rollback | Diego | ⬜ |
| T11 | Dockerfile para build · docker-compose orquestrando o ambiente completo | build limpo; Trivy sem críticas; `docker compose up` em máquina limpa (testado por outro membro) | Hermando | ⬜ |
| T12 | Repositório **público** durante a correção e a revisão de notas, só com arquivos necessários, sem credenciais/tokens | visibilidade pública ligada na entrega; gitleaks limpo no histórico | | ⬜ |
| T13 | Versão identificada (branch, tag ou hash) informada no PDF; código do vídeo = código da documentação = commit entregue | tag `v1.0.0` em `master` + hash no PDF | | ⬜ |
| T14 | **Branch principal protegida, tudo via PR** (enunciado, entregáveis §2: "a branch main deve sempre estar protegida e tudo que chegar nela deve vir através de PR") | `master` e `develop` protegidas **sem bypass para ninguém**; todo commit desde 23/09 chega por PR; os commits diretos da fase de planejamento até 23/09 estão registrados como exceção em `docs/02-adr/decisoes-leves.md` | Hermando | ⬜ |

## 3. Entregáveis (enunciado §1–§4)

| # | Entregável | Evidência | Dono | Status |
|---|---|---|---|---|
| E1 | **PDF único** com a primeira página obrigatória (Curso SOAT — Software Architecture; Fase 1; grupo **49**; nome completo, RM e Discord de todos; linguagem e tecnologias) e todos os links | `documento-de-entrega-template.md` preenchido e exportado | F2 | ⬜ |
| E2 | Branch e **hash do commit** da entrega no PDF (a avaliação considera só essa versão) | tag `v1.0.0` em `master` + hash | F1 | ⬜ |
| E3 | README completo no repositório (objetivo, solução, arquitetura, tecnologias, pré-requisitos, execução, testes, Swagger, banco, credenciais de demonstração, diretórios, links DDD e vídeo) | `README.md` no commit da entrega | F5 infra | ⬜ |
| E4 | Vídeo ≤ 15 min, **público no YouTube**, áudio compreensível, mostrando o commit da entrega, a documentação, as decisões e os integrantes | link + roteiro cumprido (§4) | F5 entrega | ⬜ |
| E5 | Event storming — criação da OS | frame no Miro + `docs/ddd/event-storming.pdf` | F2 | ⬜ |
| E6 | Event storming — acompanhamento da OS | frame no Miro + `docs/ddd/event-storming.pdf` | F2 | ⬜ |
| E7 | Event storming — gestão de peças e insumos | frame no Miro + `docs/ddd/event-storming.pdf` | F2 | ⬜ |
| E8 | Eventos de domínio, comandos, políticas, atores, agregados, entidades, objetos de valor, bounded contexts e diagramas da disciplina (domain storytelling, context map, agregados, máquina de estados) | frames no Miro + `docs/ddd/diagramas.pdf` | F2 | ⬜ |
| E9 | Linguagem ubíqua + glossário + **relação documentação ↔ código** | `docs/ddd/linguagem-ubiqua.md` (coluna *Identificador (EN)*) · nomes no código e no Swagger | F2/F3 | ⬜ |
| E10 | Link do Miro **acessível sem pedir permissão** | testado em janela anônima | F2 | ⬜ |
| E11 | Relatório ou resultado da análise de vulnerabilidades **no repositório** | `docs/06-entrega/relatorio-de-vulnerabilidades.md` + `evidencias/scan-*` (antes × depois) | F4 | ⬜ |

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
