# Event Storming — fluxos obrigatórios

> Entregável do enunciado: *"Event Storming completo dos fluxos: (1) criação e acompanhamento da OS; (2) gestão de peças
> e insumos"*, em Miro ou equivalente. Este arquivo é a **versão versionada** (Mermaid) que a F2 transfere para o Miro,
> post-it por post-it, e que o vídeo usa para explicar "o processo de Event Storming". Os hotspots foram resolvidos
> pelas ADRs 010/011/012 em 22/09/2026 (§4) — os diagramas já refletem as decisões.

## 0. Legenda (cores padrão do Event Storming)

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000
    classDef externo fill:#f7b2d9,stroke:#c2185b,color:#000
    classDef hotspot fill:#ff4d6d,stroke:#a3001b,color:#fff
    L1(Evento de domínio<br/>laranja · passado):::evento
    L2[Comando<br/>azul · imperativo]:::comando
    L3([Ator<br/>amarelo pequeno]):::ator
    L4[[Agregado<br/>amarelo claro]]:::agregado
    L5{{Política / regra<br/>lilás · sempre que…}}:::politica
    L6[/Modelo de leitura<br/>verde/]:::leitura
    L7[(Sistema externo<br/>rosa)]:::externo
    L8>Hotspot / dúvida<br/>vermelho]:::hotspot
```

Gramática usada: **Ator → Comando → Agregado → Evento**; **Evento → Política → Comando** (automação);
**Modelo de leitura** alimenta a decisão do ator.

## 1. Big picture — linha do tempo dos eventos (os dois fluxos juntos)

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    subgraph Cadastro
        E0(Cliente cadastrado):::evento --> E0b(Veículo cadastrado):::evento
    end
    subgraph Estoque["Gestão de peças e insumos"]
        P1(Peça cadastrada):::evento --> P2(Entrada de estoque registrada):::evento
    end
    subgraph OS["Criação e acompanhamento da OS"]
        E1(OS recebida):::evento --> E2(Diagnóstico iniciado):::evento --> E3(Serviço incluído na OS):::evento --> E4(Peça incluída na OS):::evento
        E4 --> E5(Orçamento recalculado):::evento --> E6(Orçamento enviado ao cliente):::evento
        E6 --> E7(Orçamento aprovado):::evento --> E8(Execução iniciada):::evento --> E9(Execução finalizada):::evento --> E10(Veículo entregue):::evento
        E6 --> E7b(Orçamento recusado):::evento --> E11(OS cancelada):::evento
    end
    E0b -.-> E1
    P2 -.-> E4
    E7 -.-> P3(Reserva de estoque realizada):::evento
    E9 -.-> P4(Baixa de estoque realizada):::evento
    P4 -.-> P5(Estoque abaixo do mínimo):::evento
```

Eventos pivotais (marcos que separam fases do processo): **OS recebida** · **Orçamento enviado ao cliente** ·
**Orçamento aprovado** · **Execução finalizada** · **Veículo entregue** (e o desvio terminal **OS cancelada**).

## 2. Fluxo 1 — Criação e acompanhamento da OS (process modeling)

### 2.1 Recepção e diagnóstico

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000
    classDef hotspot fill:#ff4d6d,stroke:#a3001b,color:#fff

    R1[/Busca de cliente por documento/]:::leitura --> A1([Atendente]):::ator
    A1 --> C1[Identificar cliente<br/>por CPF/CNPJ]:::comando --> G1[[Cliente]]:::agregado --> E1(Cliente identificado):::evento
    A1 --> C1b[Cadastrar cliente]:::comando --> G1
    G1 --> E1b(Cliente cadastrado):::evento
    E1 --> C2[Identificar veículo<br/>por placa]:::comando --> G2[[Veículo]]:::agregado --> E2(Veículo identificado):::evento
    A1 --> C2b[Cadastrar veículo]:::comando --> G2 --> E2b(Veículo cadastrado):::evento
    E2 --> C3[Criar ordem de serviço]:::comando --> G3[[Ordem de Serviço]]:::agregado --> E3(OS recebida):::evento
    E3 --> PL1{{Sempre que uma OS é recebida,<br/>registrar histórico e número}}:::politica
    A2([Mecânico]):::ator --> C4[Iniciar diagnóstico]:::comando --> G3 --> E4(Diagnóstico iniciado):::evento
    R2[/Fila de OS por status/]:::leitura --> A2
    H1>Criar cliente/veículo junto com a OS<br/>no mesmo comando? RF-010 (Should)]:::hotspot -.-> C3
