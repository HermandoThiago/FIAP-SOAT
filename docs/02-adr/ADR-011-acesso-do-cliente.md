# ADR-011 — Acesso do cliente para consultar a OS e aprovar o orçamento

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 3) |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-15** |
| Data | 2026-09-14 |
| Relacionadas | PRD-003, PRD-004, PRD-005, ADR-004, ADR-009 |

## Contexto e problema

O enunciado pede "envio do orçamento ao cliente para aprovação" e "permitir consulta por parte do cliente via API para
acompanhar o progresso". O JWT é exigido para APIs **administrativas**; o cliente não é funcionário. Precisamos de um
mecanismo simples, seguro (cliente só vê a própria OS) e demonstrável no vídeo sem front-end nem e-mail real.

## Opções consideradas

### Opção A — **Token de acompanhamento** assinado (link mágico simulado)

Ao enviar o orçamento, o sistema gera um JWT de escopo `cliente` (`sub = serviceOrderId`, `aud = customer`, `documentHash`, `exp = 7 dias`) e o
"envia" pela porta de notificação (adaptador fake escreve no log e/ou devolve na resposta administrativa em ambiente de
demonstração). O cliente chama `GET /tracking/service-orders/{id}` e `POST …/quote/approve` com
`Authorization: Bearer <trackingToken>`.

- **Prós:** sem senha para o cliente; escopo restrito a uma OS; demonstra porta/adaptador (notificação) e JWT com
  audiências diferentes; sem enumeração; expira.
- **Contras:** no vídeo é preciso mostrar de onde o token sai (log/resposta); token vazado = acesso à OS até expirar.

### Opção B — Endpoint público com **número da OS + CPF/CNPJ** (sem token)

`GET /tracking/service-orders/{number}?document=…`; aprovar com o mesmo par.

- **Prós:** simplíssimo de demonstrar no Swagger.
- **Contras:** CPF vira "senha" (dado sensível em query string/logs); enumeração mitigada apenas por UUID + rate limit; aprovação por quem conhece o par.

### Opção C — Login completo de cliente (JWT com papel `CUSTOMER`, senha própria)

- **Prós:** modelo "app do cliente" completo.
- **Contras:** cadastro de senha, recuperação, mais superfície — escopo além do MVP.

## Recomendação (não vinculante)

**Opção A.** Ela cumpre "envio do orçamento ao cliente" de forma tangível (o envio gera o token), mantém a segurança
coerente com Desenvolvimento Seguro e reaproveita o validador JWT da ADR-004 com `aud = cliente`. Para facilitar a demo,
em `APP_ENV=dev` a resposta de `POST /service-orders/{id}/quote/send` inclui `trackingUrl` com o token.

## Decisão

> Preencher após a enquete E-15.

## Consequências

- Porta `CustomerNotifier` com adaptador `LogCustomerNotifier` (Fase 1) → e-mail/SNS/WhatsApp em fases futuras.
- Rotas `/tracking/**` fora do filtro de JWT administrativo, com validação própria (`aud`, `serviceOrderId`).
- Respostas ao cliente mascaram documento e não expõem ids de usuários internos.

## Enquete (texto para o Discord)

> **Enquete E-15 — ADR-011 Acesso do cliente** (prazo 48 h)
> 🔗 Token de acompanhamento gerado no envio do orçamento (recomendada) · 🪪 Número da OS + CPF/CNPJ · 👤 Login de cliente
