# PRD-006 — Gestão administrativa: listagens, detalhamento e tempo médio de execução

| Campo | Valor |
|---|---|
| Status | 📝 Rascunho para revisão |
| Dono | F3 · apoio F1 |
| Origem no enunciado | "Listagem e detalhamento de ordens de serviço"; "Monitoramento do tempo médio de execução dos serviços" |
| Contexto DDD | read models sobre `atendimento` (consultas e métricas) |

## 1. Objetivo

Dar ao gerente/atendente visão operacional das OS (filas por status, detalhes completos) e a métrica pedida no enunciado:
**tempo médio de execução dos serviços**.

## 2. Definições (fecham ambiguidade antes de codar)

- **Tempo de execução de uma OS** = `finalizadaEm − execucaoIniciadaEm` (em minutos). Só OS **Finalizadas** ou **Entregues** entram.
- **Tempo médio de execução (geral)** = média dos tempos de execução das OS finalizadas no período.
- **Tempo médio por serviço** = média dos tempos de execução das OS finalizadas **que contêm** aquele serviço (aproximação
  aceitável no MVP: a OS não registra tempo por item). Comparar com `tempoEstimadoMin` do catálogo (Could).
- **Tempo total de ciclo** (Could) = `entregueEm − recebidaEm`.

## 3. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-070 | Listar OS com filtros: status, cliente, veículo, período (`de`/`ate` por `recebidaEm`); ordenação por data; paginação | Must (listagem) / Should (filtros completos) |
| RF-071 | Detalhar OS (tudo: cliente, veículo, itens, orçamento, marcos, histórico) — mesmo endpoint do PRD-003 | Must |
| RF-072 | `GET /metricas/tempo-medio-execucao?de=&ate=` → média geral em minutos, quantidade de OS consideradas, período | Must |
| RF-073 | `GET /metricas/tempo-medio-execucao?servicoId=` → média por serviço (+ estimado vs. real) | Should |
| RF-074 | `GET /metricas/resumo` → contagem de OS por status (painel) | Could |
| RF-075 | Exportação CSV | Won't |

## 4. Regras

| ID | Regra |
|---|---|
| RN-070 | Métricas calculadas por consulta (SQL agregado) — sem tabela materializada no MVP |
| RN-071 | Período padrão: últimos 30 dias; máximo 365 dias |
| RN-072 | Média com 1 casa decimal em minutos; `quantidade = 0` → `media = null` (não 0) |
| RN-073 | Listagens paginadas: `page` (0-based), `size` (padrão 20, máx. 100); resposta com `total`, `page`, `size`, `items` |

## 5. Critérios de aceite

```gherkin
Funcionalidade: Tempo médio de execução
  Cenário: Média geral
    Dado 2 OS finalizadas com execução de 60 e 120 minutos no período
    Quando consulto /metricas/tempo-medio-execucao
    Então recebo mediaMinutos 90.0 e quantidadeOs 2

  Cenário: Sem dados
    Dado nenhuma OS finalizada no período
    Quando consulto /metricas/tempo-medio-execucao
    Então recebo mediaMinutos null e quantidadeOs 0

Funcionalidade: Listagem
  Cenário: Filtrar por status
    Dado 3 OS em EM_EXECUCAO e 1 em RECEBIDA
    Quando consulto /ordens-servico?status=EM_EXECUCAO
    Então recebo total 3
```

## 6. API (resumo)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/ordens-servico` | ATENDENTE+ | Listagem com filtros/paginação |
| GET | `/ordens-servico/{id}` | ATENDENTE+ | Detalhamento |
| GET | `/metricas/tempo-medio-execucao` | GERENTE (ou ATENDENTE+) | Média geral / por serviço |
| GET | `/metricas/resumo` | GERENTE | Contagem por status (Could) |

## 7. Evidências

Bloco do vídeo mostrando a listagem por status e a métrica após finalizar 2 OS na demo (dados de seed já finalizados
ajudam a ter média ≠ null); teste de integração da consulta agregada.
