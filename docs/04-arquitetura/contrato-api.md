# Contrato da API REST — implementação da Fase 1

Fonte: controllers, DTOs e serviços de `src/modules/`. O contrato executável é o OpenAPI code-first em `/docs-json`, com UI em `/docs`.

## Convenções

- Base local: `http://localhost:3001`, **sem `/api/v1`**.
- Identificadores mistos: rotas como `/customers`, `/service-orders` e `/itens`; campos como `usuarioNome` e `veiculoPlaca`.
- JSON, datas ISO-8601 UTC, ids UUID; número da OS é sequencial (`BigInt` no banco), não `OS-AAAA-NNNNNN`.
- Dinheiro: inteiro em **centavos** (`15000` = R$ 150,00). Quantidades de estoque: até três casas decimais; conferir a serialização nos DTOs/respostas.
- Paginação: `page` começa em 1 e `pageSize` define o tamanho. Os envelopes variam por recurso; não presumir um envelope único.

## Autenticação e acesso

`POST /auth/login` recebe `{ "email": "admin@oficina.local", "senha": "<SEED_PASSWORD>" }` e retorna `accessToken`, `refreshToken` e `tokenType`. No Swagger, colar somente o access token em **Authorize**.

| Credencial | Comportamento |
|---|---|
| JWT de acesso | HS256, claims `sub` e `role`; expiração padrão 15 min. Papéis: `Admin`, `Atendente`, `Mecanico`, `Cliente` |
| Refresh opaco | Hash SHA-256 persistido, rotação a cada uso e revogação da família no reuso; TTL padrão 7 dias |
| Token de acompanhamento | JWT `aud=tracking`, escopo de uma OS, expiração padrão 7 dias; aceito nas rotas `/tracking` |

`POST /auth/refresh` e `/auth/logout` recebem `{ "refreshToken": "…" }` **e exigem access token** pelo guard global. Logout responde 204 e revoga refresh, não o access JWT já emitido. Login/refresh verificam usuário ativo; o guard não consulta essa condição a cada requisição.

`POST /auth/register` é protegido (Admin/Atendente no controller); as restrições adicionais de perfil são aplicadas pelo serviço. Não é cadastro público. `/users` oferece consulta, `PATCH /users/{id}` e exclusão lógica por Admin.

## Recursos

| Recurso | Operações |
|---|---|
| `/customers` | POST, GET; GET/PUT/DELETE `/{id}`; GET `/{id}/vehicles` |
| `/vehicles` | POST, GET; GET/PUT/DELETE `/{id}` |
| `/services` | POST, GET; GET/PUT/DELETE `/{id}` |
| `/itens` | POST, GET; GET/PUT/DELETE `/{id}`; não existe `/parts` |
| `/itens/{id}/stock-movements` | POST movimentação manual; GET histórico |
| `/service-orders` | POST, GET; GET/PUT `/{id}`; não há DELETE físico de OS |
| `/service-orders/{id}/status-history` | GET histórico cronológico |
| `/service-orders/{id}/quote` | GET orçamento derivado dos itens |
| `/metrics/average-execution-time` | GET; filtros opcionais `from`, `to`, `serviceId` |

Payloads completos, filtros, códigos por operação e permissões de cadastros: [guia de uso](../../GUIA-DE-USO-E-TESTES.md#5-referência-completa-das-rotas) e Swagger. Campos obrigatórios vêm dos DTOs, não dos nomes conceituais dos PRDs históricos.

## OS: criação e comandos

Criação (Admin/Atendente):

```json
{
  "customerDocument": "52998224725",
  "veiculoId": "<UUID do veículo>",
  "mecanicoId": "<UUID do mecânico>",
  "ordemServicoDescricaoProblema": "Barulho ao frear"
}
```

Pode-se informar `clientId` em vez de `customerDocument`. O veículo deve pertencer ao cliente e não pode ter OS aberta. Cadastros são feitos antes da criação da OS.

| POST em `/service-orders/{id}` | Papel | Transição |
|---|---|---|
| `/diagnosis` | Admin/Mecanico | RECEBIDA → EM_DIAGNOSTICO |
| `/quote/send` | Admin/Mecanico | EM_DIAGNOSTICO → AGUARDANDO_APROVACAO |
| `/start-execution` | Admin/Mecanico | AGUARDANDO_EXECUCAO → EM_EXECUCAO |
| `/complete` | Admin/Mecanico | EM_EXECUCAO → FINALIZADA; baixa a reserva |
| `/deliver` | Admin/Atendente | FINALIZADA → ENTREGUE |
| `/cancel` | Admin | RECEBIDA, EM_DIAGNOSTICO ou AGUARDANDO_APROVACAO → CANCELADA; motivo no DTO |

Itens só são editáveis em RECEBIDA/EM_DIAGNOSTICO: POST `/{id}/items/services` e `/{id}/items/parts`; DELETE dos respectivos itens por `osServicoId`/`osItemId`. Admin/Mecanico. O preço unitário é congelado na inclusão; nomes continuam relacionados ao catálogo. Incluir peça **confere**, mas não reserva estoque. Envio exige orçamento com itens; não há reparo adicional/reabertura implementados.

## Acompanhamento do cliente

| Operação | Rota |
|---|---|
| GET | `/tracking/service-orders/{id}` |
| POST | `/tracking/service-orders/{id}/quote/approve` |
| POST | `/tracking/service-orders/{id}/quote/reject` com `{ "reason": "…" }` |

Aceita token de acompanhamento ou login Cliente. Equipe recebe 403; OS fora do escopo recebe 404. Consulta retorna projeção mascarada. Não há listagem `GET /tracking/service-orders`. O cliente logado também pode consultar `GET /service-orders/{id}`, com verificação de propriedade no serviço.

Aprovação leva a AGUARDANDO_EXECUCAO e reserva estoque atomicamente. Recusa leva a ORCAMENTO_RECUSADO, terminal, sem reserva prévia a liberar. Recusa e cancelamento administrativo são status distintos.

## Erros e limites

400: validação de entrada; 401: credencial ausente/inválida; 403: acesso proibido; 404: recurso inexistente/fora do escopo; 409: conflito/transição inválida; 422: regra de negócio, como estoque insuficiente. Respostas seguem as exceções do NestJS, sem envelope customizado universal.

Não existem `/health`, `/ready`, `/metrics/summary`, `If-Match` ou lock por coluna `version`. Swagger permanece exposto e CORS permissivo. Notificação do orçamento é simulada em log; em produção o token não retorna na resposta de envio, e não há entrega real por e-mail. Login Cliente é a alternativa de acesso implementada.
