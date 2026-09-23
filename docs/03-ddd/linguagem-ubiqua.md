# Linguagem ubíqua — glossário do domínio da oficina

> Fonte da verdade para nomes no código, na API, nos testes, no Miro e no vídeo.
> **ADR-013 (Aceita, E-07): código e API em inglês; este glossário mapeia cada termo da linguagem ubíqua (português,
> como a oficina fala) para o identificador em inglês.** Regra: **um termo, um significado, uma tradução, em todo lugar**.
> Sinônimos listados são para *evitar* — em português e em inglês.

## 0. Regras de tradução

- Documentação, Miro, vídeo, mensagens de erro e textos exibidos ao cliente (`statusDescription`) ficam em **português**.
- Classes, métodos, campos, rotas, enums, tabelas, colunas, eventos, serviços de aplicação, nomes de módulo e escopos de
  commit ficam em **inglês**, sempre com a tradução deste glossário (não inventar sinônimos: é `Quote`, nunca `Budget`/`Estimate`).
- O **número da OS** continua `OS-AAAA-NNNNNN`: é um rótulo que a oficina fala em voz alta, não um identificador de código.
- Enums em `UPPER_SNAKE_CASE`; campos JSON em `camelCase`; tabelas/colunas em `snake_case`; rotas em `kebab-case` no plural.
- Termo novo? Entra aqui primeiro (PR `docs(ddd): …`), depois no código.

## 1. Módulos (contextos delimitados)

| Contexto (PT) | Módulo / pasta | Escopo de commit | Schema no banco |
|---|---|---|---|
| Cadastro (clientes e veículos) | `customers` | `customers` | `customers` |
| Catálogo & Estoque (serviços, peças/insumos, movimentações) | `catalog` | `catalog` | `catalog` |
| Atendimento (ordem de serviço, orçamento, status, acompanhamento) — **core** | `service-orders` | `service-orders` | `service_orders` |
| Identidade & Acesso (usuários, papéis, JWT) | `identity` | `identity` | `identity` |
| Kernel compartilhado (value objects, erros, eventos) | `shared` | `shared` | — |

## 2. Contexto Atendimento → módulo `service-orders` (core)

| Termo (PT) | Definição | Evitar | Identificador (EN) |
|---|---|---|---|
| **Ordem de Serviço (OS)** | Registro de um atendimento a um veículo de um cliente, do recebimento à entrega. Agrega itens de serviço, itens de peça, orçamento, status e histórico. | pedido, ticket, chamado; *WorkOrder*, *RepairOrder*, *Order* | `ServiceOrder`, tabela `service_orders`, rota `/service-orders` |
| **Número da OS** | Identificador legível (`OS-2026-000123`), único, sequência anual. | id, código | `number` (VO `ServiceOrderNumber`) |
| **Descrição do problema** | Relato do cliente/atendente na abertura. | queixa, reclamação | `problemDescription` |
| **Diagnóstico** | Etapa em que o mecânico avalia o veículo e define serviços e peças. | análise, vistoria | `startDiagnosis()`, rota `/diagnosis` |
| **Item de serviço** | Serviço do catálogo incluído na OS com quantidade e **preço no momento da inclusão** (snapshot). | linha, task | `ServiceItem`, `serviceItems[]`, tabela `service_order_service_items` |
| **Item de peça** | Peça/insumo incluído na OS com quantidade e preço unitário no momento da inclusão; só entra se houver disponibilidade em estoque (ADR-012). | material, produto | `PartItem`, `partItems[]`, tabela `service_order_part_items` |
| **Orçamento** | Valor total calculado automaticamente = Σ itens de serviço + Σ itens de peça, com status próprio. | cotação, proposta; *Budget*, *Estimate* | `Quote`, `quote.totalAmount`, `QuoteStatus` = `PENDING` · `SENT` · `APPROVED` · `REJECTED` |
| **Enviar orçamento** | Congela os itens, gera o token de acompanhamento, notifica o cliente e coloca a OS em *Aguardando aprovação*. | submeter, publicar | `sendQuote()`, `POST …/quote/send` |
| **Aprovação do orçamento** | Ação do cliente que autoriza a execução; inicia a execução automaticamente e **reserva** as peças (ADR-012). | autorização, aceite | `approveQuote()`, `POST …/quote/approve` |
| **Recusa do orçamento** | Ação do cliente que não autoriza; leva a OS para *Cancelada* (ADR-010). | rejeição | `rejectQuote(reason)`, `POST …/quote/reject` |
| **Execução** | Realização dos serviços aprovados. | reparo, conserto (só em texto livre) | `IN_PROGRESS`, `executionStartedAt` |
| **Finalização** | Mecânico declara os serviços concluídos; fim do tempo de execução; **baixa** as peças reservadas (ADR-012). | conclusão, encerramento; *finish* | `complete()`, `COMPLETED`, `completedAt`, `POST …/complete` |
| **Entrega** | Atendente registra a devolução do veículo; OS torna-se imutável. | retirada, baixa | `deliver()`, `DELIVERED`, `deliveredAt`, `POST …/deliver` |
| **Status da OS** | Recebida · Em diagnóstico · Aguardando aprovação · Em execução · Finalizada · Entregue + Cancelada (extensão, ADR-010). | situação, fase, etapa | `ServiceOrderStatus` — mapeamento na §7 |
| **Transição** | Mudança de status causada por um comando de negócio; nunca por edição direta. | update de status | `StatusTransitionPolicy` |
| **Histórico da OS** | Lista append-only de transições (de, para, quando, quem, motivo). | log, auditoria | `StatusHistoryEntry`, `statusHistory[]`, tabela `service_order_status_history`, rota `/status-history` |
| **Cancelamento** | Encerramento definitivo antes da aprovação (recusa do cliente ou decisão do gerente), com motivo; renegociar = nova OS (ADR-010). | exclusão | `cancel(reason)`, `CANCELLED`, `cancellationReason`, `POST …/cancel` |
| **Tempo de execução** | `completedAt − executionStartedAt` (minutos). | lead time, SLA | `executionTimeMinutes` |
| **Tempo médio de execução** | Média dos tempos de execução das OS finalizadas em um período (geral ou por serviço). | produtividade | `AverageExecutionTime`, `GET /metrics/average-execution-time` |
| **Acompanhamento** | Consulta do cliente ao progresso da OS, sem acesso administrativo — com token de acompanhamento ou login de cliente (ADR-011). | portal, status page | `tracking`, rota `/tracking/service-orders/{id}` |
| **Token de acompanhamento** | Credencial de escopo restrito a uma OS (JWT `aud=tracking`), gerada no envio do orçamento (ADR-011). | link mágico | `TrackingToken`, `trackingUrl`, `TrackingTokenService` |
| **Marcos temporais** | Data/hora de cada etapa da OS. | timestamps | `milestones { receivedAt, diagnosisStartedAt, quoteSentAt, executionStartedAt, completedAt, deliveredAt }` |