```

### 2.2 Composição do orçamento e aprovação

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000
    classDef externo fill:#f7b2d9,stroke:#c2185b,color:#000

    R1[/Catálogo de serviços e peças<br/>com disponibilidade/]:::leitura --> A1([Mecânico]):::ator
    A1 --> C1[Incluir serviço na OS]:::comando --> G1[[Ordem de Serviço]]:::agregado --> E1(Serviço incluído na OS):::evento
    A1 --> C2[Incluir peça/insumo na OS]:::comando --> PL0{{Verificar disponibilidade em estoque —<br/>sem disponibilidade, recusar com 422 (ADR-012)}}:::politica --> G1 --> E2(Peça incluída na OS):::evento
    E1 --> PL1{{Sempre que itens mudam,<br/>recalcular orçamento}}:::politica
    E2 --> PL1
    PL1 --> C3[Recalcular orçamento]:::comando --> G1 --> E3(Orçamento recalculado):::evento
    A1 --> C4[Enviar orçamento<br/>para aprovação]:::comando --> G1 --> E4(Orçamento enviado ao cliente):::evento
    E4 --> PL2{{Sempre que o orçamento é enviado,<br/>congelar itens, gerar token de acompanhamento<br/>e notificar cliente — ADR-011}}:::politica
    PL2 --> X1[(Notificação<br/>e-mail/SMS simulado)]:::externo
    PL2 --> E4b(Token de acompanhamento gerado):::evento
    R2[/Acompanhamento da OS: status + orçamento<br/>via token de acompanhamento ou login do cliente/]:::leitura --> A2([Cliente]):::ator
    A2 --> C5[Aprovar orçamento]:::comando --> G1 --> E5(Orçamento aprovado):::evento
    A2 --> C6[Recusar orçamento<br/>com motivo]:::comando --> G1 --> E6(Orçamento recusado):::evento
    E6 --> PL3{{Sempre que o orçamento é recusado,<br/>cancelar a OS — ADR-010}}:::politica --> E7(OS cancelada):::evento
    A3([Gerente]):::ator --> C7[Cancelar OS<br/>antes da aprovação, com motivo]:::comando --> G1 --> E7
```

### 2.3 Execução, finalização e entrega

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000

    E0(Orçamento aprovado):::evento --> PL1{{Sempre que o orçamento é aprovado,<br/>iniciar execução e reservar as peças da OS<br/>na mesma transação — ADR-012}}:::politica
    PL1 --> C1[Iniciar execução]:::comando --> G1[[Ordem de Serviço]]:::agregado --> E1(Execução iniciada):::evento
    PL1 --> C2[Reservar peças da OS]:::comando --> G2[[Peça / Estoque]]:::agregado --> E2(Reserva de estoque realizada):::evento
    A1([Mecânico]):::ator --> C3[Finalizar execução]:::comando --> G1 --> E3(Execução finalizada):::evento
    E3 --> PL2{{Sempre que a OS é finalizada,<br/>baixar as peças reservadas, registrar<br/>tempo de execução e notificar cliente}}:::politica
    PL2 --> C5[Baixar peças reservadas]:::comando --> G2 --> E5(Baixa de estoque realizada):::evento
    A2([Atendente]):::ator --> C4[Registrar entrega do veículo]:::comando --> G1 --> E4(Veículo entregue):::evento
    E4 --> PL3{{OS entregue é imutável}}:::politica
    E3 --> R1[/Tempo médio de execução<br/>por serviço e período/]:::leitura
    E1 --> R2[/Acompanhamento da OS<br/>para o cliente/]:::leitura
    E3 --> R2
    E4 --> R2
    R1 --> A3([Gerente]):::ator
