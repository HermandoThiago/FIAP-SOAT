# 04 — Módulo `catalog` (F3, Hermando)

```text
Implemente o módulo catalog conforme docs/01-requisitos/PRD-002, docs/03-ddd/agregados.md (Service, Part,
StockMovement), docs/03-ddd/linguagem-ubiqua.md §4 e docs/04-arquitetura/contrato-api.md §3.3, na estrutura de camadas
clássicas de docs/04-arquitetura/estrutura-do-repositorio.md (controllers/ + dto/ → services/ → repositories/, sobre
domain/). Decisão de estoque aceita (ADR-012, E-16): reserva na aprovação do orçamento, baixa na finalização, inclusão
sem disponibilidade → 422. Nada está em votação.

TDD, nesta ordem:

1. domain/ (TypeScript puro): Service (name único, price: Money, estimatedMinutes, active); Part (sku único, type
   PART|SUPPLY, unitOfMeasure, unitPrice, stockQuantity, reservedQuantity, minimumStock, active) com recordInbound,
   reserve, withdraw (consome a reserva: reduz estoque e reservado), release (sem gatilho no MVP), adjust,
   availableQuantity(); cada método gera um StockMovement (INBOUND|OUTBOUND|RESERVATION|RELEASE|ADJUSTMENT);
   invariantes: stockQuantity ≥ 0, 0 ≤ reservedQuantity ≤ stockQuantity, quantity > 0; evento StockBelowMinimum
   quando cruzar o mínimo. Testes unitários de todas as invariantes.
2. services/: CatalogService (register/update/deactivate/findById/list da entidade Service — nunca chame de
   ServicesService) e PartsService (register/update/deactivate/findById/list, recordInbound, adjustStock,
   reserveForServiceOrder e withdrawReservedForServiceOrder — lista {partId, quantity}, serviceOrderId e a transação
   do Prisma recebida do chamador; tudo-ou-nada; sem disponibilidade → erro de domínio que vira 422 —,
   releaseReservation (Could), listBelowMinimum). Os dois são exportados pelo CatalogModule para o módulo
   service-orders; testados com repositórios fake em memória.
3. repositories/ + controllers/ + dto/: repositórios com Prisma (mapeamento registro ↔ agregado; constraints de
   docs/04-arquitetura/modelo-de-dados.md §3); controllers/DTOs conforme o contrato (CatalogController em /services,
   PartsController em /parts e /parts/{id}/stock-movements); OpenAPI com exemplos; testes de integração (inbound →
   reserve → withdraw → stock-movements; constraints stock_quantity ≥ 0 e reserved ≤ stock no banco; filtro
   belowMinimum).

Regra: nenhuma edição direta de stockQuantity/reservedQuantity por API (PUT /parts não altera estoque); reserva e baixa
só acontecem via service-orders. Ao final, cobertura do módulo (≥ 80 % em domain + services) e checklist atualizado.
```