## 3. Contexto Cadastro → módulo `customers`

| Termo (PT) | Definição | Evitar | Identificador (EN) |
|---|---|---|---|
| **Cliente** | Pessoa física (CPF) ou jurídica (CNPJ) dona de veículos atendidos. | consumidor, usuário; *Client* | `Customer`, tabela `customers`, rota `/customers` |
| **Tipo de pessoa** | PF ou PJ. | — | `customerType` = `INDIVIDUAL` (PF) · `COMPANY` (PJ) |
| **Documento** | CPF (11 dígitos) ou CNPJ (14), validado por dígitos verificadores; único entre clientes ativos. | identidade, registro | `Document` (VO; `Cpf` \| `Cnpj`), campo `document` (só dígitos), `formattedDocument` |
| **Veículo** | Automóvel do cliente identificado pela placa; tem marca, modelo e ano. | carro (texto livre ok); *Car* | `Vehicle`, tabela `vehicles`, rota `/vehicles` |
| **Placa** | Padrão antigo (`ABC1234`) ou Mercosul (`ABC1D23`); única entre veículos ativos. | chapa; *Plate* sozinho | `LicensePlate` (VO), campo `licensePlate` |
| **Marca / Modelo / Ano / Cor** | Atributos do veículo. | *make* (usar `brand`) | `brand`, `model`, `year`, `color` |
| **Inativar** | Remoção lógica (mantém histórico). | deletar, excluir | `deactivate()`, campo `active` |

## 4. Contexto Catálogo & Estoque → módulo `catalog`