```

### 2.4 Tabela consolidada do Fluxo 1 (para colar no Miro)

| # | Ator | Comando | Agregado | Evento | Política disparada | Modelo de leitura |
|---|---|---|---|---|---|---|
| 1 | Atendente | Identificar cliente por CPF/CNPJ | Cliente | Cliente identificado / cadastrado | — | Busca de cliente |
| 2 | Atendente | Identificar/cadastrar veículo | Veículo | Veículo identificado / cadastrado | — | Veículos do cliente |
| 3 | Atendente | Criar ordem de serviço | Ordem de Serviço | **OS recebida** | Registrar histórico + número | Fila por status |
| 4 | Mecânico | Iniciar diagnóstico | Ordem de Serviço | Diagnóstico iniciado | Registrar histórico | Fila por status |
| 5 | Mecânico | Incluir serviço | Ordem de Serviço | Serviço incluído na OS | Recalcular orçamento | Catálogo |
| 6 | Mecânico | Incluir peça/insumo | Ordem de Serviço | Peça incluída na OS | Verificar disponibilidade (sem estoque → 422); recalcular orçamento | Catálogo c/ disponibilidade |
| 7 | Sistema | Recalcular orçamento | Ordem de Serviço | Orçamento recalculado | — | Orçamento da OS |
| 8 | Mecânico | Enviar orçamento | Ordem de Serviço | **Orçamento enviado ao cliente** | Congelar itens; gerar token de acompanhamento; notificar | Acompanhamento |
| 9 | Cliente | Aprovar orçamento | Ordem de Serviço | **Orçamento aprovado** | Iniciar execução; reservar peças (tudo ou nada) | Acompanhamento |
| 9b | Cliente | Recusar orçamento | Ordem de Serviço | Orçamento recusado → **OS cancelada** | Cancelar a OS (ADR-010); sem efeito no estoque | Acompanhamento |
| 9c | Gerente | Cancelar OS (antes da aprovação) | Ordem de Serviço | OS cancelada | Registrar motivo e histórico | Fila por status |
| 10 | Sistema | Iniciar execução | Ordem de Serviço | Execução iniciada | Registrar histórico | Acompanhamento |
| 11 | Mecânico | Finalizar execução | Ordem de Serviço | **Execução finalizada** | Baixar peças reservadas; registrar tempo de execução; notificar | Tempo médio |
| 12 | Atendente | Registrar entrega | Ordem de Serviço | **Veículo entregue** | Tornar OS imutável | Histórico |

## 3. Fluxo 2 — Gestão de peças e insumos

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000

    A1([Gerente]):::ator --> C1[Cadastrar peça/insumo]:::comando --> G1[[Peça]]:::agregado --> E1(Peça cadastrada):::evento
    A1 --> C2[Atualizar preço/dados da peça]:::comando --> G1 --> E2(Peça atualizada):::evento
    E2 --> PL0{{OS já orçadas mantêm<br/>o preço de snapshot}}:::politica
    A1 --> C3[Registrar entrada de estoque]:::comando --> G1 --> E3(Entrada de estoque registrada):::evento
    A1 --> C4[Ajustar estoque<br/>inventário]:::comando --> G1 --> E4(Estoque ajustado):::evento
    A1 --> C5[Inativar peça]:::comando --> G1 --> E5(Peça inativada):::evento
    X0(Peça incluída na OS<br/>Fluxo 1):::evento -.-> PL4{{Só incluir se disponibilidade ≥ quantidade —<br/>senão 422 (ADR-012)}}:::politica
    X1(Orçamento aprovado<br/>evento do Fluxo 1):::evento --> PL1{{Sempre que o orçamento é aprovado,<br/>reservar as peças da OS — tudo ou nada}}:::politica
    PL1 --> C6[Reservar estoque]:::comando --> G1 --> E6(Reserva de estoque realizada):::evento
    X2(Execução finalizada<br/>evento do Fluxo 1):::evento --> PL2{{Sempre que a OS é finalizada,<br/>baixar as peças reservadas}}:::politica --> C7[Baixar estoque]:::comando --> G1 --> E7(Baixa de estoque realizada):::evento
    E7 --> PL3{{Sempre que o estoque fica<br/>abaixo do mínimo, alertar — Could}}:::politica --> E8(Estoque abaixo do mínimo):::evento
    E8 --> R1[/Peças a repor/]:::leitura --> A1
    E3 --> R2[/Histórico de movimentações/]:::leitura
    E6 --> R2
    E7 --> R2
    E4 --> R2
```

A movimentação de **liberação** (`RELEASE`, "Reserva liberada") existe no modelo e no agregado, mas não tem gatilho no
MVP: recusa e cancelamento só acontecem antes da aprovação, logo antes de qualquer reserva (ADR-010 + ADR-012).

### 3.1 Tabela consolidada do Fluxo 2

