# Visão geral da arquitetura (Fase 1 — monólito modular em camadas clássicas)

> Diagramas no modelo **C4** (contexto → contêineres → componentes) + a organização em camadas pedida no vídeo.
> Decisões aceitas: NestJS + TypeScript (ADR-001), PostgreSQL + Prisma (ADR-002, E-17), **camadas clássicas dentro de
> módulos por contexto** (ADR-003, revotada em 22/09/2026), código em inglês (ADR-013), JWT próprio (ADR-004), token de
> acompanhamento + login de cliente (ADR-011), reserva na aprovação + baixa na finalização (ADR-012). Identificadores
> conforme `docs/03-ddd/linguagem-ubiqua.md`.

## 1. C4 — Nível 1: Contexto

```mermaid
flowchart LR
    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff
    classDef sistema fill:#1168bd,stroke:#0b4884,color:#fff
    classDef externo fill:#999999,stroke:#6b6b6b,color:#fff

    AT([Atendente<br/>abre OS, registra entrega]):::pessoa
    ME([Mecânico<br/>diagnostica, orça, executa]):::pessoa
    GE([Gerente<br/>catálogo, estoque, métricas]):::pessoa
    CL([Cliente PF/PJ<br/>acompanha e aprova]):::pessoa
    SGO["Sistema de Gestão da Oficina<br/>back-end monolítico · APIs REST"]:::sistema
    NOT[("Canal de notificação<br/>(simulado na Fase 1)")]:::externo

    AT -- "APIs administrativas<br/>JWT" --> SGO
    ME -- "APIs administrativas<br/>JWT" --> SGO
    GE -- "APIs administrativas<br/>JWT" --> SGO
    CL -- "API de acompanhamento (/tracking)<br/>token de acompanhamento ou login CUSTOMER" --> SGO
    SGO -- "envia orçamento /<br/>avisos" --> NOT
```

## 2. C4 — Nível 2: Contêineres (o que sobe no `docker compose up`)

```mermaid
flowchart TB
    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff
    classDef cont fill:#438dd5,stroke:#2e6295,color:#fff
    classDef externo fill:#999999,stroke:#6b6b6b,color:#fff

    U([Atendente · Mecânico · Gerente · Cliente]):::pessoa
    subgraph Compose["docker-compose.yml"]
        API["API monolítica<br/>[contêiner: Node 22 · NestJS]<br/>REST + Swagger UI + JWT<br/>porta 8080"]:::cont
        DB[("PostgreSQL 16<br/>schemas por módulo · volume nomeado")]:::cont
        MIG["prisma migrate deploy + seed<br/>[job na subida]"]:::cont
    end
    SW["Swagger UI<br/>/docs"]:::externo
    U -- "HTTPS/JSON" --> API
    U -- "navegador" --> SW --> API
    API -- "SQL (Prisma)" --> DB
    MIG -- "aplica migrações e dados de demo" --> DB
```

## 3. C4 — Nível 3: Componentes da API (módulos por contexto delimitado, camadas clássicas)

```mermaid
flowchart TB
    classDef ctrl fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef svc fill:#fff9c4,stroke:#f9a825,color:#000
    classDef dom fill:#ffe0b2,stroke:#ef6c00,color:#000
    classDef repo fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef shared fill:#eeeeee,stroke:#616161,color:#000

    subgraph API["API monolítica (NestJS)"]
        direction TB
        subgraph SH["shared"]
            direction LR
            AUTH["JwtAuthGuard · TrackingAuthGuard<br/>@Roles()"]:::shared
            ERR["ProblemDetailsFilter<br/>(422/401/403/404/409)"]:::shared
            VO["Money · Quantity · Document<br/>LicensePlate (domain)"]:::shared
            PRS["PrismaService · Clock<br/>IdGenerator · DomainEventPublisher"]:::shared
        end
        subgraph M1["módulo customers"]
            direction TB
            C1["Controllers + DTOs<br/>/customers /vehicles"]:::ctrl --> S1["CustomersService · VehiclesService<br/>(exportados)"]:::svc --> D1["Customer · Vehicle"]:::dom
            S1 --> R1["CustomerRepository · VehicleRepository<br/>(Prisma ↔ agregado)"]:::repo
        end
        subgraph M2["módulo catalog"]
            direction TB
            C2["Controllers + DTOs<br/>/services /parts<br/>/parts/{id}/stock-movements"]:::ctrl --> S2["CatalogService · PartsService<br/>(exportados)"]:::svc --> D2["Service · Part<br/>StockMovement"]:::dom
            S2 --> R2["ServiceRepository · PartRepository"]:::repo
        end
        subgraph M3["módulo service-orders (core)"]
            direction TB
            C3["Controllers + DTOs<br/>/service-orders /tracking /metrics"]:::ctrl --> S3["ServiceOrdersService · TrackingService<br/>MetricsService · LogCustomerNotifier"]:::svc --> D3["ServiceOrder · Quote<br/>ServiceOrderStatus · StatusHistory"]:::dom
            S3 --> R3["ServiceOrderRepository"]:::repo
        end
        subgraph M4["módulo identity"]
            direction TB
            C4["AuthController · UsersController"]:::ctrl --> S4["AuthService · UsersService<br/>TrackingTokenService (exportados)"]:::svc --> D4["User · Role"]:::dom
            S4 --> R4["UserRepository"]:::repo
        end
    end
    S3 -- "CustomersService / VehiclesService" --> S1
    S3 -- "CatalogService / PartsService<br/>(reserva · baixa)" --> S2
    S3 -- "TrackingTokenService" --> S4
    S4 -- "CustomersService<br/>(usuário CUSTOMER)" --> S1
    R1 & R2 & R3 & R4 --> PRS
    AUTH -.-> C1 & C2 & C3 & C4
```

