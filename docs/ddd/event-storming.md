# Event Storming — fluxos obrigatórios

Entregável: event storming da criação da OS, do acompanhamento da OS e da gestão de peças e insumos, no Miro (link pendente) e exportado para `docs/ddd/event-storming.pdf`.

Versões visuais dos três fluxos em `diagramas/`: `02-event-storming-criacao-os`, `03-event-storming-acompanhamento-os` e `04-event-storming-estoque` (`.drawio` editável + `.png`), reunidas em `event-storming.pdf`; a máquina de estados está em `01-maquina-de-estados`.

> **Eventos são fatos conceituais de negócio**, não eventos publicados no código. Não há classes de evento, barramento nem handlers: cada "política" abaixo é executada diretamente pelo serviço de aplicação, na mesma transação. O rastro real é o histórico de status, o orçamento e as movimentações de estoque ([agregados §3](agregados.md)).

Papéis reais: **Admin**, **Atendente**, **Mecânico**, **Cliente**. Não existem Gerente nem Analista financeiro; "gestão" é feita pelo Admin.

## 0. Legenda

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
    L1(Evento · passado):::evento
    L2[Comando · imperativo]:::comando
    L3([Ator]):::ator
    L4[[Agregado conceitual]]:::agregado
    L5{{Política · sempre que…}}:::politica
    L6[/Modelo de leitura/]:::leitura
    L7[(Sistema externo)]:::externo
    L8>Hotspot / dúvida]:::hotspot
```

Gramática: **Ator → Comando → Agregado → Evento**; **Evento → Política → Comando**.

## 1. Big picture

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    subgraph Cadastro
        E0(Cliente cadastrado):::evento --> E0b(Veículo cadastrado):::evento
    end
    subgraph Estoque["Fluxo 3 — peças e insumos"]
        P1(Item cadastrado):::evento --> P2(Entrada de estoque registrada):::evento
    end
    subgraph OS["Fluxos 1 e 2 — criação e acompanhamento da OS"]
        E1(OS recebida):::evento --> E2(Diagnóstico iniciado):::evento --> E3(Serviço ou peça incluído):::evento
        E3 --> E5(Orçamento recalculado):::evento --> E6(Orçamento enviado):::evento
        E6 --> E7(Orçamento aprovado):::evento --> E8(Execução iniciada):::evento --> E9(Execução finalizada):::evento --> E10(Veículo entregue):::evento
        E6 --> E7b(Orçamento recusado):::evento --> E11(OS recusada - terminal):::evento
        E1 --> E12(OS cancelada - terminal):::evento
    end
    E0b -.-> E1
    P2 -.-> E3
    E7 -.-> P3(Reserva de estoque realizada):::evento
    E9 -.-> P4(Baixa de estoque realizada):::evento
```

Marcos pivotais: OS recebida · Orçamento enviado · Orçamento aprovado · Execução iniciada · Execução finalizada · Veículo entregue. Desvios terminais: **OS recusada** (cliente recusou) e **OS cancelada** (Admin, antes da aprovação).

## 2. Fluxo 1 — Criação da OS

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

    R1[/Busca de cliente por documento/]:::leitura --> A1([Atendente ou Admin]):::ator
    A1 --> C1b[Cadastrar cliente]:::comando --> G1[[Cliente - Usuario]]:::agregado --> E1b(Cliente cadastrado):::evento
    A1 --> C2b[Cadastrar veículo]:::comando --> G2[[Veículo]]:::agregado --> E2b(Veículo cadastrado):::evento
    A1 --> C3[Criar ordem de serviço<br/>clientId ou customerDocument]:::comando --> G3[[Ordem de Serviço]]:::agregado --> E3(OS recebida):::evento
    E3 --> PL1{{Sempre que a OS é criada,<br/>gravar histórico e número sequencial}}:::politica
    PL0{{Veículo do cliente, sem OS aberta,<br/>mecânico válido}}:::politica --> C3
    A2([Mecânico ou Admin]):::ator --> C4[Iniciar diagnóstico]:::comando --> G3 --> E4(Diagnóstico iniciado):::evento
    R2[/Listagem de OS por status/]:::leitura --> A2
    H1>Criar cliente e veículo no mesmo comando da OS?<br/>não implementado]:::hotspot -.-> C3
```

### 2.2 Composição do orçamento e envio

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000
    classDef externo fill:#f7b2d9,stroke:#c2185b,color:#000

    R1[/Catálogo de serviços e itens/]:::leitura --> A1([Mecânico ou Admin]):::ator
    A1 --> C1[Incluir serviço]:::comando --> G1[[Ordem de Serviço]]:::agregado --> E1(Serviço incluído):::evento
    A1 --> C2[Incluir peça ou insumo]:::comando --> PL0{{Conferir disponibilidade;<br/>insuficiente → 422; não reserva}}:::politica --> G1 --> E2(Peça incluída):::evento
    E1 --> PL1{{Sempre que itens mudam,<br/>congelar preço e recalcular orçamento}}:::politica
    E2 --> PL1
    PL1 --> E3(Orçamento recalculado):::evento
    A1 --> C4[Enviar orçamento]:::comando --> G1 --> E4(Orçamento enviado):::evento
    E4 --> PL2{{Sempre que o orçamento é enviado,<br/>gerar token de acompanhamento<br/>e registrar a notificação em log}}:::politica
    PL2 --> X1[(Notificação simulada - log)]:::externo
    A3([Admin]):::ator --> C7[Cancelar OS com motivo<br/>antes da aprovação]:::comando --> G1 --> E7(OS cancelada):::evento
```