| # | Ator | Comando | Agregado | Evento | Política | Leitura |
|---|---|---|---|---|---|---|
| 1 | Gerente | Cadastrar peça/insumo | Peça | Peça cadastrada | — | Catálogo |
| 2 | Gerente | Atualizar peça | Peça | Peça atualizada | OS orçadas mantêm snapshot | Catálogo |
| 3 | Gerente | Registrar entrada | Peça | Entrada de estoque registrada | — | Movimentações |
| 4 | Gerente | Ajustar estoque | Peça | Estoque ajustado | — | Movimentações |
| 5 | Sistema (política) | Reservar estoque (na aprovação) | Peça | Reserva de estoque realizada | Tudo ou nada; sem disponibilidade → 422 e aprovação revertida | Movimentações |
| 6 | Sistema (política) | Baixar estoque (na finalização) | Peça | Baixa de estoque realizada | Alertar se abaixo do mínimo (Could) | Movimentações |
| 7 | Gerente | Inativar peça | Peça | Peça inativada | — | Catálogo |

## 4. Hotspots — resolvidos em 22/09/2026 (Lote 3 de enquetes)

| Hotspot | Resolução |
|---|---|
| Recusa do orçamento: voltar a diagnóstico ou cancelar | ADR-010 / E-14 — **Cancelada** (terminal); renegociar = nova OS |
| Como o cliente se autentica para consultar/aprovar | ADR-011 / E-15 — token de acompanhamento (uma OS) **ou** login com papel `CUSTOMER` |
| Momento da baixa de estoque; comportamento sem estoque | ADR-012 / E-16 — **reserva na aprovação + baixa na finalização**; sem disponibilidade → 422 |
| Estorno após cancelamento com baixa já feita | Combinação ADR-010 + ADR-012: cancelamento só antes da aprovação → nunca há reserva/baixa a estornar |
| Criar cliente/veículo junto com a OS | PRD-001 RF-010 (Should) — em aberto na revisão do PRD |
| Quantidade decimal para insumos | PRD-002 Q3 (proposta: sim, `quantity` decimal(10,3)) — em aberto na revisão do PRD |

## 5. Software design — agregados por evento

Post-its em português (linguagem falada); a coluna *No código* traz o nome em inglês (ADR-013, glossário em
`linguagem-ubiqua.md` §8).

| Agregado | Eventos que emite (post-it) | No código | Módulo |
|---|---|---|---|
| Cliente | Cliente cadastrado, atualizado, inativado | `Customer` — `CustomerRegistered` … | `customers` |
| Veículo | Veículo cadastrado, atualizado, inativado | `Vehicle` — `VehicleRegistered` … | `customers` |
| Serviço | Serviço cadastrado, atualizado, inativado | `Service` — `ServiceRegistered` … | `catalog` |
| Peça (com estoque) | Peça cadastrada/atualizada/inativada; Entrada registrada; Estoque ajustado; Reserva realizada; Baixa realizada; Reserva liberada (sem gatilho no MVP); Estoque abaixo do mínimo | `Part` — `PartRegistered`, `StockInboundRecorded`, `StockAdjusted`, `StockReserved`, `StockWithdrawn`, `ReservationReleased`, `StockBelowMinimum` | `catalog` |
| Ordem de Serviço | OS recebida; Diagnóstico iniciado; Serviço/Peça incluído(a)/removido(a); Orçamento recalculado/enviado/aprovado/recusado; Execução iniciada/finalizada; Veículo entregue; OS cancelada | `ServiceOrder` — `ServiceOrderReceived`, `DiagnosisStarted`, `ItemAddedToServiceOrder`, `ItemRemovedFromServiceOrder`, `QuoteRecalculated`, `QuoteSent`, `QuoteApproved`, `QuoteRejected`, `ExecutionStarted`, `ExecutionCompleted`, `VehicleDelivered`, `ServiceOrderCancelled` | `service-orders` |
| Usuário | Usuário criado (equipe ou cliente); Login realizado/falhou | `User` — `UserRegistered`, `UserAuthenticated` | `identity` |

## 6. Como montar no Miro (F2)

1. Frame "Legenda" com os 8 tipos de post-it.
2. Frame "Big picture" só com eventos laranja em linha do tempo + pivotais marcados com linha vertical.
3. Frame "Fluxo 1 — Criação e acompanhamento da OS" com as 3 raias (recepção/diagnóstico · orçamento/aprovação · execução/entrega) usando a gramática ator → comando → agregado → evento → política.
4. Frame "Fluxo 2 — Gestão de peças e insumos".
5. Frame "Hotspots" com os post-its vermelhos marcados como **resolvidos** e o link da ADR que resolveu cada um (§4) — mostra o processo no vídeo.
6. Frame "Context map" e "Agregados" (`contextos-delimitados.md`, `agregados.md`) e "Glossário" (`linguagem-ubiqua.md`).
7. Exportar o board como imagem para `docs/06-entrega/evidencias/` e colocar o link no PDF de entrega.
