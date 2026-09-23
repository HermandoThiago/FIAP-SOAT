# Checklist de entrega — rastreabilidade enunciado → evidência → vídeo

> Documento **vivo**: atualizar a cada PR que fecha um item. Na última semana, outra pessoa (não o dono) confere cada
> linha do zero. Nota máxima = todas as linhas com evidência verificável.

Legenda: ⬜ não iniciado · 🟡 em andamento · ✅ pronto e verificado por outra pessoa

## 1. Funcionalidades obrigatórias

| # | Requisito (enunciado) | Evidência no código | Teste | Swagger | Bloco do vídeo | Dono | Status |
|---|---|---|---|---|---|---|---|
| F1 | Identificação do cliente por CPF/CNPJ | `POST /service-orders` aceita `customerDocument`; VO `Document` | unit + integração | ✔ | 6 | | ⬜ |
| F2 | Cadastro de veículo (placa, marca, modelo, ano) | `POST /vehicles`; VO `LicensePlate` | unit + integração | ✔ | 6 | | ⬜ |
| F3 | Inclusão dos serviços solicitados | `POST /service-orders/{id}/items/services` | integração | ✔ | 7 | | ⬜ |
| F4 | Inclusão de peças e insumos | `POST /service-orders/{id}/items/parts` (verifica estoque) | integração | ✔ | 7 | | ⬜ |
| F5 | Orçamento gerado automaticamente | `ServiceOrder.recalculateQuote()` | unit | ✔ | 8 | | ⬜ |
| F6 | Envio do orçamento ao cliente para aprovação | `POST …/quote/send` + notificador (log) + token | integração | ✔ | 8 | | ⬜ |
| F7 | 6 status da OS | enum `ServiceOrderStatus` (6 do enunciado + `CANCELLED`, ADR-010) + `StatusTransitionPolicy` | unit parametrizado | — | 9 | | ⬜ |
| F8 | Alteração automática dos status conforme ações | transições dentro dos comandos; histórico | unit + integração | ✔ | 9 | | ⬜ |
| F9 | Consulta do cliente via API | `GET /tracking/service-orders/{id}` (token de acompanhamento ou login `CUSTOMER` — ADR-011) | integração | ✔ | 6/8 | | ⬜ |
| F10 | CRUD de clientes | `/customers` | integração | ✔ | 6 | | ⬜ |
| F11 | CRUD de veículos | `/vehicles` | integração | ✔ | 6 | | ⬜ |
| F12 | CRUD de serviços | `/services` | integração | ✔ | 7 | | ⬜ |
| F13 | CRUD de peças e insumos com controle de estoque | `/parts` + movimentações + reserva na aprovação e baixa na finalização (ADR-012) | unit + integração | ✔ | 7 | | ⬜ |
| F14 | Listagem e detalhamento de OS | `GET /service-orders`, `GET /service-orders/{id}` | integração | ✔ | 9 | | ⬜ |
| F15 | Monitoramento do tempo médio de execução | `GET /metrics/average-execution-time` | integração (seed) | ✔ | 9 | | ⬜ |
| F16 | Autenticação JWT para APIs administrativas | guard JWT HS256 + `/auth/login` (ADR-004) | integração 401/403 | ✔ | 10 | | ⬜ |
| F17 | Validação de dados sensíveis (CPF/CNPJ, placa) | VOs + 422 | unit exaustivo | ✔ | 10 | | ⬜ |
| F18 | Testes unitários e de integração dos principais fluxos | `tests/` | CI verde | — | 13 | | ⬜ |

## 2. Requisitos técnicos

| # | Requisito | Evidência | Dono | Status |
|---|---|---|---|---|
| T1 | Back-end monolítico | 1 processo de API no compose; `docs/04-arquitetura/visao-geral.md` | | ⬜ |
| T2 | Arquitetura em camadas (clássicas, por módulo — ADR-003) explicada | ADR-003 + árvore do repo + bloco 3 do vídeo | | ⬜ |
| T3 | Banco de dados justificado | ADR-002 + README §banco + bloco 4 | | ⬜ |
| T4 | APIs RESTful documentadas via Swagger | `/docs` no ar; `openapi.json` gerado pelo código (artefato do CI — ADR-005) | | ⬜ |
| T5 | Dockerfile | build limpo; Trivy sem críticas | | ⬜ |
| T6 | docker-compose.yml orquestra ambiente completo | `docker compose up` em máquina limpa (testado por outro membro) | | ⬜ |
| T7 | Cobertura mínima 80 % nos domínios críticos | relatório de cobertura em `evidencias/` + gate no CI | | ⬜ |
| T8 | README com execução local simples | outro membro executa só pelo README | | ⬜ |
| T9 | Repositório privado com acesso a `soat-architecture` | convite aceito (print) | | ⬜ |

## 3. Entregáveis

| # | Entregável | Evidência | Dono | Status |
|---|---|---|---|---|
| E1 | Vídeo ≤ 15 min com todos os pontos | link (YouTube não listado / Drive) + roteiro cumprido | F5 | ⬜ |
| E2 | Event storming completo — criação e acompanhamento da OS | frame no Miro | F2 | ⬜ |
| E3 | Event storming completo — gestão de peças e insumos | frame no Miro | F2 | ⬜ |
| E4 | Diagramas da disciplina de DDD (domain storytelling, context map, agregados) | frames no Miro | F2 | ⬜ |
| E5 | Linguagem ubíqua aplicada | glossário no Miro + nomes no código/Swagger | F2/F3 | ⬜ |
| E6 | Código-fonte com APIs, Dockerfile, compose, README | repo | F1/F3/F5 | ⬜ |
| E7 | Relatório com análise de vulnerabilidades (scan no código) | PDF/MD com antes × depois | F4 | ⬜ |
| E8 | Documento de entrega (PDF): nome do grupo, participantes + Discord, link doc, link repo, relatório | PDF | F2 | ⬜ |

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

## 5. Revisão cruzada final (D-2)

- [ ] Clone limpo → `docker compose up` → Swagger → fluxo completo em < 5 min (pessoa ≠ dona da F5)
- [ ] Links do PDF abertos em janela anônima (Miro público/compartilhado com link; repo com `soat-architecture` convidado)
- [ ] Vídeo assistido inteiro com cronômetro (≤ 15:00) e checklist §4 marcado
- [ ] README lido do início ao fim; comandos copiados e executados
- [ ] Relatório de vulnerabilidades com datas, versões e antes × depois
