# Contrato da API REST (v1)

> Referência humana do contrato — o **acordo antes de codar** entre F1 e F3. Com a ADR-005 (code-first, Aceita), o Swagger
> gerado pelo `@nestjs/swagger` (`/docs`, `/docs/openapi.json`) é a versão oficial depois que um endpoint existe;
> divergência é corrigida no código. Base: `http://localhost:8080/api/v1`. Rotas, campos e enums em **inglês** (ADR-013,
> glossário em `docs/ddd/linguagem-ubiqua.md`); mensagens de erro e `statusDescription` em português. JSON em
> `camelCase`, datas ISO-8601 UTC, dinheiro como número decimal com 2 casas (ex.: `330.00`).

## 1. Autenticação e autorização

| Tipo | Como | Onde |
|---|---|---|
| Equipe (administrativa) | `Authorization: Bearer <accessToken>` — JWT HS256 de `POST /auth/login`, `aud=api`, papéis `ATTENDANT`/`MECHANIC`/`MANAGER` (ADR-004) | Todas as rotas exceto públicas e `/tracking/**` |
| Cliente — login | `Authorization: Bearer <accessToken>` — mesmo login, papel `CUSTOMER` + claim `customerId` (ADR-011) | `/tracking/**` (todas as OS do cliente) |
| Cliente — token de acompanhamento | `Authorization: Bearer <trackingToken>` — JWT `aud=tracking`, `sub=serviceOrderId`, 7 dias, gerado em `POST /service-orders/{id}/quote/send` (ADR-011) | `/tracking/service-orders/{id}/**` (só aquela OS) |
| Pública | — | `POST /auth/login`, `GET /health`, `GET /ready`, `/docs` (Swagger, só em dev) |

Papéis (`Role`): `ATTENDANT` · `MECHANIC` · `MANAGER` (inclui tudo da equipe) · `CUSTOMER` (só `/tracking/**`; 403 nas
rotas administrativas). Notação abaixo: **A** attendant, **M** mechanic, **G** manager, **C** cliente (token de
acompanhamento **ou** login `CUSTOMER`), **C(login)** só login `CUSTOMER`, **P** público.

## 2. Convenções

- Criação: `201 Created` + header `Location` + corpo do recurso.
- Ações de negócio (transições): `POST /resource/{id}/action` → `200` com o recurso atualizado.
- Listagens: `?page=0&size=20&sort=field,asc` → `{ "items": [...], "page": 0, "size": 20, "total": 57 }`.
- Remoção lógica: `DELETE` → `204`.
- Concorrência: `If-Match: <version>` opcional; conflito → `409`.
- Idempotência de transições: repetir uma ação já aplicada → `409` (transição inválida).

## 3. Endpoints

### 3.1 Identidade (`identity`)

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/auth/login` | P | `{ "email", "password" }` | `200 { "accessToken", "tokenType": "Bearer", "expiresIn": 3600, "roles": ["MANAGER"] }` (cliente: `"roles": ["CUSTOMER"]`) · `401` genérico |
| POST | `/auth/refresh` | portador | `{ "refreshToken" }` | (Could) |
| POST | `/users` | G (equipe) · A,G (papel `CUSTOMER`) | `{ "name", "email", "password", "roles": ["MECHANIC"] }` ou `{ "name", "email", "password", "roles": ["CUSTOMER"], "customerId" }` | `201 User` · `404` cliente inexistente · `409` e-mail duplicado · `422` (Should; usuário `CUSTOMER` — ADR-011) |
| GET | `/users` · GET/PUT/DELETE `/users/{id}` | G | — | (Should) |
| GET | `/health` · `/ready` | P | — | `200 { "status": "UP" }` |

`User`: `{ "id", "name", "email", "roles", "customerId"?, "active", "createdAt" }` — nunca expõe `passwordHash`.

### 3.2 Cadastro — clientes e veículos (`customers`)

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/customers` | A,G | `{ "customerType": "INDIVIDUAL", "document": "52998224725", "name", "email", "phone" }` | `201 Customer` · `422` · `409` duplicado |
| GET | `/customers?document=&name=&page=&size=` | A,M,G | — | `200 Page<Customer>` |
| GET | `/customers/{id}` | A,M,G | — | `200 Customer` · `404` |
| PUT | `/customers/{id}` | A,G | `{ "name", "email", "phone" }` (documento imutável) | `200` |
| DELETE | `/customers/{id}` | G | — | `204` · `409` OS em aberto |
| GET | `/customers/{id}/vehicles` | A,M,G | — | `200 [Vehicle]` |
| POST | `/vehicles` | A,G | `{ "customerId", "licensePlate": "ABC1D23", "brand", "model", "year": 2022, "color" }` | `201` · `422` · `409` |
| GET | `/vehicles?licensePlate=` · `/vehicles/{id}` | A,M,G | — | `200` |
| PUT | `/vehicles/{id}` | A,G (placa: G) | `{ "brand", "model", "year", "color", "licensePlate"? }` | `200` |
| DELETE | `/vehicles/{id}` | G | — | `204` · `409` |

