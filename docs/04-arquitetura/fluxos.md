# Fluxos principais — diagramas de sequência

> Um por bloco do vídeo. Participantes = camadas/módulos do monólito (ADR-003, camadas clássicas: controller → service →
> repository, sobre o domínio); identificadores em inglês (ADR-013), textos em português.

## 1. Criação da OS (com identificação do cliente por documento)

```mermaid
sequenceDiagram
    autonumber
    actor At as Atendente
    participant API as ServiceOrdersController
    participant SOS as ServiceOrdersService
    participant CUS as CustomersService / VehiclesService (módulo customers)
    participant OS as ServiceOrder (domain)
    participant REP as ServiceOrderRepository (Prisma)
    At->>API: POST /service-orders {customerDocument, licensePlate, problemDescription} + JWT
    API->>API: guard valida JWT (papel ATTENDANT+) e DTO (422)
    API->>SOS: create(dto, actor)
    SOS->>CUS: findByDocument(document)
    CUS-->>SOS: customer (ou 404)
    SOS->>CUS: findVehicleByLicensePlate(licensePlate)
    CUS-->>SOS: vehicle (ou 404)
    SOS->>SOS: veículo pertence ao cliente? OS aberta para o veículo? (409)
    SOS->>OS: create(id gerado, number gerado, customerId, vehicleId, problemDescription)
    OS-->>SOS: ServiceOrder RECEIVED + evento ServiceOrderReceived + histórico
    SOS->>REP: save(serviceOrder)
    REP-->>SOS: ok
    SOS-->>API: ServiceOrder → ServiceOrderResponseDto.fromDomain()
    API-->>At: 201 Location /service-orders/{id}
```

## 2. Diagnóstico, inclusão de itens e orçamento automático

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    participant API as ServiceOrdersController
    participant SOS as ServiceOrdersService
    participant PRT as PartsService (módulo catalog)
    participant OS as ServiceOrder (domain)
    Me->>API: POST /service-orders/{id}/diagnosis
    API->>SOS: startDiagnosis(id)
    SOS->>OS: startDiagnosis()
    OS-->>SOS: IN_DIAGNOSIS
    API-->>Me: 200
    Me->>API: POST /service-orders/{id}/items/parts {partId, quantity: 2}
    API->>SOS: addPartItem(id, partId, 2)
    SOS->>PRT: getPart(partId)
    PRT-->>SOS: {name, unitPrice, availableQuantity, active}
    SOS->>SOS: ativa? availableQuantity ≥ 2? (422 estoque insuficiente — ADR-012)
    SOS->>OS: addPartItem(snapshot{name, unitPrice}, 2)
    OS->>OS: status permite? recalcula quote (Σ itens)
    OS-->>SOS: ServiceOrder com quote 330.00 + evento QuoteRecalculated
    SOS-->>API: ServiceOrder → dto
    API-->>Me: 201 ServiceOrder (orçamento atualizado)
```

## 3. Envio do orçamento e aprovação pelo cliente (2 módulos, 1 transação — reserva de estoque)

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    actor Cl as Cliente
    participant API as Controllers (ServiceOrders / Tracking)
    participant SOS as ServiceOrdersService
    participant TOK as TrackingTokenService (identity, aud=tracking)
    participant NOT as CustomerNotifier (log)
    participant TRK as TrackingService
    participant OS as ServiceOrder (domain)
    participant PRT as PartsService (módulo catalog)
    Me->>API: POST /service-orders/{id}/quote/send
    API->>SOS: sendQuote(id)
    SOS->>OS: sendQuote()
    OS-->>SOS: AWAITING_APPROVAL, itens congelados
    SOS->>TOK: issue(serviceOrderId, exp 7d)
    TOK-->>SOS: trackingToken
    SOS->>NOT: notify(customer, trackingUrl)
    NOT-->>SOS: (log) "orçamento enviado"
    SOS-->>API: ServiceOrder + tracking{url, token(dev)}
    API-->>Me: 200
    Cl->>API: GET /tracking/service-orders/{id} (Bearer trackingToken ou JWT CUSTOMER)
    API->>TRK: getTracking(id, credential)
    TRK-->>API: propriedade ok → projeção mascarada (senão 404)
    API-->>Cl: 200 status + quote (statusDescription em português)
    Cl->>API: POST /tracking/service-orders/{id}/quote/approve
    API->>TRK: approveQuote(id, credential)
    TRK->>SOS: approveQuote(id, actor CUSTOMER)
    activate SOS
    SOS->>OS: approveQuote()
    OS-->>SOS: IN_PROGRESS + evento QuoteApproved
    SOS->>PRT: reserveForServiceOrder(partItems, serviceOrderId, tx)
    PRT-->>SOS: movimentações RESERVATION (ou 422 estoque insuficiente → rollback)
    SOS->>SOS: commit (ServiceOrder + estoque)
    deactivate SOS
    SOS-->>TRK: ServiceOrder
    TRK-->>API: TrackingResponseDto
    API-->>Cl: 200 IN_PROGRESS
```

