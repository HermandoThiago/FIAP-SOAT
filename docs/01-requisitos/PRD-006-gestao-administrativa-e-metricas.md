# PRD-006 — Gestão administrativa: listagens, detalhamento e tempo médio de execução

| Campo | Valor |
|---|---|
| Status | Planejamento (ver *Situação da implementação*) |
| Dono | F3 · apoio F1 |
| Origem no enunciado | "Listagem e detalhamento de ordens de serviço"; "Monitoramento do tempo médio de execução dos serviços" |
| Contexto DDD | read models sobre `service-orders` (consultas e métricas) |

## Situação da implementação

> Planejamento original; onde o código difere, vale o código ([contrato](../04-arquitetura/contrato-api.md), [divergências das ADRs](../02-adr/README.md#leitura-das-divergências)). Nomes de status, papéis e rotas no texto abaixo são os do planejamento.

| Requisito | Situação |
|---|---|
| RF-070 filtros | `status`, `clientId`, `veiculoId`, `from`, `to`, paginação `page` (a partir de 1) e `pageSize`; os envelopes variam por recurso (RN-073 não vale) |
| RF-072 média geral | `GET /metrics/average-execution-time`; média em minutos com duas casas e `null` sem amostras; `from`, `to`, `serviceId` opcionais |
| RN-071 período padrão de 30 dias | **não existe** |
| RF-073 por serviço | `byService`, usando a duração das OS que contêm o serviço (não há cronômetro por tarefa); **sem** estimado × real |
| RF-074 `/metrics/summary` | **não implementado** |
| Acesso | Admin, Atendente e Mecânico |

## 1. Objetivo

Dar ao gerente/atendente visão operacional das OS (filas por status, detalhes completos) e a métrica pedida no enunciado:
**tempo médio de execução dos serviços**.

## 2. Definições (fecham ambiguidade antes de codar)

- **Tempo de execução de uma OS** = `completedAt − executionStartedAt` (em minutos). Só OS **Finalizadas** ou **Entregues** entram.
- **Tempo médio de execução (geral)** = média dos tempos de execução das OS finalizadas no período.
- **Tempo médio por serviço** = média dos tempos de execução das OS finalizadas **que contêm** aquele serviço (aproximação
  aceitável no MVP: a OS não registra tempo por item). Comparar com `estimatedMinutes` do catálogo (Could).
- **Tempo total de ciclo** (Could) = `deliveredAt − receivedAt`.

## 3. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-070 | Listar OS com filtros: status, cliente, veículo, período (`de`/`ate` por `receivedAt`); ordenação por data; paginação | Must (listagem) / Should (filtros completos) |
| RF-071 | Detalhar OS (tudo: cliente, veículo, itens, orçamento, marcos, histórico) — mesmo endpoint do PRD-003 | Must |
| RF-072 | `GET /metrics/average-execution-time?from=&to=` → média geral em minutos, quantidade de OS consideradas, período | Must |
| RF-073 | `GET /metrics/average-execution-time?serviceId=` → média por serviço (+ estimado vs. real) | Should |
| RF-074 | `GET /metrics/summary` → contagem de OS por status (painel) | Could |
| RF-075 | Exportação CSV | Won't |

## 4. Regras

| ID | Regra |
|---|---|
| RN-070 | Métricas calculadas por consulta (SQL agregado) — sem tabela materializada no MVP |
| RN-071 | Período padrão: últimos 30 dias; máximo 365 dias |
| RN-072 | Média com 1 casa decimal em minutos; `quantity = 0` → `media = null` (não 0) |
| RN-073 | Listagens paginadas: `page` (0-based), `size` (padrão 20, máx. 100); resposta com `total`, `page`, `size`, `items` |

## 5. Critérios de aceite

```gherkin
Funcionalidade: Tempo médio de execução
  Cenário: Média geral
    Dado 2 OS finalizadas com execução de 60 e 120 minutos no período
    Quando consulto /metrics/average-execution-time
    Então recebo mediaMinutos 90.0 e quantidadeOs 2

  Cenário: Sem dados
    Dado nenhuma OS finalizada no período
    Quando consulto /metrics/average-execution-time
    Então recebo mediaMinutos null e quantidadeOs 0

Funcionalidade: Listagem
  Cenário: Filtrar por status
    Dado 3 OS em IN_PROGRESS e 1 em RECEIVED
    Quando consulto /service-orders?status=IN_PROGRESS
    Então recebo total 3
```

## 6. API (resumo)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/service-orders` | ATTENDANT+ | Listagem com filtros/paginação |
| GET | `/service-orders/{id}` | ATTENDANT+ | Detalhamento |
| GET | `/metrics/average-execution-time` | MANAGER (ou ATTENDANT+) | Média geral / por serviço |
| GET | `/metrics/summary` | MANAGER | Contagem por status (Could) |

## 7. Evidências

Bloco do vídeo mostrando a listagem por status e a métrica após finalizar 2 OS na demo (dados de seed já finalizados
ajudam a ter média ≠ null); teste de integração da consulta agregada.
