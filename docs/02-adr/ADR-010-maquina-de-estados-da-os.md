# ADR-010 — Máquina de estados da OS: recusa do orçamento e cancelamento

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 3) |
| Tipo | Tipo 1 (regra de domínio central) |
| Decisores | Grupo — enquete **E-14** |
| Data | 2026-09-14 |
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

## Tabela de transições resultante (Opção C)

| De | Ação | Para |
|---|---|---|
| Aguardando aprovação | Recusar (`withdrawn=false`) | Em diagnóstico |
| Aguardando aprovação | Recusar (`withdrawn=true`) | Cancelada |
| Recebida / Em diagnóstico / Aguardando aprovação | Cancelar (`MANAGER`, motivo) | Cancelada |
| Em execução / Finalizada / Entregue | Cancelar | ❌ 409 |

Efeitos: qualquer entrada em Cancelada ou volta para Em diagnóstico libera reservas de estoque (se ADR-012 = reserva).

## Recomendação (não vinculante)

**Opção C.** No vídeo, apresentar "Cancelada" como extensão consciente: "o enunciado define seis status; adicionamos um
estado terminal para desistência, mantendo os seis obrigatórios intactos".

## Decisão

> Preencher após a enquete E-14.

## Consequências

- Enum `ServiceOrderStatus` com 6 (+1) valores; testes parametrizados cobrindo **todas** as combinações (válidas → novo estado; inválidas → erro de domínio).
- Event storming: eventos *Orçamento recusado* e *OS cancelada* + política *liberar reservas*.

## Enquete (texto para o Discord)

> **Enquete E-14 — ADR-010 Orçamento recusado / cancelamento** (prazo 48 h)
> 🔁 Volta para Em diagnóstico · 🚫 Novo status Cancelada · 🔁🚫 Ambos (recomendada)
