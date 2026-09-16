# Modelo de dados (PostgreSQL 16 — ADR-002 Aceita)

> Um *schema* por módulo. **Sem chaves estrangeiras entre módulos** (apenas colunas de referência com índice) — o que
> permite separar os bancos na Fase 4 sem migração de esquema. Dentro do módulo, FKs normais. Nomes em inglês,
> `snake_case` (ADR-013; glossário em `docs/03-ddd/linguagem-ubiqua.md`).

## 1. Diagrama ER

```mermaid
erDiagram
    CUSTOMERS {
        uuid id PK
        varchar customer_type "INDIVIDUAL | COMPANY"
        varchar document UK "so digitos (11 ou 14)"
        varchar name
        varchar email
        varchar phone
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    VEHICLES {
        uuid id PK
        uuid customer_id FK
        varchar license_plate UK "normalizada"
        varchar brand
        varchar model
        int year
        varchar color
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    SERVICES {
        uuid id PK
        varchar name UK
        text description
        numeric price "12,2"
        int estimated_minutes
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    PARTS {
        uuid id PK
        varchar sku UK
        varchar name
        varchar type "PART | SUPPLY"
        varchar unit_of_measure
        numeric unit_price "12,2"
        numeric stock_quantity "10,3 >= 0"
        numeric reserved_quantity "10,3 >= 0"
        numeric minimum_stock "10,3"
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    STOCK_MOVEMENTS {
        uuid id PK
        uuid part_id FK
        varchar type "INBOUND | OUTBOUND | RESERVATION | RELEASE | ADJUSTMENT"
        numeric quantity "10,3"
        uuid service_order_id "ref. service_orders (sem FK)"
        varchar reason
        uuid user_id "ref. identity (sem FK)"
        timestamptz occurred_at
    }
    SERVICE_ORDERS {
        uuid id PK
        varchar number UK "OS-AAAA-NNNNNN"
        uuid customer_id "ref. customers (sem FK)"
        uuid vehicle_id "ref. customers (sem FK)"
        text problem_description
        varchar status "RECEIVED ... DELIVERED | CANCELLED"
        numeric quote_total_amount "12,2"
        varchar quote_status "PENDING | SENT | APPROVED | REJECTED"
        timestamptz quote_sent_at
        timestamptz quote_responded_at
        varchar rejection_or_cancellation_reason
        timestamptz received_at
        timestamptz diagnosis_started_at
        timestamptz execution_started_at
        timestamptz completed_at
        timestamptz delivered_at
        uuid created_by "ref. identity (sem FK)"
        int version "lock otimista"
        timestamptz created_at
        timestamptz updated_at
    }
    SERVICE_ORDER_SERVICE_ITEMS {
        uuid id PK
        uuid service_order_id FK
        uuid service_id "ref. catalog (sem FK)"
        varchar name_snapshot
        numeric price_snapshot "12,2"
        int quantity
    }
    SERVICE_ORDER_PART_ITEMS {
        uuid id PK
        uuid service_order_id FK
        uuid part_id "ref. catalog (sem FK)"
        varchar name_snapshot
        numeric unit_price_snapshot "12,2"
        numeric quantity "10,3"
    }
    SERVICE_ORDER_STATUS_HISTORY {
        uuid id PK
        uuid service_order_id FK
        varchar from_status
        varchar to_status
        varchar actor "user id | CUSTOMER | SYSTEM"
        varchar reason
        timestamptz occurred_at
    }
    TRACKING_TOKENS {
        uuid id PK
        uuid service_order_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
    }
    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar roles "ATTENDANT,MECHANIC,MANAGER"
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    CUSTOMERS ||--o{ VEHICLES : owns
    PARTS ||--o{ STOCK_MOVEMENTS : records
    SERVICE_ORDERS ||--o{ SERVICE_ORDER_SERVICE_ITEMS : contains
    SERVICE_ORDERS ||--o{ SERVICE_ORDER_PART_ITEMS : contains
    SERVICE_ORDERS ||--o{ SERVICE_ORDER_STATUS_HISTORY : transitions
    SERVICE_ORDERS ||--o{ TRACKING_TOKENS : issues
    CUSTOMERS }o..o{ SERVICE_ORDERS : "referencia por id"
    VEHICLES }o..o{ SERVICE_ORDERS : "referencia por id"
    SERVICES }o..o{ SERVICE_ORDER_SERVICE_ITEMS : "snapshot"
    PARTS }o..o{ SERVICE_ORDER_PART_ITEMS : "snapshot"
```