| Termo (PT) | Definição | Evitar | Identificador (EN) |
|---|---|---|---|
| **Serviço** | Item do catálogo de mão de obra com preço e tempo estimado (ex.: troca de óleo). | tarefa, job; *Labor* | `Service`, tabela `services`, rota `/services` — ⚠️ os serviços de aplicação usam o sufixo `Service` (camadas clássicas, ADR-003); o que mantém a entidade `Service` chama-se **`CatalogService`**, nunca `ServicesService` |
| **Tempo estimado** | Duração prevista do serviço em minutos. | SLA | `estimatedMinutes` |
| **Preço** | Preço do serviço no catálogo. | valor | `price` |
| **Peça** | Item físico contável usado em serviços (ex.: filtro de óleo). | produto, componente; *Piece* | `Part` (`type = PART`), tabela `parts`, rota `/parts` |
| **Insumo** | Item consumível, possivelmente fracionário (ex.: óleo 5W30, litros). Compartilha o agregado `Part`. | material; *Input* | `Part` (`type = SUPPLY`), `PartType` = `PART` · `SUPPLY` |
| **Unidade de medida** | UN, L, ML, KG… | — | `unitOfMeasure` |
| **SKU** | Código único da peça/insumo. | referência | `sku` |
| **Preço unitário** | Preço por unidade de medida. | — | `unitPrice` |
| **Estoque** | Quantidade física de uma peça/insumo. Só muda por movimentação. | saldo, inventário; *Inventory* | `stockQuantity` |
| **Quantidade reservada** | Comprometida com OS aprovadas e ainda não finalizadas (ADR-012). | bloqueio | `reservedQuantity` |
| **Disponibilidade** | `stockQuantity − reservedQuantity`; é o que a inclusão de peça na OS e a aprovação verificam. | saldo livre | `availableQuantity` |
| **Estoque mínimo** | Abaixo dele, precisa repor (alerta — Could). | ponto de pedido | `minimumStock` |
| **Movimentação de estoque** | Registro imutável de entrada, saída, reserva, liberação ou ajuste. | transação, lançamento | `StockMovement`, tabela `stock_movements`, rota `/parts/{id}/stock-movements` |
| **Entrada** | Aumenta o estoque (compra/abastecimento). | compra | `StockMovementType.INBOUND` |
| **Reserva** | Compromisso de quantidade para uma OS, na aprovação do orçamento (ADR-012). | bloqueio | `RESERVATION`, `reserve()`, `PartsService.reserveForServiceOrder()` |
| **Baixa** | Saída vinculada a uma OS, na finalização; consome a reserva (ADR-012). | consumo, débito; *Withdrawal* | `StockMovementType.OUTBOUND`, `withdraw()`, `PartsService.withdrawReservedForServiceOrder()` |
| **Liberação** | Descompromisso de quantidade sem consumo; existe no modelo, **sem gatilho no MVP** (Could). | estorno | `RELEASE`, `release()` |
| **Ajuste** | Correção por inventário, com motivo. | acerto | `ADJUSTMENT`, `adjust(quantity, reason)` |

## 5. Contexto Identidade → módulo `identity`

| Termo (PT) | Definição | Evitar | Identificador (EN) |
|---|---|---|---|
| **Usuário** | Quem faz login: funcionário da oficina (equipe) ou cliente (ADR-011). | admin, operador, conta | `User`, tabela `users`, rota `/users` |
| **Papel** | Perfil de autorização. | perfil | `Role` = `ATTENDANT` · `MECHANIC` · `MANAGER` · `CUSTOMER` |
| **Atendente** | Recebe o cliente, abre OS, registra entrega; pode criar o login do cliente. | recepcionista | `ATTENDANT` |
| **Mecânico** | Diagnostica, inclui itens, envia orçamento, executa e finaliza. | técnico | `MECHANIC` |
| **Gerente** | Mantém catálogo, estoque, usuários; cancela OS; acompanha métricas. | dono, administrador | `MANAGER` |
| **Cliente (acesso)** | Papel do usuário vinculado a um cliente do cadastro; só acessa `/tracking/**` das próprias OS (ADR-011). | — | `CUSTOMER`, `User.customerId` (obrigatório se, e só se, o papel é `CUSTOMER`) |
| **Token de acesso** | JWT (HS256, 60 min) emitido no login, para equipe ou cliente (ADR-004). | sessão | `accessToken`, claims `sub`, `roles`, `customerId?`, `aud=api` |
| **Senha** | Sempre armazenada como hash (bcrypt). | — | `password` (entrada), `passwordHash` (armazenado) |

## 6. Kernel compartilhado (`shared`) e fronteiras entre módulos

| Conceito | Identificador (EN) |
|---|---|
| Dinheiro (BRL, 2 casas, decimal) | `Money` |
| Quantidade (decimal 10,3) | `Quantity` |
| E-mail / Telefone | `Email`, `Phone` |
| Relógio injetável | `Clock` (`SystemClock`, `FixedClock`) |
| Gerador de ids (UUID v4) | `IdGenerator` (`UuidV4IdGenerator`, `FixedIdGenerator`) |
| Publicador de eventos em processo | `DomainEventPublisher` |
| Transação | `prisma.$transaction` via `PrismaService` (`shared/prisma`) |
| Guards | `JwtAuthGuard` (equipe), `TrackingAuthGuard` (token de acompanhamento ou `CUSTOMER`), `@Roles()`, `@Public()` |
| Notificação ao cliente (simulada) | `CustomerNotifier` (implementação `LogCustomerNotifier`) |
| Serviços exportados pelo `customers` (usados por `service-orders` e `identity`) | `CustomersService`, `VehiclesService` |
| Serviços exportados pelo `catalog` (usados por `service-orders`) | `CatalogService`, `PartsService` |
| Serviços exportados pelo `identity` (usados por `service-orders` e pelos guards) | `AuthService`, `TrackingTokenService` |
| Erro de domínio → 409/422 | `DomainError`, `InvalidTransitionError`, `ValidationError` |

