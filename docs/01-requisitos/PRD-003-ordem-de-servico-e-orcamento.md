# PRD-003 — Ordem de serviço e orçamento (contexto `service-orders`, core)

| Campo | Valor |
|---|---|
| Status | Planejamento (ver *Situação da implementação*) |
| Dono | F3 (Domínio & API) · apoio F1 |
| Origem no enunciado | Bloco "Criação da Ordem de Serviço (OS)" completo; "A geração e aprovação do orçamento"; "A inclusão de serviços, peças e insumos" (itens do vídeo); §5 do enunciado de 23/09: "Registro da aprovação ou rejeição do orçamento" |
| Contexto DDD | `service-orders` (**core domain**) |

## Situação da implementação

> Planejamento original; onde o código difere, vale o código ([contrato](../04-arquitetura/contrato-api.md), [divergências das ADRs](../02-adr/README.md#leitura-das-divergências)). Nomes de status, papéis e rotas no texto abaixo são os do planejamento.

| Requisito | Situação |
|---|---|
| RF-030 cliente e veículo por id **ou** documento/placa | cliente por `clientId` ou `customerDocument`; veículo **só por `veiculoId`**; `mecanicoId` é obrigatório; sem serviços iniciais na criação |
| RF-031 número `OS-AAAA-NNNNNN` | número **sequencial** do banco, devolvido como texto |
| RF-037 aprovação → `Em execução` automática | aprovação → `AGUARDANDO_EXECUCAO` (reserva o estoque); `POST …/start-execution` leva a `EM_EXECUCAO` |
| RF-038 recusa → `Cancelada` | `ORCAMENTO_RECUSADO`, com motivo |
| RF-042 cancelar (Gerente) | **Admin**, com motivo, em Recebida, Em diagnóstico ou Aguardando aprovação |
| RF-043 reabrir orçamento | não implementado, como previsto |
| RN-035 `executionStartedAt` | não há coluna; marcos e tempos vêm do histórico de status |
| RN-039 uma OS aberta por veículo | verificado na aplicação; sem índice único no banco |
| RN-040 versão otimista (`version`) | **não existe**; transição por update condicionado ao status (perdedor → 409) |
| Peça incluída | confere disponibilidade, **não reserva** |
| Jornada "execução inicia automaticamente" e cenários Gherkin | usar os status do enum real (tabela no PRD-004); `RECEIVED`=`RECEBIDA` etc. |

## 1. Objetivo

Transformar um atendimento em uma **Ordem de Serviço** rastreável: identificar cliente e veículo, registrar o que foi
solicitado, diagnosticar, compor serviços + peças, **gerar o orçamento automaticamente**, enviar ao cliente e só executar
depois da **aprovação**.

## 2. Jornada (visão do atendimento)

```mermaid
journey
    title Jornada de uma OS
    section Recepção
      Cliente chega e informa CPF/CNPJ: 4: Atendente
      Veículo identificado ou cadastrado: 4: Atendente
      OS criada (Recebida): 5: Atendente, Sistema
    section Diagnóstico
      Mecânico inicia diagnóstico: 4: Mecânico
      Inclui serviços e peças (com estoque disponível): 4: Mecânico
      Orçamento recalculado automaticamente: 5: Sistema
    section Aprovação
      Orçamento enviado ao cliente (token de acompanhamento): 4: Mecânico, Sistema
      Cliente consulta e aprova (peças reservadas): 5: Cliente
    section Execução e entrega
      Execução inicia automaticamente: 5: Sistema
      Mecânico finaliza (peças baixadas): 4: Mecânico
      Atendente registra entrega: 5: Atendente
```

## 3. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-030 | Criar OS informando cliente (por id **ou** documento), veículo (por id **ou** placa), descrição do problema/solicitação e, opcionalmente, serviços iniciais solicitados | Must |
| RF-031 | OS nasce em **Recebida** com número legível (`OS-AAAA-NNNNNN`) e data/hora de recebimento | Must |
| RF-032 | Iniciar diagnóstico (→ **Em diagnóstico**) | Must |
| RF-033 | Incluir/remover **serviços** na OS (quantidade, snapshot de preço) enquanto em Recebida/Em diagnóstico | Must |
| RF-034 | Incluir/remover **peças e insumos** na OS (quantidade, snapshot de preço; verificação de disponibilidade — sem estoque → 422, ADR-012) enquanto em Recebida/Em diagnóstico | Must |
| RF-035 | **Orçamento gerado automaticamente**: total = Σ(serviços × qtd) + Σ(peças × qtd); recalculado a cada alteração de itens | Must |
| RF-036 | **Enviar orçamento ao cliente** para aprovação (→ **Aguardando aprovação**); OS precisa ter ≥ 1 item; gera o token de acompanhamento (ADR-011); notificação simulada | Must |
| RF-037 | Cliente **aprova** o orçamento (→ **Em execução**, automático; reserva as peças — ADR-012) | Must |
| RF-038 | Cliente **recusa** o orçamento, com motivo (→ **Cancelada**, ADR-010) — o registro da rejeição é obrigatório no enunciado de 23/09 | Must |
| RF-039 | Mecânico **finaliza** a execução (→ **Finalizada**; baixa as peças reservadas — ADR-012) | Must |
| RF-040 | Atendente registra a **entrega** do veículo (→ **Entregue**) | Must |
| RF-041 | Detalhar OS: dados do cliente/veículo, itens, orçamento (valor, status, datas), status atual, histórico, motivo de cancelamento | Must |
| RF-042 | Gerente **cancela** a OS (só em Recebida/Em diagnóstico/Aguardando aprovação) com motivo → **Cancelada** (ADR-010) | Should |
| RF-043 | Reabrir orçamento após recusa (voltar a Em diagnóstico e reenviar) | Won't — ADR-010: renegociar = abrir nova OS para o mesmo veículo |

## 4. Regras de negócio

| ID | Regra |
|---|---|
| RN-030 | Uma OS pertence a exatamente um cliente e um veículo; o veículo deve pertencer ao cliente |
| RN-031 | Itens só podem ser alterados em **Recebida** ou **Em diagnóstico**; após enviar o orçamento, os itens ficam congelados — se precisar mudar, o cliente recusa (ou o gerente cancela) e abre-se uma nova OS (ADR-010) |
| RN-032 | O orçamento é **derivado** dos itens (nunca digitado); total com 2 casas decimais; quantidade de serviço ≥ 1; de peça > 0 |
| RN-033 | Enviar orçamento exige pelo menos 1 item e total > 0 |
| RN-034 | Aprovação/recusa só é válida em **Aguardando aprovação** e só pelo cliente da OS — token de acompanhamento daquela OS ou login com papel `CUSTOMER` do mesmo cliente (ADR-011); registra data/hora e `actor = CUSTOMER` no histórico |
| RN-035 | Aprovação dispara automaticamente: status → Em execução; **reserva** de estoque das peças da OS, tudo ou nada, na mesma transação (ADR-012 — sem disponibilidade: 422 e a OS continua aguardando); `executionStartedAt = agora` |
| RN-036 | Finalizar só em Em execução; registra `completedAt` (base do tempo médio — PRD-006) e **baixa** as peças reservadas na mesma transação (ADR-012) |
| RN-037 | Entregar só em Finalizada; registra `deliveredAt`; OS entregue é imutável |
| RN-038 | Toda transição gera um registro de histórico (de, para, quando, quem, motivo) — PRD-004 |
| RN-039 | Não pode existir mais de uma OS **em aberto** (status ≠ Entregue/Cancelada) para o mesmo veículo (Should; evita duplicidade) |
| RN-040 | Concorrência: alterações na OS usam versão otimista (`version`) — duas ações simultâneas não corrompem o estado |
| RN-041 | Recusa e cancelamento são terminais (Cancelada) e **não** mexem no estoque: só acontecem antes da aprovação, logo antes de qualquer reserva (ADR-010 + ADR-012) |

## 5. Critérios de aceite (Gherkin)

```gherkin
Funcionalidade: Criação e orçamento da OS
  Cenário: Criar OS a partir do documento do cliente
    Dado que estou autenticado como ATTENDANT
    E existe cliente com CPF "52998224725" e veículo "ABC1D23"
    Quando crio uma OS para o CPF "52998224725", placa "ABC1D23", descrição "barulho ao frear"
    Então a OS é criada com status "RECEIVED", número "OS-2026-000001" e "receivedAt" preenchido

  Cenário: Orçamento recalculado ao incluir itens
    Dado uma OS em "IN_DIAGNOSIS" sem itens
    Quando incluo o serviço "Troca de pastilhas" (R$ 150,00 × 1)
    E incluo a peça "Pastilha de freio" (R$ 90,00 × 2)
    Então o orçamento da OS é R$ 330,00

  Cenário: Peça sem estoque não entra na OS
    Dado uma OS em "IN_DIAGNOSIS" e a peça "Amortecedor" com disponibilidade 0
    Quando incluo 2 unidades de "Amortecedor"
    Então a resposta é 422 "estoque insuficiente" e o orçamento não muda

  Cenário: Enviar orçamento sem itens é rejeitado
    Dado uma OS em "IN_DIAGNOSIS" sem itens
    Quando envio o orçamento para aprovação
    Então a resposta é 422 "orçamento sem itens"

  Cenário: Aprovação inicia a execução e reserva as peças
    Dado uma OS em "AWAITING_APPROVAL" com orçamento R$ 330,00 e 2 unidades de "Pastilha de freio" (estoque 12)
    Quando o cliente aprova o orçamento com o token de acompanhamento
    Então o status passa a "IN_PROGRESS"
    E "executionStartedAt" é registrado
    E a quantidade reservada de "Pastilha de freio" passa a 2 e a disponibilidade a 10

  Cenário: Finalização baixa as peças reservadas
    Dado uma OS em "IN_PROGRESS" com 2 unidades de "Pastilha de freio" reservadas (estoque 12)
    Quando o mecânico finaliza a execução
    Então o status passa a "COMPLETED", "completedAt" é registrado
    E o estoque de "Pastilha de freio" passa a 10 e a quantidade reservada a 0

  Cenário: Recusa cancela a OS
    Dado uma OS em "AWAITING_APPROVAL"
    Quando o cliente recusa o orçamento com o motivo "muito caro"
    Então o status passa a "CANCELLED", o orçamento fica "REJECTED" e o estoque não muda

  Cenário: Itens congelados após envio
    Dado uma OS em "AWAITING_APPROVAL"
    Quando tento incluir um serviço
    Então a resposta é 409 "itens não podem ser alterados neste status"
```

## 6. API (resumo)

| Método | Rota | Papel | Efeito |
|---|---|---|---|
| POST | `/service-orders` | ATTENDANT+ | Cria (Recebida) |
| GET | `/service-orders/{id}` | ATTENDANT+ | Detalha (itens, orçamento, histórico) |
| POST | `/service-orders/{id}/diagnosis` | MECHANIC+ | Recebida → Em diagnóstico |
| POST | `/service-orders/{id}/items/services` | MECHANIC+ | Inclui serviço `{serviceId, quantity}` |
| DELETE | `/service-orders/{id}/items/services/{itemId}` | MECHANIC+ | Remove |
| POST | `/service-orders/{id}/items/parts` | MECHANIC+ | Inclui peça `{partId, quantity}` (422 sem estoque) |
| DELETE | `/service-orders/{id}/items/parts/{itemId}` | MECHANIC+ | Remove |
| GET | `/service-orders/{id}/quote` | ATTENDANT+ | Orçamento atual (calculado) |
| POST | `/service-orders/{id}/quote/send` | MECHANIC+ | Em diagnóstico → Aguardando aprovação (gera token de acompanhamento) |
| POST | `/service-orders/{id}/complete` | MECHANIC+ | Em execução → Finalizada (baixa das peças reservadas) |
| POST | `/service-orders/{id}/deliver` | ATTENDANT+ | Finalizada → Entregue |
| POST | `/service-orders/{id}/cancel` | MANAGER | Recebida/Em diagnóstico/Aguardando aprovação → Cancelada (Should, ADR-010) |
| POST | `/tracking/service-orders/{id}/quote/approve` | Cliente (ADR-011) | Aguardando aprovação → Em execução (reserva das peças) |
| POST | `/tracking/service-orders/{id}/quote/reject` | Cliente (ADR-011) | Aguardando aprovação → Cancelada (ADR-010) |

## 7. Modelo (resumo — agregado `ServiceOrder`)

`id`, `number`, `customerId`, `vehicleId`, `problemDescription`, `status`, `serviceItems[] {id, serviceId, nameSnapshot,
priceSnapshot, quantity}`, `partItems[] {id, partId, nameSnapshot, unitPriceSnapshot, quantity}`,
`quote {totalAmount, status (PENDING|SENT|APPROVED|REJECTED), sentAt, respondedAt}`, marcos temporais
(`receivedAt`, `diagnosisStartedAt`, `quoteSentAt`, `executionStartedAt`, `completedAt`, `deliveredAt`),
`cancellationReason`, `statusHistory[]`, `version`, `createdBy`.

Invariantes e detalhes em `docs/ddd/agregados.md`.

## 8. Fora de escopo

Orçamento parcial/itens opcionais aprovados separadamente; descontos; pagamento; garantia; múltiplos veículos por OS;
reabertura/renegociação de orçamento recusado (nova OS).

## 9. Questões abertas

| # | Questão | Situação |
|---|---|---|
| Q1 | Recusa do orçamento: voltar a diagnóstico ou Cancelada | ✅ E-14 / ADR-010 — Cancelada (terminal) |
| Q2 | Acesso do cliente para aprovar | ✅ E-15 / ADR-011 — token de acompanhamento ou login `CUSTOMER` |
| Q3 | Baixa de estoque na aprovação vs. finalização | ✅ E-16 / ADR-012 — reserva na aprovação, baixa na finalização |
| Q4 | Permitir criar OS já com serviços "solicitados" pelo cliente (RF-030) e diferenciar de "diagnosticados"? | Proposta: sim, campo `origin = REQUESTED\|DIAGNOSED` no item (Could) — fechar na revisão do PRD |

## 10. Evidências

Demonstração no Swagger do fluxo completo (bloco central do vídeo, ~3 min); testes unitários do agregado (transições,
cálculo, congelamento, cancelamento); teste de integração ponta a ponta (aprovar reserva, finalizar baixa); BDD dos
cenários acima com Cucumber-js (ADR-006).
