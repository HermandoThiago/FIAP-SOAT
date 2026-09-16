# 03 — Módulo `service-orders` (F3, Diego) — core do sistema

```text
Implemente o módulo service-orders conforme docs/01-requisitos/PRD-003 (OS e orçamento), PRD-004 (status e
acompanhamento), PRD-006 (listagem e tempo médio), docs/03-ddd/agregados.md, docs/03-ddd/linguagem-ubiqua.md e
docs/04-arquitetura/contrato-api.md §3.4–3.6, na estrutura de docs/04-arquitetura/estrutura-do-repositorio.md
(Clean Architecture). Decisões em votação: {{RECUSA}} (ADR-010), {{ACESSO_CLIENTE}} (ADR-011), {{ESTOQUE}} (ADR-012),
{{IDS}} (ADR-009) — se alguma ainda não estiver Aceita, implemente a opção recomendada e marque no PR como [dúvida].

Trabalhe em TDD, nesta ordem, parando para revisão a cada passo:

PASSO 1 — domain/ (TypeScript puro)
- Agregado ServiceOrder: number (ServiceOrderNumber, OS-AAAA-NNNNNN), customerId, vehicleId, problemDescription,
  status (ServiceOrderStatus), serviceItems/partItems (snapshot de nome e preço), quote (totalAmount derivado,
  QuoteStatus, sentAt, respondedAt), milestones (receivedAt, diagnosisStartedAt, quoteSentAt, executionStartedAt,
  completedAt, deliveredAt), statusHistory (append-only), version.
- Comandos: startDiagnosis, addServiceItem, addPartItem, removeItem, sendQuote, approveQuote, rejectQuote(reason,
  withdrawn), complete, deliver, cancel(reason).
- StatusTransitionPolicy com a tabela da PRD-004 §2; transição inválida lança InvalidTransitionError (→ 409).
- Eventos nomeados como em linguagem-ubiqua.md §8; interface ServiceOrderRepository.
- Testes unitários: TODAS as combinações status × comando (it.each); cálculo do quote (Money, arredondamento); itens
  congelados após sendQuote; sendQuote sem itens; approveQuote duas vezes; statusHistory e version.

PASSO 2 — application/
- Use cases (sufixo UseCase, um por comando/consulta): CreateServiceOrder (cliente por id ou documento; veículo por id
  ou placa; valida posse via porta CustomerLookup; RN-039 uma OS aberta por veículo), StartDiagnosis, AddServiceItem e
  AddPartItem (snapshot via CatalogLookup; verifica availableQuantity), RemoveItem, SendQuote (TrackingTokenIssuer +
  CustomerNotifier), ApproveQuote (transacional em UnitOfWork: agregado + porta StockMovements.withdraw — falha na baixa
  reverte tudo), RejectQuote, CompleteExecution, RegisterDelivery, CancelServiceOrder, GetServiceOrder, ListServiceOrders
  (filtros/paginação), GetTracking (projeção mascarada com statusDescription em português — tabela linguagem-ubiqua §7),
  CalculateAverageExecutionTime (PRD-006 §2; SQL de docs/04-arquitetura/modelo-de-dados.md §4).
- Input/output boundaries e request/response models como tipos simples; portas de saída como interfaces; fakes em
  memória para os testes de aplicação.

PASSO 3 — adapters/ e infrastructure/
- Gateways: ServiceOrderRepository com {{ORM}} (mapeamento separado do domínio, lock otimista, sequência anual do
  número); LogCustomerNotifier; JwtTrackingTokenIssuer; CustomerLookup e CatalogLookup/StockMovements chamando a aplicação
  dos módulos customers e catalog (nunca seus domínios).
- Controllers + presenters + DTOs (class-validator) conforme o contrato (rotas, códigos, Problem Details, OpenAPI com
  exemplos); rotas /tracking validam o token de cliente (aud=customer, serviceOrderId) e NÃO passam pelo guard
  administrativo.
- Testes de integração (Testcontainers + supertest): fluxo completo criar → diagnosis → itens → quote/send →
  tracking approve (estoque baixa) → complete → deliver → status-history → metrics; 401/403/404/409/422 relevantes.

Ao final: cobertura do módulo (meta ≥ 80 % linhas e branches em domain + application), endpoints marcados em
docs/06-entrega/checklist-de-entrega.md e pendências. Nome fora do glossário = pare e proponha a linha no glossário.
```