`Customer`: `{ "id", "customerType", "document", "formattedDocument", "name", "email", "phone", "active", "createdAt", "updatedAt" }`
`Vehicle`: `{ "id", "customerId", "licensePlate", "brand", "model", "year", "color", "active", "createdAt" }`

### 3.3 Catálogo e estoque (`catalog`)

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/services` | G | `{ "name", "description", "price": 120.00, "estimatedMinutes": 45 }` | `201` |
| GET | `/services?active=true&name=` · `/services/{id}` | A,M,G | — | `200` |
| PUT | `/services/{id}` | G | idem | `200` |
| DELETE | `/services/{id}` | G | — | `204` (inativa) |
| POST | `/parts` | G | `{ "sku", "name", "type": "PART", "unitOfMeasure": "UN", "unitPrice": 90.00, "minimumStock": 4 }` | `201` (estoque inicial 0) |
| GET | `/parts?active=true&sku=&name=&belowMinimum=` · `/parts/{id}` | A,M,G | — | `200 Part` (inclui `stockQuantity`, `reservedQuantity`, `availableQuantity`) |
| PUT | `/parts/{id}` | G | dados (não altera estoque) | `200` |
| DELETE | `/parts/{id}` | G | — | `204` (inativa) |
| POST | `/parts/{id}/stock-movements` | G | `{ "type": "INBOUND"\|"ADJUSTMENT", "quantity": 10, "reason" }` | `201 StockMovement` · `422` |
| GET | `/parts/{id}/stock-movements` | G | — | `200 [StockMovement]` (inclui `RESERVATION`/`OUTBOUND` geradas pelas OS) |

### 3.4 Atendimento — ordem de serviço (`service-orders`)

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/service-orders` | A,G | `{ "customerId"\|"customerDocument", "vehicleId"\|"licensePlate", "problemDescription", "requestedServices": [{ "serviceId", "quantity" }]? }` | `201 ServiceOrder` (status `RECEIVED`) · `404` cliente/veículo · `422` · `409` veículo não pertence ao cliente / OS aberta |
| GET | `/service-orders?status=&customerId=&vehicleId=&from=&to=&page=&size=` | A,M,G | — | `200 Page<ServiceOrderSummary>` |
| GET | `/service-orders/{id}` | A,M,G | — | `200 ServiceOrder` (completa) |
| GET | `/service-orders/{id}/status-history` | A,M,G | — | `200 [StatusHistoryEntry]` |
| POST | `/service-orders/{id}/diagnosis` | M,G | — | `200` (→ `IN_DIAGNOSIS`) · `409` |
| POST | `/service-orders/{id}/items/services` | M,G | `{ "serviceId", "quantity": 1 }` | `201 ServiceOrder` (orçamento recalculado) · `409` status · `422` |
| DELETE | `/service-orders/{id}/items/services/{itemId}` | M,G | — | `200 ServiceOrder` |
| POST | `/service-orders/{id}/items/parts` | M,G | `{ "partId", "quantity": 2 }` | `201` · `422 estoque insuficiente` / peça inativa (ADR-012) · `409` |
| DELETE | `/service-orders/{id}/items/parts/{itemId}` | M,G | — | `200` |
| GET | `/service-orders/{id}/quote` | A,M,G | — | `200 Quote` |
| POST | `/service-orders/{id}/quote/send` | M,G | — | `200 { ...ServiceOrder, "tracking": { "url", "token" (só em dev) } }` (→ `AWAITING_APPROVAL`; token de acompanhamento gerado e "enviado") · `422` sem itens · `409` |
| POST | `/service-orders/{id}/complete` | M,G | — | `200` (→ `COMPLETED`; **baixa** as peças reservadas — `OUTBOUND`) · `409` |
| POST | `/service-orders/{id}/deliver` | A,G | — | `200` (→ `DELIVERED`) · `409` |
| POST | `/service-orders/{id}/cancel` | G | `{ "reason" }` | `200` (→ `CANCELLED`; só em `RECEIVED`/`IN_DIAGNOSIS`/`AWAITING_APPROVAL` — ADR-010) · `409` |

`ServiceOrder` (completa):

```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "number": "OS-2026-000042", "status": "AWAITING_APPROVAL",
  "customer": { "id": "…", "name": "Maria Silva", "document": "52998224725" },
  "vehicle": { "id": "…", "licensePlate": "ABC1D23", "brand": "Fiat", "model": "Argo", "year": 2022 },
  "problemDescription": "barulho ao frear",
  "serviceItems": [ { "id": "…", "serviceId": "…", "name": "Troca de pastilhas", "unitPrice": 150.00, "quantity": 1, "subtotal": 150.00 } ],
  "partItems": [ { "id": "…", "partId": "…", "name": "Pastilha de freio", "unitPrice": 90.00, "quantity": 2, "subtotal": 180.00 } ],
  "quote": { "totalAmount": 330.00, "status": "SENT", "sentAt": "2026-10-05T14:30:00Z", "respondedAt": null },
  "milestones": { "receivedAt": "…", "diagnosisStartedAt": "…", "quoteSentAt": "…", "executionStartedAt": null, "completedAt": null, "deliveredAt": null },
  "cancellationReason": null,
  "version": 5, "createdAt": "…", "updatedAt": "…"
}
```

