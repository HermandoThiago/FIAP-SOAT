# Visão geral da arquitetura (Fase 1 — monólito modular)

> Diagramas no modelo **C4** (contexto → contêineres → componentes) + a organização em camadas pedida no vídeo.
> Assume ADR-003 = monólito modular + hexagonal; se a votação escolher camadas clássicas, o nível 3 muda (o resto não).

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
    CL -- "API de acompanhamento<br/>token de acompanhamento" --> SGO
    SGO -- "envia orçamento /<br/>avisos" --> NOT
```

## 2. C4 — Nível 2: Contêineres (o que sobe no `docker compose up`)

```mermaid
flowchart TB
    classDef pessoa fill:#08427b,stroke:#052e56,color:#fff
    classDef cont fill:#438dd5,stroke:#2e6295,color:#fff
    classDef db fill:#438dd5,stroke:#2e6295,color:#fff
    classDef externo fill:#999999,stroke:#6b6b6b,color:#fff

    U([Atendente · Mecânico · Gerente · Cliente]):::pessoa
    subgraph Compose["docker-compose.yml"]
        API["API monolítica<br/>[contêiner: linguagem/framework da ADR-001]<br/>REST + Swagger UI + JWT<br/>porta 8080"]:::cont
        DB[("Banco de dados<br/>[contêiner: ADR-002]<br/>schemas por módulo · volume nomeado")]:::db
        MIG["Migrações + seed<br/>[job na subida]"]:::cont
    end
    SW["Swagger UI<br/>/swagger"]:::externo
    U -- "HTTPS/JSON" --> API
    U -- "navegador" --> SW --> API
    API -- "SQL (ORM/driver)" --> DB
    MIG -- "aplica migrações e dados de demo" --> DB
```

## 3. C4 — Nível 3: Componentes da API (módulos e camadas)

```mermaid
flowchart TB
    classDef in fill:#c8e6c9,stroke:#2e7d32,color:#000
    classDef app fill:#fff9c4,stroke:#f9a825,color:#000
    classDef dom fill:#ffe0b2,stroke:#ef6c00,color:#000
    classDef out fill:#e1bee7,stroke:#6a1b9a,color:#000
    classDef shared fill:#eeeeee,stroke:#616161,color:#000

    subgraph API["API monolítica"]
        direction TB
        subgraph SH["shared / infra"]
            direction LR
            AUTH["Filtro JWT<br/>+ autorização por papel"]:::shared
            ERR["Tratamento de erros<br/>(422/401/403/404/409)"]:::shared
            VO["Value objects<br/>Documento · Placa · Dinheiro"]:::shared
            BUS["Barramento de eventos<br/>em processo"]:::shared
            CFG["Config por env · logs<br/>mascarados · health"]:::shared
        end
        subgraph M1["módulo cadastro"]
            direction TB
            I1["REST: /clientes /veiculos"]:::in --> A1["Casos de uso<br/>CadastrarCliente…"]:::app --> D1["Cliente · Veiculo"]:::dom
            A1 --> O1["Repositórios (ORM)"]:::out
        end
        subgraph M2["módulo catalogo-estoque"]
            direction TB
            I2["REST: /servicos /pecas<br/>/pecas/{id}/movimentacoes"]:::in --> A2["Casos de uso<br/>RegistrarEntrada · BaixarEstoque…"]:::app --> D2["Servico · Peca<br/>MovimentacaoEstoque"]:::dom
            A2 --> O2["Repositórios (ORM)"]:::out
        end
        subgraph M3["módulo atendimento (core)"]
            direction TB
            I3["REST: /ordens-servico<br/>/acompanhamento /metricas"]:::in --> A3["Casos de uso<br/>CriarOS · IncluirItem · EnviarOrcamento<br/>AprovarOrcamento · Finalizar · Entregar"]:::app --> D3["OrdemDeServico · Orcamento<br/>StatusOS · Historico"]:::dom
            A3 --> O3["Repositórios · Notificador (log)<br/>Relógio · GeradorDeId"]:::out
        end
        subgraph M4["módulo identidade"]
            direction TB
            I4["REST: /auth /usuarios"]:::in --> A4["AutenticarUsuario<br/>EmitirToken"]:::app --> D4["Usuario · Papel"]:::dom
            A4 --> O4["Repositório · Hash · JWT"]:::out
        end
    end
    A3 -- "porta ConsultaCadastro" --> A1
    A3 -- "porta ConsultaCatalogo /<br/>MovimentacaoEstoque" --> A2
    AUTH -.-> I1 & I2 & I3 & I4
```

## 4. Camadas do monólito (o que dizer no vídeo)

| Camada | Responsabilidade | Depende de | Nunca depende de |
|---|---|---|---|
| **Interface (adapters/in)** | Controllers REST, DTOs de entrada/saída, validação sintática, OpenAPI, mapeamento de erros | Aplicação | Persistência |
| **Aplicação** | Casos de uso (um por comando), orquestração, transação, portas de entrada/saída (interfaces), publicação de eventos | Domínio | Framework web/ORM |
| **Domínio** | Agregados, entidades, value objects, regras/invariantes, eventos de domínio, interfaces de repositório | Nada (puro) | Qualquer framework |
| **Infraestrutura (adapters/out)** | Implementações: repositórios (ORM/SQL), JWT, hash, notificação (log), relógio, gerador de ids, config | Domínio/Aplicação (implementa as portas) | — |

Regra de dependência: **de fora para dentro** (interface → aplicação → domínio; infraestrutura implementa as
interfaces do domínio/aplicação). O domínio é testável sem banco e sem HTTP — é o que faz a cobertura de 80 % ser barata.

## 5. Fluxo de uma requisição (exemplo: aprovar orçamento)

```mermaid
flowchart LR
    R["POST /acompanhamento/ordens-servico/{id}/orcamento/aprovar<br/>Bearer token de acompanhamento"] --> F["Filtro: valida token<br/>(aud=cliente, osId)"]
    F --> C["Controller<br/>DTO → comando"]
    C --> U["Caso de uso AprovarOrcamento<br/>(transação)"]
    U --> D["OrdemDeServico.aprovarOrcamento()<br/>invariantes · histórico · evento"]
    U --> E["Porta MovimentacaoEstoque.baixar(itens)"]
    E --> P["Peca.baixar() · MovimentacaoEstoque"]
    U --> S["Repositórios salvam<br/>commit único"]
    S --> N["Evento OrcamentoAprovado →<br/>Notificador (log)"]
    S --> O["200 + acompanhamento atualizado"]
```

## 6. Decisões transversais

| Tema | Decisão (proposta) |
|---|---|
| Configuração | 12-factor: tudo por variáveis de ambiente (`DB_URL`, `JWT_SECRET`, `APP_ENV`, `ADMIN_EMAIL/PASSWORD`); `.env.example` versionado |
| Erros | Formato único (`docs/04-arquitetura/contrato-api.md` §6); erros de domínio → 409/422; nunca stack trace |
| Logs | Estruturados (JSON), com `requestId`, sem PII (máscara central) |
| Health | `GET /health` (liveness) e `GET /ready` (checa banco) — já pensando em Kubernetes |
| Transações | Uma por caso de uso (Unit of Work); eventos de domínio processados dentro da transação na Fase 1 |
| Tempo | Porta `Relogio` injetável (testes determinísticos); UTC no banco |
| Ids | ADR-009 (UUID gerado na aplicação) |
| Idempotência | Comandos de transição são idempotentes por estado (aprovar duas vezes → 409 na segunda) |