Itens só podem mudar em **Recebida** e **Em diagnóstico**; o envio exige ao menos um item.

## 3. Fluxo 2 — Acompanhamento da OS

A máquina de estados implementada (9 status, 8 comandos) está em `01-maquina-de-estados` e na [política de transições](../04-arquitetura/fluxos.md). Tabela:

| Comando | De | Para | Papel |
|---|---|---|---|
| startDiagnosis | RECEBIDA | EM_DIAGNOSTICO | Admin, Mecânico |
| sendQuote | EM_DIAGNOSTICO | AGUARDANDO_APROVACAO | Admin, Mecânico |
| approveQuote | AGUARDANDO_APROVACAO | AGUARDANDO_EXECUCAO | Cliente |
| rejectQuote | AGUARDANDO_APROVACAO | ORCAMENTO_RECUSADO | Cliente |
| startExecution | AGUARDANDO_EXECUCAO | EM_EXECUCAO | Admin, Mecânico |
| complete | EM_EXECUCAO | FINALIZADA | Admin, Mecânico |
| deliver | FINALIZADA | ENTREGUE | Admin, Atendente |
| cancel | RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO | CANCELADA | Admin |

### 3.1 Aprovação, execução, finalização e entrega

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000

    R0[/Acompanhamento mascarado<br/>token da OS ou login Cliente/]:::leitura --> A0([Cliente]):::ator
    A0 --> C0[Aprovar orçamento]:::comando --> G1[[Ordem de Serviço]]:::agregado --> E0(Orçamento aprovado):::evento
    E0 --> PL1{{Na mesma transação,<br/>reservar as peças; sem saldo → 422 e nada muda}}:::politica
    PL1 --> C2[Reservar estoque]:::comando --> G2[[Item de estoque]]:::agregado --> E2(Reserva realizada):::evento
    A0 --> C0b[Recusar com motivo]:::comando --> G1 --> E0b(Orçamento recusado - OS terminal):::evento
    A1([Mecânico ou Admin]):::ator --> C1[Iniciar execução]:::comando --> G1 --> E1(Execução iniciada):::evento
    A1 --> C3[Finalizar execução]:::comando --> G1 --> E3(Execução finalizada):::evento
    E3 --> PL2{{Na mesma transação,<br/>baixar a reserva}}:::politica --> C5[Baixar estoque]:::comando --> G2 --> E5(Baixa realizada):::evento
    A2([Atendente ou Admin]):::ator --> C4[Registrar entrega]:::comando --> G1 --> E4(Veículo entregue):::evento
    E4 --> PL3{{OS entregue é terminal}}:::politica
    E3 --> R1[/Tempo médio de execução/]:::leitura
```

A aprovação **não inicia** a execução; `start-execution` é um comando separado.

### 3.2 Tabela consolidada dos Fluxos 1 e 2

| # | Ator | Comando | Evento | Efeito |
|---|---|---|---|---|
| 1 | Atendente/Admin | Cadastrar cliente e veículo | Cliente/Veículo cadastrado | — |
| 2 | Atendente/Admin | Criar OS | **OS recebida** | histórico + número |
| 3 | Mecânico/Admin | Iniciar diagnóstico | Diagnóstico iniciado | histórico |
| 4 | Mecânico/Admin | Incluir serviço/peça | Item incluído | congela preço; recalcula; peça sem saldo → 422 |
| 5 | Mecânico/Admin | Enviar orçamento | **Orçamento enviado** | token; log simulado |
| 6 | Cliente | Aprovar | **Orçamento aprovado** | reserva atômica |
| 6b | Cliente | Recusar | Orçamento recusado | ORCAMENTO_RECUSADO, motivo |
| 6c | Admin | Cancelar | OS cancelada | motivo; só antes da aprovação |
| 7 | Mecânico/Admin | Iniciar execução | Execução iniciada | histórico |
| 8 | Mecânico/Admin | Finalizar | **Execução finalizada** | baixa a reserva |
| 9 | Atendente/Admin | Entregar | **Veículo entregue** | terminal |

## 4. Fluxo 3 — Gestão de peças e insumos

```mermaid
flowchart LR
    classDef evento fill:#f6a623,stroke:#b36b00,color:#000
    classDef comando fill:#4a90e2,stroke:#1c5aa6,color:#fff
    classDef ator fill:#f8e71c,stroke:#a89b00,color:#000
    classDef agregado fill:#fdf5b0,stroke:#a89b00,color:#000
    classDef politica fill:#bd10e0,stroke:#7a0a92,color:#fff
    classDef leitura fill:#7ed321,stroke:#4a8a0e,color:#000

    A1([Admin ou Atendente]):::ator --> C1[Cadastrar item]:::comando --> G1[[Item de estoque]]:::agregado --> E1(Item cadastrado):::evento
    E1 --> PL5{{Saldo inicial gera a entrada Saldo inicial}}:::politica
    A1 --> C2[Atualizar dados e preço]:::comando --> G1 --> E2(Item atualizado):::evento
    E2 --> PL0{{OS já orçadas mantêm o preço congelado;<br/>PUT não altera saldo}}:::politica
    A1 --> C3[Registrar entrada]:::comando --> G1 --> E3(Entrada registrada):::evento
    A1 --> C4b[Saída manual - só do disponível]:::comando --> G1 --> E4b(Saída registrada):::evento
    A1 --> C4[Ajustar - define o novo saldo físico, com motivo]:::comando --> G1 --> E4(Estoque ajustado):::evento
    A1 --> C5[Inativar - exclusão lógica]:::comando --> G1 --> E5(Item inativado):::evento
    X1(Orçamento aprovado - Fluxo 2):::evento --> PL1{{Reservar tudo ou nada}}:::politica --> G1 --> E6(Reserva realizada):::evento
    X2(Execução finalizada - Fluxo 2):::evento --> PL2{{Baixar a reserva}}:::politica --> G1 --> E7(Baixa realizada):::evento
    E3 --> R2[/Histórico de movimentações/]:::leitura
    E6 --> R2
    E7 --> R2
    E4 --> R2
