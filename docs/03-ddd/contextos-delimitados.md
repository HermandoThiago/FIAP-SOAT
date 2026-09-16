# Contextos delimitados e context map

## 1. Subdomínios

| Subdomínio | Tipo | Por quê |
|---|---|---|
| **Atendimento** (ordem de serviço, orçamento, status, acompanhamento) | **Core** | É onde a oficina ganha ou perde eficiência; regras mais ricas (máquina de estados, orçamento automático, aprovação) |
| **Catálogo & Estoque** (serviços, peças/insumos, movimentações) | Supporting | Necessário e específico da oficina, mas regras mais simples |
| **Cadastro** (clientes, veículos) | Supporting | CRUD com validações de CPF/CNPJ/placa |
| **Identidade & Acesso** (usuários, JWT, papéis) | Generic | Problema resolvido; poderia ser comprado (Keycloak/Cognito) |
| **Consultas & Métricas** (fila por status, tempo médio) | Supporting (read model) | Leitura sobre o core; sem regras próprias |

## 2. Context map

```mermaid
flowchart TB
    classDef core fill:#ffe0b2,stroke:#e65100,color:#000
    classDef sup fill:#e3f2fd,stroke:#1565c0,color:#000
    classDef gen fill:#eeeeee,stroke:#616161,color:#000

    ID["Identidade & Acesso<br/><i>generic</i><br/>Usuário · Papel · Token"]:::gen
    CAD["Cadastro<br/><i>supporting</i><br/>Cliente · Veículo · Documento · Placa"]:::sup
    CAT["Catálogo & Estoque<br/><i>supporting</i><br/>Serviço · Peça · Movimentação"]:::sup
    ATD["Atendimento<br/><b>core</b><br/>Ordem de Serviço · Orçamento · Status · Histórico"]:::core
    REL["Consultas & Métricas<br/><i>supporting / read model</i><br/>Fila por status · Tempo médio"]:::sup
    CLI["Acompanhamento do Cliente<br/><i>published language</i><br/>API pública da OS"]:::sup

    CAD -- "U/D · Customer-Supplier<br/>ids de cliente/veículo" --> ATD
    CAT -- "U/D · Customer-Supplier<br/>snapshot de preço · disponibilidade" --> ATD
    ATD -- "evento: Orçamento aprovado<br/>→ política: baixar estoque" --> CAT
    ATD -- "eventos / consultas" --> REL
    ATD -- "OHS / Published Language<br/>(contrato do cliente)" --> CLI
    ID -. "Conformist<br/>autenticação/autorização" .-> CAD
    ID -. "Conformist" .-> CAT
    ID -. "Conformist" .-> ATD
    ID -. "Conformist" .-> REL
```

Legenda: **U/D** upstream/downstream · **Customer-Supplier** o upstream atende necessidades do downstream (Atendimento
pede ids e preços; Cadastro/Catálogo entregam) · **Conformist** os contextos aceitam o modelo de identidade como está ·
**OHS/Published Language** Atendimento publica um contrato estável para o cliente (Open Host Service).

## 3. Regras de integração no monólito (hoje) e no futuro

| Relação | Fase 1 (monólito modular) | Fases 4+ (microsserviços) |
|---|---|---|
| Atendimento → Cadastro (validar cliente/veículo) | Chamada em processo via **porta** `CustomerLookup` (interface em `service-orders/application/ports`, implementada por gateway que chama a aplicação de `customers`) | HTTP síncrono (`GET /customers/{id}`) ou réplica local via eventos |
| Atendimento → Catálogo (preço/disponibilidade ao incluir item) | Porta `CatalogLookup`; **snapshot** de nome/preço gravado na OS | HTTP síncrono + snapshot (já preparado) |
| Atendimento → Estoque (baixa na aprovação) | Caso de uso transacional `ApproveQuoteUseCase` orquestra as duas mudanças na mesma transação, via porta `StockMovements` | **SAGA** (orquestrada ou coreografada) com eventos `QuoteApproved` → `StockWithdrawn` / `StockWithdrawalFailed` → compensação |
| Atendimento → Notificação | Porta `CustomerNotifier` (gateway `LogCustomerNotifier`) | SNS/SES/WhatsApp |
| Identidade → todos | Guard JWT compartilhado (`shared/adapters`) | API Gateway + Cognito/Lambda authorizer (Fase 3) |
| Consultas & Métricas | Consultas SQL sobre as tabelas de `service_orders` (mesmo banco) | Read model próprio alimentado por eventos (CQRS) |

Regras inegociáveis já na Fase 1 (para que a extração seja barata):

1. **Nenhum módulo importa classes de domínio de outro módulo** — só request/response models, portas de aplicação ou eventos.
2. **Nenhum JOIN entre tabelas de módulos diferentes** no código de domínio/aplicação; consultas de leitura (`REL`) podem, e são marcadas como tal.
3. **Ids gerados na aplicação** (ADR-009), nunca dependentes de sequência de outro módulo.
4. **Eventos de domínio** nomeados no passado e publicados em processo (barramento simples); hoje os handlers rodam na mesma transação, amanhã viram mensagens.

## 4. Mapeamento contexto → módulo → futuro serviço

| Contexto | Módulo (Fase 1) | Tabelas (schema) | Candidato a serviço (Fase 4) |
|---|---|---|---|
| Atendimento | `service-orders` | `service_orders.service_orders`, `service_order_service_items`, `service_order_part_items`, `service_order_status_history` | `service-orders-service` |
| Catálogo & Estoque | `catalog` | `catalog.services`, `parts`, `stock_movements` | `catalog-service` (+ `stock-service` se necessário) |
| Cadastro | `customers` | `customers.customers`, `vehicles` | `customers-service` |
| Identidade | `identity` | `identity.users` | Cognito / `identity-service` |
| Consultas & Métricas | casos de uso de leitura dentro de `service-orders` no MVP (`ListServiceOrders`, `CalculateAverageExecutionTime`) | views/consultas | read model com CQRS |
| Acompanhamento do Cliente | rotas `/tracking` em `service-orders` (`GetTracking`) | — | BFF / API Gateway |

Nomes em inglês conforme ADR-013 (Aceita); os nomes dos contextos em português continuam sendo a linguagem ubíqua
falada — o mapeamento está em `linguagem-ubiqua.md` §1.
