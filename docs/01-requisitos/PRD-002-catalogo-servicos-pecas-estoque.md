# PRD-002 — Catálogo de serviços, peças/insumos e estoque (contexto `catalog`)

| Campo | Valor |
|---|---|
| Status | 📝 Rascunho para revisão (regras de estoque consolidadas pela ADR-012 em 22/09/2026) |
| Dono | F3 (Domínio & API) |
| Origem no enunciado | "CRUD de serviços"; "CRUD de peças e insumos, com controle de estoque"; "Possibilidade de incluir peças e insumos necessários"; Event storming obrigatório do fluxo **gestão de peças e insumos** |
| Contexto DDD | `catalog` (supporting) |

## 1. Objetivo

Manter o catálogo do que a oficina vende (serviços de mão de obra) e usa (peças e insumos), com preços e **controle de
estoque** confiável, para que o orçamento seja calculado automaticamente e o estoque reflita o que foi comprometido e
consumido pelas OS.

## 2. Conceitos

- **Serviço**: item de mão de obra do catálogo (ex.: troca de óleo, alinhamento). Tem preço e tempo estimado.
- **Peça**: item físico rastreado por unidade (ex.: filtro de óleo, pastilha de freio).
- **Insumo**: item consumível, geralmente por quantidade fracionária/unidade de medida (ex.: óleo 5W30 em litros). No MVP,
  peças e insumos compartilham o mesmo agregado (`Part`, com campo `type = PART | SUPPLY` e `unitOfMeasure`).
- **Movimentação de estoque**: registro imutável de entrada, reserva, baixa, liberação ou ajuste.
- **Disponibilidade**: `availableQuantity = stockQuantity − reservedQuantity` — o que pode ser incluído em novas OS.

## 3. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-020 | CRUD de serviços: nome (único), descrição, preço, tempo estimado (min), ativo | Must |
| RF-021 | CRUD de peças/insumos: SKU (único), nome, tipo, unidade de medida, preço unitário, quantidade em estoque, quantidade reservada, estoque mínimo, ativo | Must |
| RF-022 | Registrar **entrada** de estoque (compra/abastecimento) com quantidade e observação | Must |
| RF-023 | Registrar **ajuste** de estoque (inventário) com motivo | Should |
| RF-024 | **Reserva** das peças da OS quando o orçamento é aprovado (`RESERVATION`, tudo ou nada) e **baixa** quando a OS é finalizada (`OUTBOUND`, consome a reserva) — ADR-012 | Must |
| RF-025 | **Liberação** de reserva sem consumo (`RELEASE`) — sem gatilho no MVP: recusa e cancelamento só acontecem antes da aprovação (ADR-010) | Could |
| RF-026 | Consultar histórico de movimentações de uma peça (inclui as geradas pelas OS) | Should |
| RF-027 | Listar peças com estoque abaixo do mínimo | Could |
| RF-028 | Inativar serviço/peça (não remove; deixa de aparecer para novas OS; OS antigas mantêm snapshot) | Must |

## 4. Regras de negócio

| ID | Regra |
|---|---|
| RN-020 | Preços com 2 casas decimais, ≥ 0; `stockQuantity ≥ 0`; `0 ≤ reservedQuantity ≤ stockQuantity` (no agregado e como `CHECK` no banco) |
| RN-021 | Estoque só muda por **movimentação** registrada (entrada, reserva, baixa, liberação, ajuste) — nunca por edição direta do campo (`PUT /parts` não altera quantidades) |
| RN-022 | Uma OS grava **snapshot** de nome e preço unitário do serviço/peça no momento da inclusão; mudar o catálogo depois não altera OS já orçadas |
| RN-023 | Inclusão de peça na OS verifica disponibilidade: `availableQuantity ≥ quantity`; sem disponibilidade → **422 `estoque insuficiente`** (ADR-012). A aprovação do orçamento verifica de novo ao reservar (o estoque pode ter mudado): sem disponibilidade → 422 e a OS continua aguardando aprovação |
| RN-024 | Serviço/peça inativos não podem ser incluídos em novas OS (422) |
| RN-025 | Tempo estimado do serviço alimenta a comparação com o tempo médio real de execução (PRD-006) |
| RN-026 | A baixa na finalização consome a reserva da própria OS: reduz `stockQuantity` **e** `reservedQuantity` na mesma quantidade |

## 5. Fluxo (referência para o event storming — detalhado em `docs/03-ddd/event-storming.md`)