`TRACKING_TOKENS` só existe se a ADR-011 escolher tokens **opacos** persistidos; com JWT assinado (recomendado)
a tabela é opcional (útil para revogação — Could).

## 2. Schemas por módulo

| Schema | Tabelas |
|---|---|
| `customers` | `customers`, `vehicles` |
| `catalog` | `services`, `parts`, `stock_movements` |
| `service_orders` | `service_orders`, `service_order_service_items`, `service_order_part_items`, `service_order_status_history`, `tracking_tokens`, `service_order_number_seq` (sequência anual) |
| `identity` | `users` |

## 3. Constraints que protegem invariantes (defesa em profundidade)

| Tabela | Constraint |
|---|---|
| `customers` | `UNIQUE (document) WHERE active` (índice parcial) · `CHECK (customer_type IN ('INDIVIDUAL','COMPANY'))` · `CHECK (length(document) IN (11,14))` |
| `vehicles` | `UNIQUE (license_plate) WHERE active` · `CHECK (year BETWEEN 1900 AND 2100)` |
| `parts` | `CHECK (stock_quantity >= 0)` · `CHECK (reserved_quantity >= 0 AND reserved_quantity <= stock_quantity)` · `CHECK (unit_price >= 0)` |
| `stock_movements` | `CHECK (quantity > 0)` · `CHECK (type IN (...))` |
| `service_orders` | `CHECK (status IN (...))` · `CHECK (quote_total_amount >= 0)` · `UNIQUE (number)` · índice parcial "1 OS aberta por veículo" (Should): `UNIQUE (vehicle_id) WHERE status NOT IN ('DELIVERED','CANCELLED')` |
| `service_order_*_items` | `CHECK (quantity > 0)` |
| `service_order_status_history` | índice `(service_order_id, occurred_at)` |
| `users` | `UNIQUE (email)` |

## 4. Consultas de leitura relevantes

**Tempo médio de execução (geral, período):**

```sql
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - execution_started_at)) / 60.0) AS average_minutes,
       COUNT(*) AS service_order_count
FROM service_orders.service_orders
WHERE completed_at IS NOT NULL
  AND execution_started_at IS NOT NULL
  AND completed_at BETWEEN :from AND :to;
```

**Tempo médio por serviço (OS que contêm o serviço):**

```sql
SELECT i.service_id, i.name_snapshot,
       AVG(EXTRACT(EPOCH FROM (o.completed_at - o.execution_started_at)) / 60.0) AS average_minutes,
       COUNT(DISTINCT o.id) AS service_order_count
FROM service_orders.service_orders o
JOIN service_orders.service_order_service_items i ON i.service_order_id = o.id
WHERE o.completed_at IS NOT NULL AND o.execution_started_at IS NOT NULL
  AND o.completed_at BETWEEN :from AND :to
GROUP BY i.service_id, i.name_snapshot;
```

**Fila por status:** `SELECT ... FROM service_orders.service_orders WHERE status = :status ORDER BY received_at`.

## 5. Dados de demonstração (seed)

- 1 usuário por papel (`manager@oficina.local`, `mechanic@…`, `attendant@…`) com senhas via env.
- 3 clientes (2 PF, 1 PJ) com documentos fictícios válidos; 4 veículos (2 placas antigas, 2 Mercosul).
- 6 serviços (troca de óleo, alinhamento, balanceamento, troca de pastilhas, revisão, diagnóstico eletrônico).
- 8 peças/insumos com estoque e mínimo; 2 com estoque baixo para demonstrar alerta.
- 4 OS em status diferentes, incluindo 2 **finalizadas** (para o tempo médio ≠ null) e 1 aguardando aprovação (para
  demonstrar a aprovação ao vivo no vídeo).

## 6. Migrações

Versionadas na ferramenta escolhida para o NestJS (decisão leve pendente de F1/F3: **TypeORM migrations** ou **Prisma
Migrate** — ver ADR-001, seção *Consequências*). Convenção de nomes: `001_schemas`, `002_customers`, `003_catalog`,
`004_service_orders`, `005_identity`, `900_seed_dev` (somente em `APP_ENV=dev`).
