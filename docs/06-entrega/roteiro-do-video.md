# Roteiro do vídeo (≤ 15 minutos)

> Regras: cobrir **todos** os 15 itens do enunciado na ordem em que aparecem; demonstrar ao vivo (Swagger) em vez de
> ler slides; cada bloco tem responsável e tempo máximo; ensaio cronometrado obrigatório. Gravar por blocos (cada um
> grava o seu) e juntar na edição, ou gravar junto — decidir na E-03.

## Preparação (antes de gravar)

- [ ] `docker compose down -v && docker compose up --build` em máquina limpa; seed carregado (OS aguardando aprovação pronta para a demo).
- [ ] Miro aberto nos frames: legenda, big picture, fluxo 1, fluxo 2, context map, agregados, glossário.
- [ ] Swagger aberto e autenticado (token do gerente já colado no *Authorize*).
- [ ] Terminal com relatório de cobertura e saída do BDD prontos; relatórios de scan abertos (antes × depois).
- [ ] IDE com a árvore do repositório colapsada nos módulos.
- [ ] Resolução 1080p, zoom 125 % no navegador, fontes grandes no terminal.

## Blocos

| # | Item do enunciado | Tempo | O que mostrar / dizer | Responsável |
|---|---|---|---|---|
| 1 | **Proposta da solução** | 0:00–0:50 | Nome do grupo e integrantes; problema da oficina (5 dores); MVP: OS, clientes, veículos, catálogo/estoque, orçamento com aprovação, DDD + qualidade + segurança | Líder |
| 2 | **Arquitetura do projeto** | 0:50–1:50 | C4 nível 1 e 2 (`visao-geral.md`): atores, API monolítica, banco, compose; frase sobre evolução para K8s/microsserviços | F1 |
| 3 | **Organização do monólito e suas camadas** | 1:50–2:50 | Árvore do repo: módulos por contexto (`customers`, `catalog`, `service-orders`, `identity`) e as 4 camadas da Clean Architecture (`domain` → `application` → `adapters` → `infrastructure`, dependência de fora para dentro; controller → use case → presenter); por que facilita as próximas fases | F1 |
| 4 | **Escolha e justificativa do banco** | 2:50–3:30 | ADR-002: relacional/transacional (aprovação + baixa de estoque atômica), `NUMERIC`, constraints, Testcontainers, RDS depois; schema por módulo | F1 |
| 5 | **Event Storming + elementos de DDD** | 3:30–5:30 | Miro: legenda; big picture; fluxo 1 (ator → comando → agregado → evento → política) com os pivotais; fluxo 2 (estoque); hotspots resolvidos por ADRs; context map (core/supporting/generic); agregados e VOs (`Document`, `LicensePlate`, `Money`); linguagem ubíqua (glossário ↔ nomes no código/Swagger) | F2 |
| 6 | **Fluxo de criação e acompanhamento da OS** | 5:30–7:00 | Swagger: criar cliente (CPF) e veículo (placa) → `POST /service-orders` (Recebida) → `GET /tracking/...` como cliente | F3 |
| 7 | **Inclusão de serviços, peças e insumos** | 7:00–7:50 | `POST …/diagnosis` → incluir serviço → incluir peça (mostrar estoque antes) → tentar peça sem estoque (422) | F3 |
| 8 | **Geração e aprovação do orçamento** | 7:50–9:00 | `GET …/quote` (calculado) → `POST …/quote/send` (token no log/resposta) → `POST /tracking/…/quote/approve` → status Em execução; mostrar estoque baixado | F3 |
| 9 | **Alteração dos status da OS** | 9:00–10:00 | Diagrama de estados; `POST …/complete` → `POST …/deliver`; `GET …/status-history`; tentar transição inválida (409); listagem por status; `GET /metrics/average-execution-time` | F3 |
| 10 | **Autenticação das APIs administrativas** | 10:00–10:50 | Chamar `/customers` sem token (401) → `POST /auth/login` → *Authorize* → 200; papel insuficiente (403); validação CPF/placa inválidos (422); menção a hash/segredos por env | F4 |
| 11 | **Execução da aplicação** | 10:50–11:40 | Terminal: `git clone` → `.env.example` → `docker compose up --build` → logs → `/health`; README na tela | F5 |
| 12 | **Documentação Swagger/OpenAPI** | 11:40–12:10 | Swagger UI: tags por módulo, exemplos, esquema `bearerAuth`, erros documentados; `openapi.json` versionado | F5 |
| 13 | **Testes automatizados** | 12:10–13:20 | Rodar testes (ou mostrar CI verde); relatório de cobertura ≥ 80 % em `service-orders` e `catalog`; cenários BDD em português passando; teste parametrizado da máquina de estados | F4 |
| 14 | **Resultado da análise de vulnerabilidades** | 13:20–14:30 | Ferramentas (Semgrep, SCA, Trivy, gitleaks, ZAP); tabela antes × depois; 1 exemplo de achado corrigido; riscos aceitos; link do relatório | F4 |
| 15 | Encerramento | 14:30–15:00 | Recap dos entregáveis (Miro, repo, relatório, PDF); próximos passos (Fase 2) | Líder |

## Dicas

- Falar o **nome do requisito** ao demonstrá-lo ("aqui está a alteração automática de status…") — facilita a correção.
- Deixar dados de demo com nomes claros (`Maria Silva`, `OS-2026-000042`) e valores redondos (R$ 330,00).
- Se algo falhar ao vivo, cortar na edição — nunca gravar de novo tudo.
- Legendas/callouts curtos para os itens do checklist; sem música alta.
- Duração-alvo 14:30 para ter margem.
