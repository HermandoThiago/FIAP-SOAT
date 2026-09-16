# Fluxos principais — diagramas de sequência

> Um por bloco do vídeo. Participantes = camadas/módulos do monólito (ADR-003, Clean Architecture); identificadores em
> inglês (ADR-013), textos em português.

## 1. Criação da OS (com identificação do cliente por documento)

```mermaid
sequenceDiagram
    autonumber
    actor At as Atendente
    participant API as ServiceOrdersController (adapter)
    participant UC as CreateServiceOrderUseCase (application)
    participant CAD as Porta CustomerLookup (módulo customers)
    participant OS as ServiceOrder (domain)
    participant REP as ServiceOrderRepository (gateway)
    At->>API: POST /service-orders {customerDocument, licensePlate, problemDescription} + JWT
    API->>API: valida JWT (papel ATTENDANT+) e DTO (422)
    API->>UC: execute(CreateServiceOrderRequest)
    UC->>CAD: findCustomerByDocument(document)
    CAD-->>UC: customer (ou 404)
    UC->>CAD: findVehicleByLicensePlate(licensePlate)
    CAD-->>UC: vehicle (ou 404)
    UC->>UC: veículo pertence ao cliente? (409 se não)
    UC->>OS: create(customerId, vehicleId, problemDescription, number gerado)
    OS-->>UC: ServiceOrder RECEIVED + evento ServiceOrderReceived + histórico
    UC->>REP: save(serviceOrder)
    REP-->>UC: ok
    UC-->>API: CreateServiceOrderResponse → presenter
    API-->>At: 201 Location /service-orders/{id}
```

## 2. Diagnóstico, inclusão de itens e orçamento automático

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    participant API as ServiceOrdersController
    participant UC as AddPartItemUseCase
    participant CAT as Porta CatalogLookup (módulo catalog)
    participant OS as ServiceOrder
    Me->>API: POST /service-orders/{id}/diagnosis
    API->>OS: startDiagnosis()
    OS-->>API: IN_DIAGNOSIS
    Me->>API: POST /service-orders/{id}/items/parts {partId, quantity: 2}
    API->>UC: execute
    UC->>CAT: getPart(partId)
    CAT-->>UC: {name, unitPrice, availableQuantity, active}
    UC->>UC: ativa? availableQuantity ≥ 2? (422 estoque insuficiente — ADR-012)
    UC->>OS: addPartItem(snapshot{name, unitPrice}, 2)
    OS->>OS: status permite? recalcula quote (Σ itens)
    OS-->>UC: ServiceOrder com quote 330.00 + evento QuoteRecalculated
    UC-->>API: response → presenter
    API-->>Me: 201 ServiceOrder (orçamento atualizado)
```

## 3. Envio do orçamento e aprovação pelo cliente (2 módulos, 1 transação)

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    actor Cl as Cliente
    participant API as Controllers (ServiceOrders / Tracking)
    participant ENV as SendQuoteUseCase
    participant TOK as TrackingTokenIssuer (aud=customer)
    participant NOT as CustomerNotifier (log)
    participant APR as ApproveQuoteUseCase (UnitOfWork)
    participant OS as ServiceOrder
    participant EST as Porta StockMovements (módulo catalog)
    Me->>API: POST /service-orders/{id}/quote/send
    API->>ENV: execute
    ENV->>OS: sendQuote()
    OS-->>ENV: AWAITING_APPROVAL, itens congelados
    ENV->>TOK: issue(serviceOrderId, exp 7d)
    TOK-->>ENV: trackingToken
    ENV->>NOT: notify(customer, trackingUrl)
    NOT-->>ENV: (log) "orçamento enviado"
    ENV-->>API: ServiceOrder + tracking{url, token(dev)}
    API-->>Me: 200
    Cl->>API: GET /tracking/service-orders/{id} (Bearer trackingToken)
    API-->>Cl: 200 status + quote (dados mascarados, statusDescription em português)
    Cl->>API: POST /tracking/service-orders/{id}/quote/approve
    API->>API: valida token (aud, serviceOrderId)
    API->>APR: execute
    activate APR
    APR->>OS: approveQuote()
    OS-->>APR: IN_PROGRESS + evento QuoteApproved
    APR->>EST: withdraw(partItems, serviceOrderId)
    EST-->>APR: movimentações OUTBOUND (ou falha → rollback)
    APR->>APR: commit (ServiceOrder + estoque)
    deactivate APR
    APR-->>API: response → TrackingPresenter
    API-->>Cl: 200 IN_PROGRESS
```

## 4. Execução, finalização, entrega e métrica

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    actor At as Atendente
    actor Ge as Gerente
    participant API as Controllers (ServiceOrders / Metrics)
    participant OS as ServiceOrder
    participant MET as CalculateAverageExecutionTimeUseCase (leitura)
    Me->>API: POST /service-orders/{id}/complete
    API->>OS: complete()
    OS-->>API: COMPLETED (completedAt) + evento ExecutionCompleted
    At->>API: POST /service-orders/{id}/deliver
    API->>OS: deliver()
    OS-->>API: DELIVERED (deliveredAt), imutável
    Ge->>API: GET /metrics/average-execution-time?from=&to=
    API->>MET: execute(period)
    MET-->>API: {averageMinutes: 90.0, serviceOrderCount: 2, byService: [...]}
    API-->>Ge: 200
```

## 5. Autenticação administrativa

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário admin
    participant API as AuthController
    participant AUT as AuthenticateUserUseCase
    participant REP as UserRepository
    participant H as PasswordHasher (bcrypt)
    participant J as JwtTokenService
    U->>API: POST /auth/login {email, password}
    API->>AUT: execute
    AUT->>REP: findByEmail
    REP-->>AUT: user (ou não)
    AUT->>H: verify(password, passwordHash)
    H-->>AUT: ok / falha (401 genérico)
    AUT->>J: issue(sub, roles, exp 60min)
    J-->>AUT: accessToken
    AUT-->>API: token
    API-->>U: 200 {accessToken, expiresIn}
    U->>API: GET /customers (Bearer)
    API->>API: guard valida assinatura/exp/roles → 200 / 401 / 403
```

## 6. Gestão de estoque (entrada e baixa)

```mermaid
sequenceDiagram
    autonumber
    actor Ge as Gerente
    participant API as PartsController
    participant UC as RecordStockInboundUseCase
    participant P as Part (domain)
    participant REP as PartRepository
    Ge->>API: POST /parts/{id}/stock-movements {type: INBOUND, quantity: 10}
    API->>UC: execute
    UC->>P: recordInbound(10)
    P->>P: stockQuantity += 10 e novo StockMovement(INBOUND)
    P-->>UC: ok (+ evento StockInboundRecorded)
    UC->>REP: save
    UC-->>API: movimentação → presenter
    API-->>Ge: 201
    Note over P: Baixa: ver fluxo 3 — política "sempre que o orçamento é aprovado"
```
