# 03 — Módulo `service-orders` (F3, Diego) — core do sistema

```text
Implemente o módulo service-orders conforme docs/01-requisitos/PRD-003 (OS e orçamento), PRD-004 (status e
acompanhamento), PRD-006 (listagem e tempo médio), docs/ddd/agregados.md, docs/ddd/linguagem-ubiqua.md e
docs/04-arquitetura/contrato-api.md §3.4–3.6, na estrutura de docs/04-arquitetura/estrutura-do-repositorio.md
(camadas clássicas: controllers/ + dto/ → services/ → repositories/, todos sobre domain/). Decisões aceitas que valem
aqui: ADR-009 (UUID v4 + número OS-AAAA-NNNNNN), ADR-010 (recusa e cancelamento → CANCELLED, só antes da aprovação;
sem volta para diagnóstico), ADR-011 (token de acompanhamento ou login CUSTOMER em /tracking), ADR-012 (reserva na
aprovação, baixa na finalização, 422 sem estoque). Não há decisão pendente; algo fora dos docs é scope creep.

Trabalhe em TDD, nesta ordem, parando para revisão a cada passo:

PASSO 1 — domain/ (TypeScript puro; sem @nestjs/*, sem @prisma/client)
- Agregado ServiceOrder: number (ServiceOrderNumber, OS-AAAA-NNNNNN), customerId, vehicleId, problemDescription,
  status (ServiceOrderStatus, 7 valores), serviceItems/partItems (snapshot de nome e preço), quote (totalAmount
  derivado, QuoteStatus, sentAt, respondedAt), milestones (receivedAt, diagnosisStartedAt, quoteSentAt,
  executionStartedAt, completedAt, deliveredAt), statusHistory (append-only), cancellationReason, version.
- Comandos: startDiagnosis, addServiceItem, addPartItem, removeItem, sendQuote, approveQuote, rejectQuote(reason) →
  CANCELLED, complete, deliver, cancel(reason) → CANCELLED (só em RECEIVED/IN_DIAGNOSIS/AWAITING_APPROVAL).
- StatusTransitionPolicy com a tabela da PRD-004 §2; transição inválida lança InvalidTransitionError (→ 409).
- Eventos nomeados como em linguagem-ubiqua.md §8.
- Testes unitários: TODAS as combinações status × comando (it.each, incluindo CANCELLED e DELIVERED como terminais);
  cálculo do quote (Money, arredondamento); itens congelados após sendQuote; sendQuote sem itens; approveQuote duas
  vezes; recusa e cancelamento; statusHistory e version.

PASSO 2 — services/ (um método por caso de uso; testados com repositórios fake em memória)
- ServiceOrdersService: create (cliente por id ou documento; veículo por id ou placa; valida posse via
  CustomersService/VehiclesService exportados pelo módulo customers; RN-039 uma OS aberta por veículo), startDiagnosis,
  addServiceItem e addPartItem (snapshot via CatalogService/PartsService; verifica availableQuantity e ativo → 422),
  removeItem, sendQuote (TrackingTokenService do identity + CustomerNotifier/LogCustomerNotifier; em dev devolve
  tracking.url), approveQuote (transação Prisma: agregado + PartsService.reserveForServiceOrder — falha na reserva
  reverte tudo e devolve 422), rejectQuote, complete (transação: agregado + PartsService.withdrawReservedForServiceOrder),
  deliver, cancel (MANAGER), findById, list (filtros/paginação).
- TrackingService: getTracking, listMine (só login CUSTOMER), approveQuote, rejectQuote — verifica a propriedade
  (token de acompanhamento → sub = id; login → customerId do token = customerId da OS) e devolve 404 para OS alheia;
  projeção mascarada com statusDescription em português (tabela linguagem-ubiqua §7).
- MetricsService: averageExecutionTime (PRD-006 §2; SQL de docs/04-arquitetura/modelo-de-dados.md §4; OS canceladas
  ficam fora).

PASSO 3 — repositories/, controllers/ e dto/
- ServiceOrderRepository com Prisma (mapeamento registro ↔ agregado separado do domínio, lock otimista por version,
  sequência anual do número em SQL); consultas de leitura da listagem e das métricas.
- Controllers + DTOs (class-validator na entrada; fromDomain() na saída) conforme o contrato (rotas, códigos, Problem
  Details, OpenAPI com exemplos); rotas /tracking usam o TrackingAuthGuard (token de acompanhamento aud=tracking ou
  JWT com papel CUSTOMER) e rejeitam JWT de equipe; nunca chame repositório a partir de controller.
- Testes de integração (Testcontainers + supertest): fluxo completo criar → diagnosis → itens (422 sem estoque) →
  quote/send → tracking approve (estoque reservado) → complete (estoque baixado) → deliver → status-history → metrics;
  recusa → CANCELLED sem efeito no estoque; 401/403/404/409/422 relevantes.

Ao final: cobertura do módulo (meta ≥ 80 % linhas e branches em domain + services), endpoints marcados em
docs/06-entrega/checklist-de-entrega.md e pendências. Nome fora do glossário = pare e proponha a linha no glossário.
```