```mermaid
flowchart LR
    A[Peça cadastrada] --> B[Entrada de estoque registrada]
    B --> C[Peça incluída em OS<br/>verifica disponibilidade — sem estoque → 422]
    C --> D[Orçamento aprovado]
    D --> E[Reserva realizada<br/>movimentação RESERVATION]
    E --> F[Execução finalizada]
    F --> G[Baixa realizada<br/>movimentação OUTBOUND]
    G --> H{Estoque < mínimo?}
    H -- sim --> I[Alerta de reposição<br/>Could]
    C -. recusa/cancelamento antes da aprovação .-> J[Sem efeito no estoque<br/>ADR-010]
```

## 6. Critérios de aceite (Gherkin)

```gherkin
Funcionalidade: Controle de estoque
  Cenário: Entrada de estoque
    Dado a peça "Filtro de óleo" com estoque 2
    Quando registro entrada de 10 unidades
    Então o estoque passa a 12 e existe uma movimentação INBOUND de 10

  Cenário: Reserva ao aprovar o orçamento
    Dado uma OS aguardando aprovação com 2 unidades de "Filtro de óleo" (estoque 12, reservado 0)
    Quando o cliente aprova o orçamento
    Então o estoque continua 12, a quantidade reservada passa a 2 e a disponibilidade a 10
    E existe movimentação RESERVATION de 2 vinculada à OS

  Cenário: Baixa ao finalizar a execução
    Dado uma OS em execução com 2 unidades de "Filtro de óleo" reservadas (estoque 12, reservado 2)
    Quando o mecânico finaliza a execução
    Então o estoque passa a 10, a quantidade reservada a 0
    E existe movimentação OUTBOUND de 2 vinculada à OS

  Cenário: Estoque insuficiente ao incluir peça
    Dado a peça "Pastilha de freio" com disponibilidade 0
    Quando incluo 1 unidade dela em uma OS em diagnóstico
    Então a resposta é 422 "estoque insuficiente" e a OS não muda

  Cenário: Snapshot de preço
    Dado uma OS com o serviço "Alinhamento" a R$ 120,00
    Quando o preço do serviço no catálogo muda para R$ 150,00
    Então o orçamento da OS continua R$ 120,00
```

## 7. API (resumo)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST/GET/PUT/DELETE | `/services`, `/services/{id}` | MANAGER (leitura: todos) | CRUD de serviços |
| POST/GET/PUT/DELETE | `/parts`, `/parts/{id}` | MANAGER (leitura: todos) | CRUD de peças/insumos (`GET` devolve `stockQuantity`, `reservedQuantity`, `availableQuantity`) |
| POST | `/parts/{id}/stock-movements` | MANAGER | Entrada/ajuste (`type`, `quantity`, `reason`) — reserva e baixa são geradas pelas OS, não por esta rota |
| GET | `/parts/{id}/stock-movements` | MANAGER | Histórico |
| GET | `/parts?belowMinimum=true` | MANAGER | Alerta (Could) |

## 8. Modelo (resumo)

- **Service**: `id`, `name`, `description`, `price`, `estimatedMinutes`, `active`.
- **Part**: `id`, `sku`, `name`, `type (PART|SUPPLY)`, `unitOfMeasure (UN|L|ML|KG…)`, `unitPrice`, `stockQuantity`, `reservedQuantity`, `minimumStock`, `active`.
- **StockMovement**: `id`, `partId`, `type (INBOUND|OUTBOUND|RESERVATION|RELEASE|ADJUSTMENT)`, `quantity`, `serviceOrderId?`, `reason?`, `userId`, `occurredAt`.

## 9. Questões abertas

| # | Questão | Situação |
|---|---|---|
| Q1 | Momento da baixa (aprovação vs. finalização) e reserva | ✅ E-16 / ADR-012 — reserva na aprovação + baixa na finalização |
| Q2 | Sem estoque: bloquear inclusão ou permitir com sinalização | ✅ E-16 / ADR-012 — bloquear (422) |
| Q3 | Insumos fracionários (litros) — aceitar decimal na quantidade? | Proposta: sim, `quantity` decimal(10,3) — fechar na revisão do PRD |

## 10. Evidências

Swagger dos CRUDs e movimentações; testes unitários das invariantes (estoque nunca negativo; reservado ≤ estoque;
snapshot); testes de integração "aprovar orçamento reserva estoque" e "finalizar baixa estoque"; bloco do vídeo
"inclusão de serviços, peças e insumos" (mostrar 422 sem estoque) e blocos 8/9 (reserva e baixa).