```

Fora do implementado: **estoque mínimo e alerta**, reposição a fornecedor e **liberação de reserva**. O tipo `LIBERACAO_RESERVA` e a função `release` existem, mas nenhum fluxo os usa: recusa e cancelamento só ocorrem antes da aprovação, portanto antes de qualquer reserva.

Movimentações manuais (`ENTRADA`, `SAIDA`, `AJUSTE`) usam `POST /itens/{id}/stock-movements`; `RESERVA` e a `SAIDA` da OS nascem só dos comandos da OS.

## 5. Hotspots

| Hotspot | Situação |
|---|---|
| Recusa do orçamento: voltar ao diagnóstico ou encerrar | Implementado como **ORCAMENTO_RECUSADO** (terminal); ADR-010 previa `CANCELLED` — divergência registrada em `decisoes-leves.md` |
| Acesso do cliente | Implementado: token de acompanhamento (uma OS) **ou** login de Cliente (ADR-011) |
| Momento da baixa e falta de estoque | Implementado: conferir ao incluir, reservar ao aprovar, baixar ao finalizar; 422 sem saldo (ADR-012) |
| Estorno após cancelamento | Não se aplica: cancelamento só antes da aprovação |
| Criar cliente/veículo junto com a OS | **Não implementado** (RF-010 era Should) |
| Quantidade decimal para insumos | Implementado: `Decimal(12,3)` |
| Reparo adicional / reabertura | **Não implementado** |

## 6. Agregados e nomes no código

Os post-its ficam em português (linguagem falada). Os identificadores do código são mistos, em português no schema e nos DTOs (ver [glossário](linguagem-ubiqua.md)).

| Agregado conceitual | Fatos | No código | Módulo |
|---|---|---|---|
| Cliente | cadastrado, atualizado, inativado | `Usuario` com perfil Cliente; `CustomersService` | `customers` / `identity` |
| Veículo | cadastrado, atualizado, inativado | `Veiculo`; `VehiclesService` | `customers` |
| Serviço | cadastrado, atualizado, inativado | `Servico`; `CatalogService` | `catalog` |
| Item de estoque | cadastrado, entrada, saída, ajuste, reserva, baixa | `ItemEstoque`, `MovimentacaoEstoque`; `ItemService`, `StockService` | `catalog` |
| Ordem de Serviço | todos os marcos do §1 | `OrdemServico`, `Orcamento`, `OrdemServicoStatusHistorico`; `ServiceOrdersService`, `ServiceOrderItemsService`, `TrackingService` | `service-orders` |
| Usuário | criado, autenticado, inativado | `Usuario`, `UsuarioSenha`, `SessaoRefresh`; `AuthService`, `UsersService` | `identity` |

## 7. Como montar no Miro e exportar

1. Frames: legenda, big picture, Fluxo 1, Fluxo 2 (com a máquina de estados), Fluxo 3 e hotspots com a situação do §5.
2. Domain storytelling, mapa de contextos, modelo de agregados e glossário em frames próprios (`domain-storytelling.md`, `contextos-delimitados.md`, `agregados.md`, `linguagem-ubiqua.md`).
3. Compartilhar como "qualquer pessoa com o link pode ver" e testar em janela anônima.
4. Os PDFs `event-storming.pdf` e `diagramas.pdf` já estão no repositório, gerados a partir dos PNGs de `diagramas/`. Se o Miro for alterado, regenerar e conferir contra o código entregue.
