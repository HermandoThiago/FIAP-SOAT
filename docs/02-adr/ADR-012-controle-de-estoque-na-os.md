# ADR-012 — Momento da baixa de estoque e comportamento sem estoque

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-16 encerrada em 22/09/2026: Opção B (reserva na aprovação + baixa na finalização, diferente da recomendação) + bloquear inclusão sem estoque (422) |
| Tipo | Tipo 1 (regra de domínio) |
| Decisores | Grupo — enquete **E-16** (duas perguntas: momento e comportamento sem estoque) |
| Data | 2026-09-14 (proposta) · 2026-09-22 (decisão) |
| Relacionadas | PRD-002, PRD-003, ADR-010, `docs/03-ddd/event-storming.md` |

## Contexto e problema

"CRUD de peças e insumos, com controle de estoque" + "possibilidade de incluir peças e insumos necessários" na OS. O
estoque precisa refletir o consumo das OS, mas **quando**? E o que fazer quando a peça não está disponível? Isso define
eventos/políticas do event storming e a transação da aprovação do orçamento. Na Fase 4, esta interação (OS ↔ estoque)
é o candidato natural a **SAGA**, então vale deixá-la explícita como política de domínio.

## Opções consideradas

### Opção A — **Baixa na aprovação do orçamento** (início da execução)

Aprovou → `OUTBOUND` de estoque para cada peça, na mesma transação da mudança de status.

- **Prós:** uma única regra; sem estado intermediário; estoque reflete "peças comprometidas"; fácil de testar e explicar.
- **Contras:** se a OS for cancelada depois de aprovada (raro; ADR-010 não permite cancelar em execução) exige estorno manual (`ADJUSTMENT`).

### Opção B — **Reserva na aprovação + baixa na finalização**

Aprovou → `RESERVATION`; finalizou → `OUTBOUND` (e libera reserva); cancelou → `RELEASE`.

- **Prós:** mais fiel à operação real (peça só sai quando usada); permite ajustar quantidade durante a execução.
- **Contras:** duas quantidades por peça (`estoque`, `reservado`), três movimentações, mais regras/testes; disponível = estoque − reservado em toda verificação.

### Opção C — **Baixa só na finalização**

- **Prós:** simples.
- **Contras:** duas OS podem "usar" a mesma peça até finalizar (overbooking); controle de estoque fraco — difícil de defender.

## Comportamento sem estoque (sub-decisão)

| Escolha | Efeito |
|---|---|
| ⛔ **Bloquear** a inclusão de peça sem disponibilidade (422 `estoque insuficiente`) | Simples e coerente com "controle de estoque"; exige registrar entrada antes |
| ⚠️ **Permitir** com sinalização (`awaitingPart=true`) e bloquear só o **envio do orçamento** | Mais flexível; mais estados para explicar |

## Recomendação (não vinculante)

**Opção A + bloquear**, com movimentações registradas (`INBOUND`, `OUTBOUND`, `ADJUSTMENT`) e verificação de disponibilidade
na inclusão **e** novamente na aprovação (o estoque pode ter mudado). Se sobrar tempo, evoluir para B (reserva) como
"Could" — o modelo de movimentações já suporta.

## Decisão

**Reserva na aprovação + baixa na finalização** (Opção B) e **bloqueio** da inclusão de peça sem estoque disponível
(`422 estoque insuficiente`).

| Momento | Comando | Movimentação | Efeito em `Part` |
|---|---|---|---|
| Incluir peça na OS (`RECEIVED`/`IN_DIAGNOSIS`) | `addPartItem` | nenhuma — só verifica `availableQuantity ≥ quantity` | — (`422 estoque insuficiente` se não houver disponibilidade; peça inativa também é 422) |
| Cliente aprova o orçamento | `approveQuote` → `PartsService.reserveForServiceOrder(items)` | `RESERVATION` por item, **tudo ou nada**, na mesma transação da transição para `IN_PROGRESS` | `reservedQuantity += qty`. Se a disponibilidade mudou desde o orçamento: `422 estoque insuficiente` e a OS continua `AWAITING_APPROVAL` |
| Mecânico finaliza | `complete` → `PartsService.withdrawReservedForServiceOrder(items)` | `OUTBOUND` por item, na mesma transação da transição para `COMPLETED` | `stockQuantity −= qty` e `reservedQuantity −= qty` |
| Recusa / cancelamento | `rejectQuote` / `cancel` | nenhuma — só acontecem antes da aprovação (ADR-010) | — |
| Liberação sem consumo | — | `RELEASE` existe no modelo e no agregado (`release()`), **sem gatilho no MVP** (Could: cancelamento administrativo após a aprovação) | `reservedQuantity −= qty` |

Definições: `availableQuantity = stockQuantity − reservedQuantity`; invariantes `stockQuantity ≥ 0` e
`0 ≤ reservedQuantity ≤ stockQuantity` no agregado **e** como `CHECK` no banco (`modelo-de-dados.md` §3). Estoque só muda
por método do agregado que gera `StockMovement` (`INBOUND`, `OUTBOUND`, `RESERVATION`, `RELEASE`, `ADJUSTMENT`); `PUT /parts`
nunca altera quantidades. O alerta de estoque abaixo do mínimo (Could) considera `stockQuantity` após a baixa.

## Consequências

- Dois pontos transacionais entre módulos, ambos em `ServiceOrdersService` com transação interativa do Prisma:
  `approveQuote` (reserva) e `complete` (baixa) — são os candidatos a SAGA na Fase 4 (`evolucao-fases.md`).
- Eventos: `StockReserved` (novo) e `StockWithdrawn`; `ReservationReleased` fica sem gatilho no MVP.
- `GET /parts/{id}` expõe `stockQuantity`, `reservedQuantity` e `availableQuantity`; o vídeo mostra a reserva após aprovar
  (bloco 8) e a baixa após finalizar (bloco 9).
- PRD-002 (RF-024/RF-025, RN-023, cenários), PRD-003 (RN-035/RN-036, cenários), PRD-004 (efeitos da tabela de
  transições), `fluxos.md` §3/§4, `event-storming.md`, `domain-storytelling.md` e `estrategia-de-testes.md` atualizados em
  22/09/2026.

## Enquete (texto para o Discord)

> **Enquete E-16 — ADR-012 Estoque** (prazo 48 h)
> ✅ Baixa na aprovação (recomendada) · 📌 Reserva na aprovação + baixa na finalização · 🏁 Baixa só na finalização
> Sem estoque ao incluir peça: ⛔ bloqueia (recomendada) · ⚠️ permite e sinaliza