Recusa (`POST …/quote/reject { reason }`) segue o mesmo caminho e leva a OS para `CANCELLED` sem efeito no estoque
(ADR-010): a reserva só existe depois da aprovação.

## 4. Execução, finalização (baixa de estoque), entrega e métrica

```mermaid
sequenceDiagram
    autonumber
    actor Me as Mecânico
    actor At as Atendente
    actor Ge as Gerente
    participant API as Controllers (ServiceOrders / Metrics)
    participant SOS as ServiceOrdersService
    participant OS as ServiceOrder (domain)
    participant PRT as PartsService (módulo catalog)
    participant MET as MetricsService (leitura)
    Me->>API: POST /service-orders/{id}/complete
    API->>SOS: complete(id)
    activate SOS
    SOS->>OS: complete()
    OS-->>SOS: COMPLETED (completedAt) + evento ExecutionCompleted
    SOS->>PRT: withdrawReservedForServiceOrder(partItems, serviceOrderId, tx)
    PRT-->>SOS: movimentações OUTBOUND (stockQuantity e reservedQuantity reduzidos)
    SOS->>SOS: commit
    deactivate SOS
    API-->>Me: 200 COMPLETED
    At->>API: POST /service-orders/{id}/deliver
    API->>SOS: deliver(id)
    SOS->>OS: deliver()
    OS-->>SOS: DELIVERED (deliveredAt), imutável
    API-->>At: 200 DELIVERED
    Ge->>API: GET /metrics/average-execution-time?from=&to=
    API->>MET: averageExecutionTime(period)
    MET-->>API: {averageMinutes: 90.0, serviceOrderCount: 2, byService: [...]}
    API-->>Ge: 200
```

## 5. Autenticação (equipe e cliente)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário (equipe ou cliente)
    participant API as AuthController
    participant AUT as AuthService
    participant REP as UserRepository
    participant H as bcrypt
    participant J as JwtService (HS256)
    U->>API: POST /auth/login {email, password}
    API->>AUT: login(email, password)
    AUT->>REP: findByEmail
    REP-->>AUT: user (ou não)
    AUT->>H: compare(password, passwordHash)
    H-->>AUT: ok / falha (401 genérico)
    AUT->>J: sign({sub, roles, iss, aud: api, customerId?}, exp 60min)
    J-->>AUT: accessToken
    AUT-->>API: token
    API-->>U: 200 {accessToken, expiresIn, roles}
    U->>API: GET /customers (Bearer)
    API->>API: JwtAuthGuard valida assinatura/exp/aud/roles → 200 / 401 / 403 (CUSTOMER em rota administrativa = 403)
```

## 6. Gestão de estoque (entrada; reserva e baixa vêm dos fluxos 3 e 4)

```mermaid
sequenceDiagram
    autonumber
    actor Ge as Gerente
    participant API as PartsController
    participant PRT as PartsService
    participant P as Part (domain)
    participant REP as PartRepository (Prisma)
    Ge->>API: POST /parts/{id}/stock-movements {type: INBOUND, quantity: 10}
    API->>PRT: recordInbound(id, 10, reason)
    PRT->>P: recordInbound(10)
    P->>P: stockQuantity += 10 e novo StockMovement(INBOUND)
    P-->>PRT: ok (+ evento StockInboundRecorded)
    PRT->>REP: save
    PRT-->>API: movimentação → dto
    API-->>Ge: 201
    Note over P: Reserva (RESERVATION): fluxo 3, na aprovação · Baixa (OUTBOUND): fluxo 4, na finalização — ADR-012
```