## 7. Status da OS — mapeamento oficial (enunciado → código → texto ao cliente)

| Enunciado (PT) | `ServiceOrderStatus` | `statusDescription` (exibido ao cliente) |
|---|---|---|
| Recebida | `RECEIVED` | "Ordem de serviço recebida" |
| Em diagnóstico | `IN_DIAGNOSIS` | "Em diagnóstico pelo mecânico" |
| Aguardando aprovação | `AWAITING_APPROVAL` | "Aguardando sua aprovação do orçamento" |
| Em execução | `IN_PROGRESS` | "Serviços em execução" |
| Finalizada | `COMPLETED` | "Serviços finalizados — aguardando retirada" |
| Entregue | `DELIVERED` | "Veículo entregue" |
| Cancelada (extensão, ADR-010) | `CANCELLED` | "Ordem de serviço cancelada" |

No vídeo, ao mostrar a máquina de estados, use esta tabela: o avaliador procura os seis nomes do enunciado.

## 8. Eventos de domínio (nomes canônicos, passado, inglês)

`CustomerRegistered` · `VehicleRegistered` · `ServiceOrderReceived` · `DiagnosisStarted` · `ItemAddedToServiceOrder` ·
`ItemRemovedFromServiceOrder` · `QuoteRecalculated` · `QuoteSent` · `QuoteApproved` · `QuoteRejected` · `ExecutionStarted` ·
`ExecutionCompleted` · `VehicleDelivered` · `ServiceOrderCancelled` · `PartRegistered` · `StockInboundRecorded` ·
`StockAdjusted` · `StockReserved` · `StockWithdrawn` · `ReservationReleased` · `StockBelowMinimum` · `UserRegistered` ·
`UserAuthenticated`

No Miro (event storming), os post-its continuam em **português** (é a linguagem da oficina); a tabela
`docs/03-ddd/event-storming.md` §5 traz a coluna com o nome em código.

## 9. Serviços de aplicação (classe) e operações (método) — nomes canônicos

Camadas clássicas (ADR-003): cada módulo expõe serviços de aplicação com sufixo `Service`; cada caso de uso é um método.

| Módulo | Serviço | Operações |
|---|---|---|
| `service-orders` | `ServiceOrdersService` | `create`, `startDiagnosis`, `addServiceItem`, `addPartItem`, `removeItem`, `sendQuote`, `approveQuote`, `rejectQuote`, `complete`, `deliver`, `cancel`, `findById`, `list` |
| `service-orders` | `TrackingService` | `getTracking`, `listMine`, `approveQuote`, `rejectQuote` (verificam a propriedade da OS) |
| `service-orders` | `MetricsService` | `averageExecutionTime` |
| `catalog` | `CatalogService` (entidade `Service`) | `register`, `update`, `deactivate`, `findById`, `list` |
| `catalog` | `PartsService` (peças/insumos + estoque) | `register`, `update`, `deactivate`, `findById`, `list`, `recordInbound`, `adjustStock`, `reserveForServiceOrder`, `withdrawReservedForServiceOrder`, `releaseReservation` (Could), `listBelowMinimum` |
| `customers` | `CustomersService` | `register`, `update`, `deactivate`, `findById`, `findByDocument` |
| `customers` | `VehiclesService` | `register`, `update`, `deactivate`, `findById`, `findByLicensePlate`, `belongsToCustomer` |
| `identity` | `AuthService` | `login`, `validateToken` |
| `identity` | `UsersService` | `register` (equipe ou `CUSTOMER` + `customerId`), `list`, `update`, `deactivate` |
| `identity` | `TrackingTokenService` | `issue`, `validate` |

Nunca `ServicesService`: a entidade do catálogo é `Service`; quem a mantém é `CatalogService`.

## 10. Convenções de escrita

- Status em texto (docs/vídeo): *Recebida*, *Em diagnóstico*, *Aguardando aprovação*, *Em execução*, *Finalizada*, *Entregue*, *Cancelada*.
- Datas/horas em UTC no banco e ISO-8601 na API (`2026-10-05T14:30:00Z`); valores monetários em BRL com 2 casas, tipo decimal.
- Mensagens de erro e `statusDescription` em português; nomes de campos no *Problem Details* em inglês (`errors[].field`).
