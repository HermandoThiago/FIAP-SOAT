# ADR-010 — Máquina de estados da OS: recusa do orçamento e cancelamento

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-14 encerrada em 22/09/2026 (Opção B, diferente da recomendação) |
| Tipo | Tipo 1 (regra de domínio central) |
| Decisores | Grupo — enquete **E-14** |
| Data | 2026-09-14 (proposta) · 2026-09-22 (decisão) |
| Relacionadas | PRD-003, PRD-004, ADR-012 |

## Contexto e problema

O enunciado fixa **6 status**: Recebida → Em diagnóstico → Aguardando aprovação → Em execução → Finalizada → Entregue, com
"alteração automática dos status conforme ações no sistema". Ele não diz o que acontece quando o cliente **recusa** o
orçamento nem se uma OS pode ser **cancelada**. Precisamos fechar isso porque afeta o agregado, os testes, o estoque e o
event storming (o hotspot mais visível do fluxo).

## Opções consideradas

### Opção A — Recusa devolve a OS para **Em diagnóstico** (sem status novo)

O mecânico revisa itens e reenvia o orçamento; se o cliente desistir, a OS fica em diagnóstico (ou é "entregue sem serviço").

- **Prós:** mantém exatamente os 6 status do enunciado; simples; permite renegociar.
- **Contras:** desistência definitiva não tem representação clara (OS "zumbi" em diagnóstico); estoque reservado precisa ser liberado de qualquer forma.

### Opção B — Novo status terminal **Cancelada** (7º), alcançável de Recebida / Em diagnóstico / Aguardando aprovação

Recusa do orçamento → Cancelada (com motivo). Cancelamento administrativo (`MANAGER`) também → Cancelada.

- **Prós:** estado final explícito; métricas limpas ("OS canceladas"); libera estoque de forma determinística.
- **Contras:** vai além da lista do enunciado (precisa ser apresentado como extensão justificada); sem renegociação direta (seria criar nova OS).

### Opção C — Combinação: recusa → **Em diagnóstico** (renegociação) **e** existe **Cancelada** (desistência/cancelamento administrativo)

- **Prós:** cobre os dois cenários reais da oficina; mantém os 6 status obrigatórios intactos + 1 extensão justificável.
- **Contras:** duas ações do cliente na recusa ("recusar e revisar" vs "recusar e cancelar") — ou uma ação com campo `withdrawn: true`.

## Tabela de transições da Opção C (referência; não adotada)

| De | Ação | Para |
|---|---|---|
| Aguardando aprovação | Recusar (`withdrawn=false`) | Em diagnóstico |
| Aguardando aprovação | Recusar (`withdrawn=true`) | Cancelada |
| Recebida / Em diagnóstico / Aguardando aprovação | Cancelar (`MANAGER`, motivo) | Cancelada |
| Em execução / Finalizada / Entregue | Cancelar | ❌ 409 |

## Recomendação (não vinculante)

**Opção C.** No vídeo, apresentar "Cancelada" como extensão consciente: "o enunciado define seis status; adicionamos um
estado terminal para desistência, mantendo os seis obrigatórios intactos".

## Decisão

**Novo status terminal `CANCELLED` (Cancelada)** — Opção B. A recusa do orçamento pelo cliente e o cancelamento
administrativo levam a OS para Cancelada; **não há volta para Em diagnóstico**. Renegociar = abrir uma **nova OS** para o
mesmo veículo (a OS cancelada deixa de contar como "em aberto" para a RN-039).

| De | Ação (comando) | Quem | Para | Efeitos |
|---|---|---|---|---|
| Aguardando aprovação | Recusar orçamento — `rejectQuote(reason)` | Cliente (token de acompanhamento ou login `CUSTOMER`, ADR-011) | **Cancelada** | `quote.status = REJECTED`, `respondedAt`, motivo; histórico com `actor = CUSTOMER` |
| Recebida / Em diagnóstico / Aguardando aprovação | Cancelar — `cancel(reason)` | `MANAGER` | **Cancelada** | motivo; histórico |
| Em execução / Finalizada / Entregue / Cancelada | Recusar ou Cancelar | — | ❌ `409` transição inválida | — |

Estoque: como a reserva só acontece na aprovação (ADR-012) e o cancelamento só é permitido **antes** dela, recusa e
cancelamento **não têm efeito no estoque** — não existe estorno no MVP.

No vídeo: "o enunciado define seis status; adicionamos um estado terminal para recusa e desistência, mantendo os seis
obrigatórios intactos".

## Consequências

- Enum `ServiceOrderStatus` com 7 valores; `StatusTransitionPolicy` implementa a tabela da PRD-004 §2; testes
  parametrizados cobrindo **todas** as combinações status × comando (válidas → novo estado; inválidas → erro de domínio).
- `rejectQuote(reason)` sem o campo `withdrawn`; rotas `POST /tracking/service-orders/{id}/quote/reject { reason }` e
  `POST /service-orders/{id}/cancel { reason }` (`MANAGER`) — `contrato-api.md` §3.4/§3.5.
- PRD-003: RF-042 (cancelar) passa de Could a **Should**; RF-043 (reabrir orçamento após recusa) vira **Won't**; RN-031
  deixa de mencionar "voltar a Em diagnóstico".
- Event storming: eventos *Orçamento recusado* e *OS cancelada*; a política "liberar reservas" sai do MVP (não há reserva
  antes da aprovação).
- Métricas: OS canceladas nunca têm `completedAt`, logo não entram no tempo médio; `GET /metrics/summary` (Could) as
  conta por status.

## Enquete (texto para o Discord)

> **Enquete E-14 — ADR-010 Orçamento recusado / cancelamento** (prazo 48 h)
> 🔁 Volta para Em diagnóstico · 🚫 Novo status Cancelada · 🔁🚫 Ambos (recomendada)
