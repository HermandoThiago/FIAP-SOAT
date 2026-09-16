# Visão geral da arquitetura (Fase 1 — monólito modular em Clean Architecture)

> Diagramas no modelo **C4** (contexto → contêineres → componentes) + a organização em camadas pedida no vídeo.
> Decisões aceitas: NestJS + TypeScript (ADR-001), PostgreSQL (ADR-002), **Clean Architecture completa** (ADR-003),
> código em inglês (ADR-013). Identificadores conforme `docs/03-ddd/linguagem-ubiqua.md`.

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
    CL -- "API de acompanhamento (/tracking)<br/>token de acompanhamento" --> SGO
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
        MIG["Migrações + seed<br/>[job na subida]"]:::cont
    end
    SW["Swagger UI<br/>/docs"]:::externo
    U -- "HTTPS/JSON" --> API
    U -- "navegador" --> SW --> API
    API -- "SQL (ORM)" --> DB
    MIG -- "aplica migrações e dados de demo" --> DB
```

## 3. C4 — Nível 3: Componentes da API (módulos por contexto delimitado, camadas da Clean Architecture)

```mermaid
flowchart TB
    classDef ad fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef app fill:#fff9c4,stroke:#f9a825,color:#000
    classDef dom fill:#ffe0b2,stroke:#ef6c00,color:#000
    classDef inf fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef shared fill:#eeeeee,stroke:#616161,color:#000

    subgraph API["API monolítica (NestJS)"]
        direction TB
        subgraph SH["shared"]
            direction LR
            AUTH["JWT guard + Roles<br/>(adapters)"]:::shared
            ERR["ProblemDetails filter<br/>(422/401/403/404/409)"]:::shared
            VO["Money · Quantity · Document<br/>LicensePlate (domain)"]:::shared
            BUS["InProcessEventBus · Clock<br/>IdGenerator · UnitOfWork (infrastructure)"]:::shared
        end
        subgraph M1["módulo customers"]
            direction TB
            A1["Controllers + Presenters<br/>/customers /vehicles"]:::ad --> U1["Use cases<br/>RegisterCustomer · RegisterVehicle …"]:::app --> D1["Customer · Vehicle"]:::dom
            U1 --> G1["Gateways: repositories<br/>(ORM ↔ domínio)"]:::inf
        end
        subgraph M2["módulo catalog"]
            direction TB
            A2["Controllers + Presenters<br/>/services /parts<br/>/parts/{id}/stock-movements"]:::ad --> U2["Use cases<br/>RecordStockInbound · WithdrawStock …"]:::app --> D2["Service · Part<br/>StockMovement"]:::dom
            U2 --> G2["Gateways: repositories"]:::inf
        end
        subgraph M3["módulo service-orders (core)"]
            direction TB
            A3["Controllers + Presenters<br/>/service-orders /tracking /metrics"]:::ad --> U3["Use cases<br/>CreateServiceOrder · AddServiceItem · SendQuote<br/>ApproveQuote · CompleteExecution · RegisterDelivery"]:::app --> D3["ServiceOrder · Quote<br/>ServiceOrderStatus · StatusHistory"]:::dom
            U3 --> G3["Gateways: repository · LogCustomerNotifier<br/>JwtTrackingTokenIssuer · CustomerLookup · CatalogLookup"]:::inf
        end
        subgraph M4["módulo identity"]
            direction TB
            A4["AuthController · UsersController"]:::ad --> U4["AuthenticateUser<br/>IssueAccessToken"]:::app --> D4["User · Role"]:::dom
            U4 --> G4["Gateways: repository<br/>BcryptPasswordHasher · JwtTokenService"]:::inf
        end
    end
    G3 -- "porta CustomerLookup" --> U1
    G3 -- "portas CatalogLookup /<br/>StockMovements" --> U2
    AUTH -.-> A1 & A2 & A3 & A4
```

## 4. Camadas do monólito (o que dizer no vídeo)

| Camada (Clean Architecture) | Pasta | Responsabilidade | Depende de | Nunca depende de |
|---|---|---|---|---|
| **Entities** | `domain/` | Agregados, entidades, value objects, regras/invariantes, eventos de domínio, interfaces de repositório | nada (puro TypeScript) | Nest, ORM, HTTP |
| **Use Cases** | `application/` | Um caso de uso por comando/consulta; input/output boundaries e request/response models; portas de saída; transação | `domain` | Framework web/ORM |
| **Interface Adapters** | `adapters/` | Controllers (HTTP → request model), presenters (response model → DTO), gateways (implementam repositórios/portas mapeando ORM ↔ domínio), DTOs com validação sintática, OpenAPI | `application`, `domain` | `infrastructure` de outros módulos |
| **Frameworks & Drivers** | `infrastructure/` | Módulo Nest e DI, entidades do ORM, migrações, config, Swagger, servidor HTTP | tudo (camada mais externa) | — |

Regra de dependência: **de fora para dentro**. O domínio é testável sem banco e sem HTTP — é o que faz a cobertura de
80 % nos módulos críticos ser barata. A diferença prática para a hexagonal (que a disciplina da Fase 1 ensina) é que a
Clean explicita **presenters** e **boundaries**: o controller depende da interface do caso de uso, o caso de uso devolve um
modelo de resposta, e o presenter é o único que conhece o JSON — e é exatamente o conteúdo da Fase 2, já adiantado.

## 5. Fluxo de uma requisição (exemplo: aprovar orçamento)

```mermaid
flowchart LR
    R["POST /tracking/service-orders/{id}/quote/approve<br/>Bearer trackingToken"] --> F["Tracking guard: valida token<br/>(aud=customer, serviceOrderId)"]
    F --> C["TrackingController<br/>HTTP → ApproveQuoteRequest"]
    C --> U["ApproveQuoteUseCase<br/>(UnitOfWork)"]
    U --> D["ServiceOrder.approveQuote()<br/>invariantes · histórico · evento"]
    U --> E["Porta StockMovements.withdraw(partItems)"]
    E --> P["Part.withdraw() · StockMovement"]
    U --> S["Repositórios salvam<br/>commit único"]
    S --> N["QuoteApproved →<br/>LogCustomerNotifier"]
    U --> O["ApproveQuoteResponse → TrackingPresenter<br/>→ 200 TrackingDto"]
```

## 6. Decisões transversais

| Tema | Decisão |
|---|---|
| Configuração | 12-factor: tudo por variáveis de ambiente (`DB_URL`, `JWT_SECRET`, `APP_ENV`, `ADMIN_EMAIL/PASSWORD`); `.env.example` versionado; schema validado na subida |
| Erros | Problem Details (`contrato-api.md` §5); erros de domínio → 409/422; nunca stack trace |
| Logs | Estruturados (JSON), com `requestId`, sem PII (máscara central em `shared/adapters`) |
| Health | `GET /health` (liveness) e `GET /ready` (checa banco) — já pensando em Kubernetes |
| Transações | Uma por caso de uso (`UnitOfWork`); eventos de domínio processados dentro da transação na Fase 1 |
| Tempo | Porta `Clock` injetável (testes determinísticos); UTC no banco |
| Ids | ADR-009 (em votação; proposta: UUID v7 gerado na aplicação) |
| Idempotência | Comandos de transição são idempotentes por estado (aprovar duas vezes → 409 na segunda) |
| Idioma | Código/API em inglês; textos ao usuário e docs em português (ADR-013) |