## 4. Camadas do monólito (o que dizer no vídeo)

| Camada | Pasta | Responsabilidade | Depende de | Nunca depende de |
|---|---|---|---|---|
| **Apresentação** | `controllers/` + `dto/` | Rotas REST, códigos HTTP, guards e papéis, DTOs com validação sintática e `fromDomain()`, OpenAPI | `services/`, `domain/` (VOs/enums) | `repositories/`, Prisma |
| **Aplicação** | `services/` | Um método por caso de uso: carrega agregados, executa comandos do domínio, coordena a transação e chama serviços exportados de outros módulos | `domain/`, `repositories/`, serviços exportados | `controllers/` |
| **Domínio** | `domain/` | Agregados, entidades, value objects, regras/invariantes, transições, eventos de domínio | nada (puro TypeScript) | Nest, Prisma, HTTP |
| **Persistência** | `repositories/` | Consultas e mapeamento registro ↔ agregado sobre o `PrismaService`; lock otimista | `domain/`, `shared/prisma` | `services/`, `controllers/` |

Regra: **controller → service → repository, todos sobre o domínio; ninguém pula camada e o domínio não conhece
framework.** O domínio rico (invariantes no agregado) é testável sem banco e sem HTTP — é o que faz a cobertura de
80 % nos módulos críticos ser barata e o que o vídeo mostra como "elementos de DDD". A disciplina da Fase 1 ensina
hexagonal e a Fase 2 pede Clean Architecture: o que já está pronto para isso é a modularidade por contexto, o domínio sem
framework e a fronteira entre módulos por serviço exportado — na Fase 2, os services viram casos de uso + portas sem
mexer no domínio (`evolucao-fases.md`).

## 5. Fluxo de uma requisição (exemplo: aprovar orçamento)

```mermaid
flowchart LR
    R["POST /tracking/service-orders/{id}/quote/approve<br/>Bearer trackingToken ou JWT CUSTOMER"] --> F["TrackingAuthGuard: valida credencial<br/>(aud=tracking ou papel CUSTOMER)"]
    F --> C["TrackingController<br/>HTTP → trackingService.approveQuote(id, credential)"]
    C --> T["TrackingService<br/>propriedade da OS (senão 404)"]
    T --> U["ServiceOrdersService.approveQuote<br/>(prisma.$transaction)"]
    U --> D["ServiceOrder.approveQuote()<br/>invariantes · histórico · evento"]
    U --> E["PartsService.reserveForServiceOrder(partItems)"]
    E --> P["Part.reserve() · StockMovement RESERVATION<br/>(sem disponibilidade → 422 e rollback)"]
    U --> S["Repositórios salvam<br/>commit único"]
    S --> N["QuoteApproved →<br/>LogCustomerNotifier"]
    U --> O["TrackingResponseDto.fromDomain()<br/>→ 200"]
```

## 6. Decisões transversais

| Tema | Decisão |
|---|---|
| Configuração | 12-factor: tudo por variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `APP_ENV`, `ADMIN_EMAIL/PASSWORD`); `.env.example` versionado; schema validado na subida |
| Erros | Problem Details (`contrato-api.md` §5); erros de domínio → 409/422; nunca stack trace |
| Logs | Estruturados (JSON), com `requestId`, sem PII (máscara central em `shared/http`) |
| Health | `GET /health` (liveness) e `GET /ready` (checa banco) — já pensando em Kubernetes |
| Transações | Uma por método de serviço que muda estado (`prisma.$transaction`); a aprovação (reserva) e a finalização (baixa) tocam dois módulos na mesma transação; eventos de domínio processados dentro da transação na Fase 1 |
| Tempo | `Clock` injetável (testes determinísticos); UTC no banco |
| Ids | UUID v4 gerado na aplicação (`crypto.randomUUID()`), nunca pelo banco; número da OS por sequência anual (ADR-009) |
| Idempotência | Comandos de transição são idempotentes por estado (aprovar duas vezes → 409 na segunda) |
| Idioma | Código/API em inglês; textos ao usuário e docs em português (ADR-013) |
