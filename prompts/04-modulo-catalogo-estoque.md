# 04 — Módulo `catalog` (F3, Hermando)

```text
Implemente o módulo catalog conforme docs/01-requisitos/PRD-002, docs/03-ddd/agregados.md (Service, Part,
StockMovement), docs/03-ddd/linguagem-ubiqua.md §4 e docs/04-arquitetura/contrato-api.md §3.3, na estrutura Clean
de docs/04-arquitetura/estrutura-do-repositorio.md. Decisão de estoque: {{ESTOQUE}} (ADR-012, E-16) — se ainda não
Aceita, implemente a recomendada (baixa na aprovação; bloquear sem estoque) e marque como [dúvida].

TDD, nesta ordem:

1. domain/: Service (name único, price: Money, estimatedMinutes, active); Part (sku único, type PART|SUPPLY,
   unitOfMeasure, unitPrice, stockQuantity, reservedQuantity, minimumStock, active) com recordInbound, withdraw,
   reserve, release, adjust, availableQuantity(); cada método gera um StockMovement (INBOUND|OUTBOUND|RESERVATION|
   RELEASE|ADJUSTMENT); invariantes: stockQuantity ≥ 0, reservedQuantity ≤ stockQuantity, quantity > 0; evento
   StockBelowMinimum quando cruzar o mínimo. Testes unitários de todas as invariantes.
2. application/: RegisterService/UpdateService/DeactivateService, RegisterPart/UpdatePart/DeactivatePart,
   RecordStockInbound, AdjustStock, WithdrawStockForServiceOrder (lista {partId, quantity, serviceOrderId};
   tudo-ou-nada), ReleaseReservationForServiceOrder, ListPartsBelowMinimum; portas expostas CatalogLookup
   (getService/getPart com name, price, availableQuantity, active) e StockMovements (para o módulo service-orders).
3. adapters/ + infrastructure/: gateways com {{ORM}} e as constraints de docs/04-arquitetura/modelo-de-dados.md §3;
   controllers/presenters/DTOs conforme o contrato; OpenAPI com exemplos; testes de integração (inbound → withdraw →
   stock-movements; constraint stock_quantity ≥ 0 no banco; filtro belowMinimum).

Regra: nenhuma edição direta de stockQuantity por API (PUT /parts não altera estoque). Ao final, cobertura do módulo
(≥ 80 % em domain + application) e checklist atualizado.
```
