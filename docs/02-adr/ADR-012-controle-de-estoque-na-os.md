# ADR-012 — Momento da baixa de estoque e comportamento sem estoque

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 3) |
| Tipo | Tipo 1 (regra de domínio) |
| Decisores | Grupo — enquete **E-16** |
| Data | 2026-09-14 |
| Relacionadas | PRD-002, PRD-003, ADR-010, `docs/03-ddd/event-storming.md` |

## Contexto e problema

"CRUD de peças e insumos, com controle de estoque" + "possibilidade de incluir peças e insumos necessários" na OS. O
estoque precisa refletir o consumo das OS, mas **quando**? E o que fazer quando a peça não está disponível? Isso define
eventos/políticas do event storming e a transação da aprovação do orçamento. Na Fase 4, esta interação (OS ↔ estoque)
é o candidato natural a **SAGA**, então vale deixá-la explícita como política de domínio.

## Opções consideradas

### Opção A — **Baixa na aprovação do orçamento** (início da execução)

Aprovou → `SAIDA` de estoque para cada peça, na mesma transação da mudança de status.

- **Prós:** uma única regra; sem estado intermediário; estoque reflete "peças comprometidas"; fácil de testar e explicar.
- **Contras:** se a OS for cancelada depois de aprovada (raro; ADR-010 não permite cancelar em execução) exige estorno manual (`AJUSTE`).

### Opção B — **Reserva na aprovação + baixa na finalização**

Aprovou → `RESERVA`; finalizou → `SAIDA` (e libera reserva); cancelou → `LIBERACAO`.

- **Prós:** mais fiel à operação real (peça só sai quando usada); permite ajustar quantidade durante a execução.
- **Contras:** duas quantidades por peça (`estoque`, `reservado`), três movimentações, mais regras/testes; disponível = estoque − reservado em toda verificação.

### Opção C — **Baixa só na finalização**

- **Prós:** simples.
- **Contras:** duas OS podem "usar" a mesma peça até finalizar (overbooking); controle de estoque fraco — difícil de defender.

## Comportamento sem estoque (sub-decisão)

| Escolha | Efeito |
|---|---|
| ⛔ **Bloquear** a inclusão de peça sem disponibilidade (422 `estoque insuficiente`) | Simples e coerente com "controle de estoque"; exige registrar entrada antes |
| ⚠️ **Permitir** com sinalização (`aguardandoPeca=true`) e bloquear só o **envio do orçamento** | Mais flexível; mais estados para explicar |

## Recomendação (não vinculante)

**Opção A + bloquear**, com movimentações registradas (`ENTRADA`, `SAIDA`, `AJUSTE`) e verificação de disponibilidade
na inclusão **e** novamente na aprovação (o estoque pode ter mudado). Se sobrar tempo, evoluir para B (reserva) como
"Could" — o modelo de movimentações já suporta.

## Decisão

> Preencher após a enquete E-16.

## Consequências

- `AprovarOrcamento` é um caso de uso transacional que toca dois módulos (atendimento + estoque) via porta de aplicação —
  documentar como o ponto que virará SAGA na Fase 4 (`docs/04-arquitetura/evolucao-fases.md`).
- Invariante `quantidadeEstoque ≥ 0` também como constraint no banco.

## Enquete (texto para o Discord)

> **Enquete E-16 — ADR-012 Estoque** (prazo 48 h)
> ✅ Baixa na aprovação (recomendada) · 📌 Reserva na aprovação + baixa na finalização · 🏁 Baixa só na finalização
> Sem estoque ao incluir peça: ⛔ bloqueia (recomendada) · ⚠️ permite e sinaliza