### 3.5 Acompanhamento do cliente (ADR-011) — `/tracking`

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| GET | `/tracking/service-orders/{id}` | C | — | `200 Tracking` · `401` credencial inválida/expirada · `404` OS inexistente **ou de outro cliente** |
| POST | `/tracking/service-orders/{id}/quote/approve` | C | — | `200 Tracking` (→ `IN_PROGRESS`; **reserva** as peças — `RESERVATION`) · `409` · `422 estoque insuficiente` (disponibilidade mudou; OS continua `AWAITING_APPROVAL`) |
| POST | `/tracking/service-orders/{id}/quote/reject` | C | `{ "reason" }` | `200 Tracking` (→ `CANCELLED`, ADR-010) · `409` |
| GET | `/tracking/service-orders?status=&page=&size=` | C(login) | — | `200 Page<TrackingSummary>` — as OS do `customerId` do token (Should) |

`Tracking`:

```json
{
  "number": "OS-2026-000042", "status": "AWAITING_APPROVAL", "statusDescription": "Aguardando sua aprovação do orçamento",
  "vehicle": { "licensePlate": "ABC1***", "brand": "Fiat", "model": "Argo" },
  "customer": { "name": "Maria Silva", "document": "***.982.247-**" },
  "quote": { "totalAmount": 330.00, "status": "SENT", "items": [ { "description": "Troca de pastilhas", "quantity": 1, "subtotal": 150.00 }, { "description": "Pastilha de freio", "quantity": 2, "subtotal": 180.00 } ] },
  "timeline": [ { "status": "RECEIVED", "at": "…" }, { "status": "IN_DIAGNOSIS", "at": "…" }, { "status": "AWAITING_APPROVAL", "at": "…" } ],
  "nextAction": "aprovar ou recusar o orçamento"
}
```

`TrackingSummary`: `{ "id", "number", "status", "statusDescription", "vehicle": { "licensePlate" (mascarada), "brand", "model" }, "quote": { "totalAmount", "status" }, "receivedAt" }`.

### 3.6 Métricas

| Método | Rota | Acesso | Response |
|---|---|---|---|
| GET | `/metrics/average-execution-time?from=&to=&serviceId=` | G (A,M leitura) | `200 { "period": { "from", "to" }, "averageMinutes": 90.0, "serviceOrderCount": 2, "byService": [ { "serviceId", "name", "averageMinutes", "estimatedMinutes", "serviceOrderCount" } ] }` |
| GET | `/metrics/summary` | G | `200 { "byStatus": { "RECEIVED": 3, "IN_DIAGNOSIS": 1, "CANCELLED": 0, … } }` (Could) |

## 4. Códigos de status

| Código | Quando |
|---|---|
| 200 / 201 / 204 | sucesso / criado / removido |
| 400 | JSON malformado, parâmetro inválido |
| 401 | sem token, token inválido/expirado (equipe, cliente ou acompanhamento) |
| 403 | papel insuficiente (inclui `CUSTOMER` em rota administrativa e JWT de equipe em `/tracking/**`) |
| 404 | recurso inexistente **ou** não pertence ao solicitante (cliente) |
| 409 | conflito de estado: transição inválida, duplicidade, versão desatualizada, OS em aberto |
| 422 | validação de negócio: CPF/CNPJ/placa inválidos, estoque insuficiente (na inclusão **e** na aprovação), peça/serviço inativo, orçamento sem itens |
| 500 | erro inesperado (sem detalhes internos) |

## 5. Formato de erro (único para toda a API)

```json
{
  "type": "https://oficina.local/errors/validation",
  "title": "Dados inválidos",
  "status": 422,
  "detail": "documento inválido",
  "instance": "/api/v1/customers",
  "errors": [ { "field": "document", "message": "CPF com dígito verificador inválido" } ],
  "requestId": "…"
}
```

(Formato RFC 9457 *Problem Details*: chaves em inglês, textos de `title`/`detail`/`message` em português.)

## 6. Ordem de implementação sugerida (walking skeleton → completo)

1. `/health`, `/auth/login` (seed) → 2. `/customers`, `/vehicles` → 3. `POST /service-orders`, `GET /service-orders/{id}` →
4. `/services`, `/parts`, movimentações → 5. diagnóstico + itens + orçamento → 6. enviar + acompanhamento por token +
aprovar (reserva) / recusar (cancela) → 7. finalizar (baixa) + entregar + histórico → 8. listagem com filtros + métricas →
9. usuários/papéis e login de cliente (Should) → 10. cancelar pelo gerente (Should).
