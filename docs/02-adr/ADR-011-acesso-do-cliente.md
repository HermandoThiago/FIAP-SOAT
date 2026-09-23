# ADR-011 — Acesso do cliente para consultar a OS e aprovar o orçamento

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-15 encerrada em 22/09/2026: Opção A **combinada com** Opção C |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-15** |
| Data | 2026-09-14 (proposta) · 2026-09-22 (decisão) |
| Relacionadas | PRD-003, PRD-004, PRD-005, ADR-004, ADR-009, ADR-010 |

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

**Token de acompanhamento (Opção A) + login de cliente (Opção C), combinados.** Os dois caminhos levam às mesmas rotas
`/tracking/**` e às mesmas regras de propriedade; o que muda é a credencial:

| Caminho | Credencial | Como o cliente obtém | Alcance | Prioridade |
|---|---|---|---|---|
| **Token de acompanhamento** | JWT `aud=tracking`, `sub=serviceOrderId`, `exp` 7 dias, emitido pelo mesmo emissor da ADR-004 (`TrackingTokenService`) | Gerado em `POST /service-orders/{id}/quote/send` e "enviado" pela porta de notificação (`LogCustomerNotifier`: log; em `APP_ENV=dev` também na resposta, em `tracking.url`) | **Uma OS**: consultar, aprovar, recusar | **Must** — cobre "envio do orçamento ao cliente" e "consulta do cliente" do enunciado |
| **Login de cliente** | JWT de `POST /auth/login` com `roles=["CUSTOMER"]` e claim `customerId` (ADR-004) | Usuário com papel `CUSTOMER` vinculado a um `customerId`, criado por `ATTENDANT`/`MANAGER` em `POST /users` (ou pelo seed de demonstração) | **Todas as OS do cliente**: listar (`GET /tracking/service-orders`), consultar, aprovar, recusar | **Should** — extensão votada; só cai pelas regras de corte do cronograma §4 |

Regras comuns:

- O guard de `/tracking/**` aceita **qualquer** das duas credenciais e rejeita JWT de equipe (`ATTENDANT`/`MECHANIC`/
  `MANAGER` usam as rotas administrativas, que por sua vez rejeitam `CUSTOMER` com 403).
- Propriedade verificada no serviço de aplicação (`TrackingService`): token de acompanhamento → `sub` = `{id}` da rota;
  login → `customerId` do token = `customerId` da OS. Caso contrário **404** (não revela existência).
- Respostas ao cliente mascaram documento e placa e não expõem ids internos de usuários (`Tracking`, `contrato-api.md` §3.5).
- Usuário `CUSTOMER` não acumula outros papéis; senha com bcrypt como qualquer usuário. Recuperação de senha e cadastro
  autônomo (self-service) ficam **fora** do MVP (Won't).
- Rate limit básico em `POST /auth/login` e em `/tracking/**` (Should).

## Consequências

- `identity`: `Role.CUSTOMER`; `User.customerId` (obrigatório se, e só se, o papel é `CUSTOMER`); `TrackingTokenService`
  (emite/valida `aud=tracking`); `UsersService.register` aceita `CUSTOMER` + `customerId` e valida a existência do cliente
  pelo `CustomersService` exportado pelo módulo `customers`.
- `service-orders`: `TrackingService` (`getTracking`, `listMine`, `approveQuote`, `rejectQuote`) e `TrackingController`;
  `CustomerNotifier` com implementação `LogCustomerNotifier` (Fase 1) → e-mail/SNS/WhatsApp nas fases seguintes.
- Seed: 1 usuário `CUSTOMER` ligado ao cliente da OS que fica "aguardando aprovação" na demo — o vídeo mostra os dois
  caminhos (token no log e login do cliente).
- Docs atualizados em 22/09: `contrato-api.md` §1/§3.1/§3.5, `modelo-de-dados.md` (`users.customer_id`),
  `linguagem-ubiqua.md` §5, PRD-004 (RF-053, RN-054) e PRD-005 (RF-066, RF-068).

## Enquete (texto para o Discord)

> **Enquete E-15 — ADR-011 Acesso do cliente** (prazo 48 h)
> 🔗 Token de acompanhamento gerado no envio do orçamento (recomendada) · 🪪 Número da OS + CPF/CNPJ · 👤 Login de cliente
