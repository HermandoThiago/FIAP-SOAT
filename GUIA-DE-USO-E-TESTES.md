# Guia de uso e testes — SGO (Tech Challenge Fase 1 · Grupo 49)

Guia para quem vai **subir a aplicação, testar cada requisito do desafio e gravar o vídeo**, sem precisar conhecer o
código. Tudo aqui foi executado de ponta a ponta contra a API real.

**Sumário**

1. [O que é o sistema](#1-o-que-é-o-sistema)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Subir a aplicação](#3-subir-a-aplicação)
4. [Usuários de demonstração e autenticação](#4-usuários-de-demonstração-e-autenticação)
5. [Referência completa das rotas](#5-referência-completa-das-rotas)
6. [Ciclo de vida da OS (status e comandos)](#6-ciclo-de-vida-da-os-status-e-comandos)
7. [Roteiro passo a passo — fluxo completo](#7-roteiro-passo-a-passo--fluxo-completo)
8. [Cenários extras (recusa, estoque, permissões, cancelamento)](#8-cenários-extras)
9. [Requisitos do desafio → como demonstrar](#9-requisitos-do-desafio--como-demonstrar)
10. [Testes automatizados](#10-testes-automatizados)
11. [Roteiro para gravar o vídeo](#11-roteiro-para-gravar-o-vídeo)
12. [Problemas comuns](#12-problemas-comuns)

---

## 1. O que é o sistema

Back-end monolítico (API REST) de uma oficina mecânica: clientes, veículos, catálogo de serviços, peças/insumos com
estoque, **ordem de serviço (OS)**, **orçamento** com aprovação do cliente e acompanhamento por status.

- **Stack:** TypeScript · NestJS · Prisma · PostgreSQL 16 · JWT · Docker.
- **Porta padrão:** `http://localhost:3001` · **Swagger:** `http://localhost:3001/docs`.
- **Valores em dinheiro:** sempre **inteiros em centavos** (`15000` = R$ 150,00).
- **Datas:** UTC, ISO-8601. **Quantidades de estoque:** até 3 casas decimais.
- **Nomes de rotas e campos** estão em português nos campos (`usuarioNome`, `veiculoPlaca`, `ordemServicoStatus`…) e
  alguns caminhos em inglês (`/service-orders`, `/customers`). Peças e insumos ficam em **`/itens`** (não `/parts`).
- **Erros** seguem o padrão do NestJS: `{ "statusCode": 409, "message": "…", "error": "Conflict" }`.
  Códigos: `400` payload inválido · `401` sem login · `403` papel sem permissão · `404` não encontrado ·
  `409` conflito/transição inválida · `422` regra de negócio (ex.: estoque insuficiente).

## 2. Pré-requisitos

| Para | Precisa de |
|---|---|
| Só rodar e testar a API | **Docker** e **Docker Compose v2** (`docker compose version`), `curl` e `jq` |
| Rodar os testes automatizados | **Node 22+**, **pnpm 10** (`corepack enable`), Docker em execução |

Instalar o `jq`: macOS `brew install jq` · Ubuntu `sudo apt install jq`. Os comandos `curl` deste guia usam `jq` e
`python3` (para gerar CPF e placa válidos). Se preferir, faça tudo pelo **Swagger** (seção 4.3).

## 3. Subir a aplicação

### 3.1 Tudo em contêineres (recomendado, é o que vai no vídeo)

```bash
git clone <URL-DO-REPOSITORIO> && cd FIAP-SOAT
git checkout <BRANCH-OU-TAG-DA-ENTREGA>     # a mesma informada no PDF
cp .env.example .env                        # valores de demonstração, todos fictícios
docker compose up --build
```

O compose sobe, **em ordem**:

1. `database` — PostgreSQL 16 (aguarda ficar saudável);
2. `migrate` — aplica as migrações do Prisma e o **seed** de demonstração e termina (`Seed concluído.`);
3. `api` — só inicia depois que o `migrate` terminou com sucesso.

A API está pronta quando o log mostrar `Nest application successfully started` (a primeira execução leva alguns minutos
para baixar imagens e compilar). Conferir:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/docs    # esperado: 200
docker compose ps                                                      # api: healthy
```

Para rodar em segundo plano: `docker compose up --build -d` · ver logs: `docker compose logs -f api`.

| Ação | Comando |
|---|---|
| Parar (mantém os dados) | `docker compose down` |
| **Zerar tudo** (apaga o banco e recria do zero) | `docker compose down -v` |
| Reaplicar migrações + seed | `docker compose run --rm migrate` |
| Porta ocupada | no `.env`, mude `API_PORT` (API) e/ou `POSTGRES_PORT` (banco) |

### 3.2 Desenvolvimento local (só o banco no Docker)

```bash
cp .env.example .env
docker compose up -d database
pnpm install                # gera o client do Prisma (postinstall)
pnpm prisma:deploy          # aplica as migrações
pnpm db:seed                # dados de demonstração (idempotente)
pnpm start:dev              # http://localhost:3001, com hot reload
```

### 3.3 Dados criados pelo seed

- **4 usuários** (um por papel — seção 4) e **1 veículo** (`ABC1D23`) do cliente de demonstração;
- **4 serviços:** Troca de óleo (R$ 150,00), Alinhamento (R$ 80,00), Balanceamento (R$ 60,00), Revisão completa (R$ 450,00);
- **4 itens de estoque:** Filtro de óleo (PEÇA, 20 un, R$ 35,00), Pastilha de freio (PEÇA, 12 un, R$ 120,00),
  Óleo 5W30 (INSUMO, 80 L, R$ 45,00), Aditivo de radiador (INSUMO, 30 L, R$ 25,00).

## 4. Usuários de demonstração e autenticação

### 4.1 Usuários

Criados pelo seed. A **senha de todos** é o valor de `SEED_PASSWORD` do `.env` (no `.env.example`: `Demo@Oficina2026`).
São dados fictícios, só para demonstração.

| Papel | E-mail | Faz o quê |
|---|---|---|
| **Admin** (gerente) | `admin@oficina.local` | Tudo: serviços, cancelar OS, excluir cadastros |
| **Atendente** | `atendente@oficina.local` | Clientes, veículos, abrir e entregar OS, estoque |
| **Mecânico** | `mecanico@oficina.local` | Diagnóstico, itens, orçamento, execução e finalização |
| **Cliente** | `cliente@oficina.local` | Só acompanha as **próprias** OS em `/tracking` |

### 4.2 Login por `curl`

```bash
API=http://localhost:3001
curl -s $API/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@oficina.local","senha":"Demo@Oficina2026"}' | jq
# → { "accessToken": "eyJ…", "refreshToken": "…", "tokenType": "Bearer" }
```

- `accessToken` (JWT HS256) vale **15 min**; use no cabeçalho `Authorization: Bearer <accessToken>`.
- `refreshToken` é de uso único (rotação): `POST /auth/refresh` troca por um novo par. Reusar um token já usado derruba
  a sessão inteira.
- Rotas públicas: **somente** `POST /auth/login` e o Swagger (`/docs`). Todo o resto exige token.

### 4.3 Usar o Swagger (alternativa ao curl)

1. Abra `http://localhost:3001/docs`.
2. Execute `POST /auth/login` e copie o `accessToken`.
3. Clique em **Authorize**, cole o token (sem `Bearer`) e confirme.
4. Agora todas as rotas respondem como aquele usuário. Para trocar de papel, faça novo login e novo *Authorize*.

O documento OpenAPI em JSON está em `http://localhost:3001/docs-json`.

---

## 5. Referência completa das rotas

**Legenda de papéis:** **A** = Admin · **At** = Atendente · **M** = Mecânico · **C** = Cliente · **T** = token de
acompanhamento. Todas as rotas exigem `Authorization: Bearer …`, exceto o login.

Listagens aceitam `page` (padrão 1) e `pageSize` (padrão 20, máx. 100) e devolvem `{ <lista>, total, page, pageSize }`.

### 5.1 Autenticação e usuários (`identity`)

| Método | Rota | Papéis | Body / query | Resposta |
|---|---|---|---|---|
| POST | `/auth/login` | público | `{ email, senha }` | `200 { accessToken, refreshToken, tokenType }` · `401` |
| POST | `/auth/refresh` | logado | `{ refreshToken }` | `200` novo par · `401` token inválido/reusado |
| POST | `/auth/logout` | logado | `{ refreshToken }` | `204` (revoga a sessão) |
| POST | `/auth/register` | A, At | `{ usuarioNome, usuarioEmail, usuarioDocumento, usuarioTipoDocumento (CPF/CNPJ), usuarioTelefone?, senha (mín. 12), perfilId }` | `201` · `409` e-mail/documento · `403` At criando Admin |
| GET | `/users` | A, At | `?perfilId` | `200 { users, … }` |
| GET | `/users/{id}` | A, At | — | `200` · `404` |
| PATCH | `/users/{id}` | qualquer logado (**só o próprio**) | campos opcionais de nome, e-mail, documento, telefone | `201` · `401` se for de outro usuário |
| DELETE | `/users/{id}` | A | — | `204` (exclusão lógica; revoga sessões) |

> `perfilId` do `register` não aparece na API. Para consultar:
> `docker compose exec database psql -U admin -d fiap -c 'select perfil_id, perfil_nome from "Perfil"'`.

### 5.2 Clientes (`customers`)

Cliente = usuário com perfil Cliente, **sem senha** (acompanha a OS pelo token). O documento é imutável.

| Método | Rota | Papéis | Body / query | Resposta |
|---|---|---|---|---|
| POST | `/customers` | A, At | `{ usuarioNome, usuarioEmail, usuarioDocumento (CPF/CNPJ válido, pontuação opcional), usuarioTipoDocumento, usuarioTelefone? (10–11 dígitos) }` | `201` · `400` documento inválido · `409` duplicado |
| GET | `/customers` | A, At, M | `?usuarioDocumento&usuarioNome` | `200 { customers, … }` |
| GET | `/customers/{id}` | A, At, M | — | `200` · `404` |
| PUT | `/customers/{id}` | A, At | `{ usuarioNome?, usuarioEmail?, usuarioTelefone? }` (documento é ignorado) | `200` · `409` e-mail |
| DELETE | `/customers/{id}` | A | — | `204` (inativa) · `409` se tiver OS em aberto |
| GET | `/customers/{id}/vehicles` | A, At, M | `?page&pageSize` | `200 { vehicles, … }` |

### 5.3 Veículos (`customers`)

| Método | Rota | Papéis | Body / query | Resposta |
|---|---|---|---|---|
| POST | `/vehicles` | A, At | `{ usuarioId (dono), veiculoPlaca (antiga ou Mercosul), veiculoChassi?, veiculoMarca, veiculoModelo, veiculoAnoFabricacao, veiculoCor, veiculoKmAtual? }` | `201` · `400` placa/ano inválidos · `404` cliente · `409` placa/chassi · `422` dono não é cliente |
| GET | `/vehicles` | A, At, M | `?usuarioId&veiculoPlaca` | `200 { vehicles, … }` |
| GET | `/vehicles/{id}` | A, At, M | — | `200` · `404` |
| PATCH | `/vehicles/{id}` | A, At | qualquer campo do POST (a **placa** só o Admin altera → `403`) | `200` |
| DELETE | `/vehicles/{id}` | A | — | `204` (inativa) · `409` se tiver OS em aberto |

### 5.4 Serviços do catálogo (`catalog`)

| Método | Rota | Papéis | Body / query | Resposta |
|---|---|---|---|---|
| POST | `/services` | **A** | `{ servicoNome, servicoDescricao?, servicoPrecoBase (centavos, inteiro) }` | `201` · `409` nome repetido · `400` |
| GET | `/services` | A, At, M | `?servicoNome&servicoAtivo` | `200 { services, … }` |
| GET | `/services/{id}` | A, At, M | — | `200` · `404` |
| PUT | `/services/{id}` | **A** | campos do POST (parcial) | `200` |
| DELETE | `/services/{id}` | **A** | — | `204` (inativa) |

### 5.5 Peças e insumos + estoque (`catalog`) — rota `/itens`

Acesso: **Admin e Atendente** (o mecânico não acessa `/itens`; ele inclui peças na OS pelo id).

| Método | Rota | Body / query | Resposta |
|---|---|---|---|
| POST | `/itens` | `{ itemEstoqueTipo (PECA/INSUMO), itemEstoqueNome, itemEstoqueDescricao?, itemEstoqueUnidade (UN, L, ML, KG, G, M), itemEstoquePrecoVenda (centavos), itemEstoqueQuantidade (saldo inicial) }` | `201` (código `PC-…`/`INS-…` gerado) |
| GET | `/itens` | `?itemEstoqueTipo` | `200 { items, … }` |
| GET | `/itens/{id}` | — | `200` com `itemEstoqueQuantidade` (saldo físico) e `itemEstoqueReservada` · `404` |
| PUT | `/itens/{id}` | nome, descrição, unidade, preço (**não altera saldo**) | `204` |
| DELETE | `/itens/{id}` | — | `200` (inativa) |
| POST | `/itens/{id}/stock-movements` | `{ movimentacaoTipo (ENTRADA/SAIDA/AJUSTE), movimentacaoQuantidade, movimentacaoMotivo? }` | `201 { movimentacao, saldo: { quantidade, reservada, disponivel } }` · `422` |
| GET | `/itens/{id}/stock-movements` | `?movimentacaoTipo&ordemServicoId` | `200 { movements, … }` (mais recente primeiro) |

**Regras do estoque:** disponível = quantidade − reservada. O saldo **só muda por movimentação**:
`ENTRADA` soma · `SAIDA` tira só do disponível · `AJUSTE` define o **novo saldo físico** (motivo obrigatório; nunca
abaixo do reservado). As movimentações `RESERVA` (aprovação do orçamento) e `SAIDA` (finalização) nascem sozinhas
dos comandos da OS e trazem o `ordemServicoId`.

### 5.6 Ordens de serviço (`service-orders`)

| Método | Rota | Papéis | Body / query | Resposta |
|---|---|---|---|---|
| POST | `/service-orders` | A, At | `{ clientId **ou** customerDocument, veiculoId, mecanicoId, ordemServicoDescricaoProblema?, ordemServicoKmEntrada? }` | `201` (status `RECEBIDA`) · `404` · `409` veículo de outro cliente ou com OS aberta · `422` mecânico sem perfil / `clientId` e documento divergentes |
| GET | `/service-orders` | A, At, M | `?status&clientId&veiculoId&from&to` | `200 { serviceOrders…, total }` |
| GET | `/service-orders/{id}` | A, At, M, C (só a própria) | — | `200` OS + `cliente`, `veiculo`, `mecanico`, `orcamento` (itens, serviços, total) e `marcos` (data de cada etapa) |
| PUT | `/service-orders/{id}` | A, At, M | `{ mecanicoId?, ordemServicoDescricaoProblema?, ordemServicoDiagnostico?, ordemServicoKmEntrada? }` | `200` · `409` OS encerrada (**status não muda por aqui**) |
| GET | `/service-orders/{id}/status-history` | A, At, M | — | `200` lista cronológica |
| POST | `/service-orders/{id}/diagnosis` | A, M | — | `200` `RECEBIDA → EM_DIAGNOSTICO` |
| POST | `/service-orders/{id}/items/services` | A, M | `{ servicoId, osServicoQuantidade (inteiro ≥ 1) }` | `201` devolve o **orçamento** |
| DELETE | `/service-orders/{id}/items/services/{osServicoId}` | A, M | — | `200` devolve o orçamento |
| POST | `/service-orders/{id}/items/parts` | A, M | `{ itemEstoqueId, osItemQuantidade (> 0, até 3 casas) }` | `201` devolve o orçamento · `422` estoque insuficiente |
| DELETE | `/service-orders/{id}/items/parts/{osItemId}` | A, M | — | `200` devolve o orçamento |
| GET | `/service-orders/{id}/quote` | A, At, M | — | `200` orçamento calculado |
| POST | `/service-orders/{id}/quote/send` | A, M | — | `200` `EM_DIAGNOSTICO → AGUARDANDO_APROVACAO` + `tracking: { url, token }` · `422` sem itens |
| POST | `/service-orders/{id}/start-execution` | A, M | — | `200` `AGUARDANDO_EXECUCAO → EM_EXECUCAO` |
| POST | `/service-orders/{id}/complete` | A, M | — | `200` `EM_EXECUCAO → FINALIZADA` (**baixa o estoque**) |
| POST | `/service-orders/{id}/deliver` | A, At | — | `200` `FINALIZADA → ENTREGUE` |
| POST | `/service-orders/{id}/cancel` | **A** | `{ reason }` | `200` → `CANCELADA` (só antes da aprovação) |

Itens (serviços e peças) só podem ser incluídos/removidos em `RECEBIDA` e `EM_DIAGNOSTICO`; depois do envio do
orçamento respondem `409`. O preço é **congelado** na inclusão. O orçamento é **derivado** dos itens e recalculado a
cada mudança (nunca informado à mão).

### 5.7 Acompanhamento do cliente (`/tracking`)

Aceita o **token de acompanhamento** (vale para **uma única OS**, 7 dias) **ou** o login do **Cliente** (só as próprias
OS; a alheia responde `404`). **JWT de equipe é recusado (`403`).** Dados pessoais saem mascarados.

| Método | Rota | Resposta |
|---|---|---|
| GET | `/tracking/service-orders/{id}` | `200 { number, status, statusDescription, vehicle (placa mascarada), customer (documento mascarado), quote { totalAmount, status, items }, timeline, nextAction }` |
| POST | `/tracking/service-orders/{id}/quote/approve` | `200` → `AGUARDANDO_EXECUCAO` (**reserva o estoque**) · `409` se não estiver aguardando · `422` sem estoque |
| POST | `/tracking/service-orders/{id}/quote/reject` | body `{ reason? }` · `200` → `ORCAMENTO_RECUSADO` (terminal) |

O token vem na resposta de `quote/send` em `tracking.token` (fora de produção). O link é também escrito no log da API.

### 5.8 Métricas

| Método | Rota | Papéis | Query | Resposta |
|---|---|---|---|---|
| GET | `/metrics/average-execution-time` | A, At, M | `?from&to&serviceId` (ISO-8601) | `200 { period, averageMinutes, serviceOrderCount, byService: [{ serviceId, name, averageMinutes, serviceOrderCount }] }` |

Média do tempo entre `EM_EXECUCAO` e `FINALIZADA` das OS finalizadas no período, geral e por serviço.

---

## 6. Ciclo de vida da OS (status e comandos)

Os status mudam **somente por comandos de negócio** (nunca por `PATCH status`). Cada mudança grava o histórico.

```text
RECEBIDA ──diagnosis──▶ EM_DIAGNOSTICO ──quote/send──▶ AGUARDANDO_APROVACAO ──approve──▶ AGUARDANDO_EXECUCAO
                                                              │                                  │
                                                           reject                         start-execution
                                                              ▼                                  ▼
                                                     ORCAMENTO_RECUSADO                     EM_EXECUCAO ──complete──▶ FINALIZADA ──deliver──▶ ENTREGUE
RECEBIDA / EM_DIAGNOSTICO / AGUARDANDO_APROVACAO ──cancel (Admin)──▶ CANCELADA
```

| Comando | De | Para | Quem |
|---|---|---|---|
| `diagnosis` | RECEBIDA | EM_DIAGNOSTICO | A, M |
| `quote/send` | EM_DIAGNOSTICO | AGUARDANDO_APROVACAO | A, M |
| `quote/approve` | AGUARDANDO_APROVACAO | AGUARDANDO_EXECUCAO (reserva estoque) | cliente |
| `quote/reject` | AGUARDANDO_APROVACAO | ORCAMENTO_RECUSADO | cliente |
| `start-execution` | AGUARDANDO_EXECUCAO | EM_EXECUCAO | A, M |
| `complete` | EM_EXECUCAO | FINALIZADA (baixa estoque) | A, M |
| `deliver` | FINALIZADA | ENTREGUE | A, At |
| `cancel` | RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO | CANCELADA | A |

Qualquer comando fora da linha "De" responde **`409`**. Estados finais: `ENTREGUE`, `ORCAMENTO_RECUSADO`, `CANCELADA`.
O enunciado pede 6 status (Recebida, Em diagnóstico, Aguardando aprovação, Em execução, Finalizada, Entregue); o sistema
tem 3 a mais (`AGUARDANDO_EXECUCAO`, `ORCAMENTO_RECUSADO`, `CANCELADA`) para cobrir a aprovação, a recusa e o cancelamento.

---

## 7. Roteiro passo a passo — fluxo completo

Roda tudo do desafio em sequência: cliente → veículo → OS → diagnóstico → serviço e peça → orçamento → aprovação →
execução → finalização → entrega → métrica. **Use o mesmo terminal do começo ao fim** (as variáveis ficam na sessão).
Cada passo diz o resultado esperado. Pode repetir quantas vezes quiser: CPF e placa são gerados novos a cada execução.

<!-- roteiro:inicio -->

### Passo 0 — Preparação (funções, login dos três perfis)

> A linha `setopt interactive_comments` faz o **zsh** (terminal padrão do macOS) aceitar os comentários `# esperado: …`
> ao colar os comandos; no bash ela não faz nada. **Não apague essa linha** e cole o bloco inteiro de uma vez.

```bash
API=http://localhost:3001
SENHA='Demo@Oficina2026'     # = SEED_PASSWORD do .env

setopt interactive_comments 2>/dev/null

# api METODO CAMINHO TOKEN [JSON]   -> imprime o corpo da resposta
api() {
  local body=(); [ -n "$4" ] && body=(-d "$4")
  curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H 'content-type: application/json' "${body[@]}"
}
# code METODO CAMINHO TOKEN [JSON]  -> imprime só o status HTTP
code() {
  local body=(); [ -n "$4" ] && body=(-d "$4")
  curl -s -o /dev/null -w '%{http_code}' -X "$1" "$API$2" -H "Authorization: Bearer $3" -H 'content-type: application/json' "${body[@]}"
}
# check "RÓTULO" METODO CAMINHO TOKEN [JSON] -> imprime "RÓTULO -> STATUS" (token "" = sem token)
check() { printf '%s -> %s\n' "$1" "$(code "$2" "$3" "$4" "$5")"; }
login() { curl -s "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$1\",\"senha\":\"$SENHA\"}" | jq -r .accessToken; }

# CPF válido e placa Mercosul aleatórios (dados fictícios)
gen_cpf() { python3 - <<'PY'
import random
n=[random.randint(0,9) for _ in range(9)]
for _ in range(2):
    s=sum(v*(len(n)+1-i) for i,v in enumerate(n)); d=(s*10)%11; n.append(0 if d==10 else d)
print(''.join(map(str,n)))
PY
}
gen_placa() { python3 -c "import random,string;L=string.ascii_uppercase;print(''.join(random.choices(L,k=3))+str(random.randint(0,9))+random.choice(L)+str(random.randint(0,9))+str(random.randint(0,9)))"; }

ADMIN=$(login admin@oficina.local); ATEND=$(login atendente@oficina.local); MEC=$(login mecanico@oficina.local)
echo "tokens: admin=${ADMIN:+ok} atendente=${ATEND:+ok} mecanico=${MEC:+ok}"     # esperado: ok ok ok
```

### Passo 1 — Cadastro do cliente por CPF (F1, F11)

```bash
CPF=$(gen_cpf)
CLI=$(api POST /customers $ATEND "{\"usuarioNome\":\"Maria Teste\",\"usuarioEmail\":\"maria.$CPF@example.com\",\"usuarioDocumento\":\"$CPF\",\"usuarioTipoDocumento\":\"CPF\",\"usuarioTelefone\":\"85999990000\"}" | jq -r .usuarioId)
echo "cliente: $CLI"                                                                  # esperado: um UUID
api GET "/customers?usuarioDocumento=$CPF" $ATEND | jq '.total, .customers[0].usuarioNome'   # esperado: 1 e "Maria Teste"
check "CPF inválido" POST /customers $ATEND '{"usuarioNome":"X","usuarioEmail":"x@example.com","usuarioDocumento":"52998224724","usuarioTipoDocumento":"CPF"}'   # esperado: 400
check "CPF repetido" POST /customers $ATEND "{\"usuarioNome\":\"X\",\"usuarioEmail\":\"outro.$CPF@example.com\",\"usuarioDocumento\":\"$CPF\",\"usuarioTipoDocumento\":\"CPF\"}"   # esperado: 409
```

### Passo 2 — Cadastro do veículo (F2, F12)

```bash
PLACA=$(gen_placa)
VEI=$(api POST /vehicles $ATEND "{\"usuarioId\":\"$CLI\",\"veiculoPlaca\":\"$PLACA\",\"veiculoMarca\":\"Fiat\",\"veiculoModelo\":\"Argo\",\"veiculoAnoFabricacao\":2022,\"veiculoCor\":\"Prata\"}" | jq -r .veiculoId)
echo "veículo: $VEI (placa $PLACA)"                                                  # esperado: um UUID
check "placa inválida" POST /vehicles $ATEND "{\"usuarioId\":\"$CLI\",\"veiculoPlaca\":\"AB12345\",\"veiculoMarca\":\"Fiat\",\"veiculoModelo\":\"Uno\",\"veiculoAnoFabricacao\":2020,\"veiculoCor\":\"Azul\"}"   # esperado: 400
check "placa repetida" POST /vehicles $ATEND "{\"usuarioId\":\"$CLI\",\"veiculoPlaca\":\"$PLACA\",\"veiculoMarca\":\"Fiat\",\"veiculoModelo\":\"Uno\",\"veiculoAnoFabricacao\":2020,\"veiculoCor\":\"Azul\"}"   # esperado: 409
api GET /customers/$CLI/vehicles $ATEND | jq '.total'                                # esperado: 1
```

### Passo 3 — Serviço do catálogo e peça com estoque (F13, F14, F15)

```bash
SVC=$(api GET "/services?servicoNome=Troca%20de%20%C3%B3leo" $ATEND | jq -r '.services[0].servicoId')
echo "serviço (seed 'Troca de óleo', R\$ 150,00): $SVC"
PART=$(api POST /itens $ATEND '{"itemEstoqueTipo":"PECA","itemEstoqueNome":"Filtro de teste","itemEstoqueUnidade":"UN","itemEstoquePrecoVenda":3500,"itemEstoqueQuantidade":10}' | jq -r .itemEstoqueId)
echo "peça: $PART"
api GET /itens/$PART $ATEND | jq '{itemEstoqueNome, itemEstoqueQuantidade, itemEstoqueReservada}'   # esperado: quantidade 10, reservada 0
api GET /itens/$PART/stock-movements $ATEND | jq '.movements[] | {movimentacaoTipo, movimentacaoQuantidade, movimentacaoMotivo}'   # esperado: ENTRADA 10 "Saldo inicial"
```

### Passo 4 — Abrir a OS identificando o cliente por CPF (F1) e consultar o detalhe (F17)

```bash
MECID=$(api GET "/users?pageSize=100" $ATEND | jq -r '.users[]|select(.usuarioEmail=="mecanico@oficina.local")|.usuarioId')
OS=$(api POST /service-orders $ATEND "{\"customerDocument\":\"$CPF\",\"veiculoId\":\"$VEI\",\"mecanicoId\":\"$MECID\",\"ordemServicoDescricaoProblema\":\"Barulho ao frear\",\"ordemServicoKmEntrada\":35000}" | jq -r .ordemServicoId)
echo "OS: $OS"
api GET /service-orders/$OS $ATEND | jq '{ordemServicoNumero, ordemServicoStatus, cliente, veiculo, marcos}'   # esperado: status RECEBIDA
check "2ª OS no mesmo veículo" POST /service-orders $ATEND "{\"clientId\":\"$CLI\",\"veiculoId\":\"$VEI\",\"mecanicoId\":\"$MECID\"}"   # esperado: 409 (veículo já tem OS aberta)
```

### Passo 5 — Diagnóstico e inclusão de serviço e peça (F3, F4, F5)

```bash
api POST /service-orders/$OS/diagnosis $MEC | jq '.ordemServicoStatus'               # esperado: "EM_DIAGNOSTICO"
api POST /service-orders/$OS/items/services $MEC "{\"servicoId\":\"$SVC\",\"osServicoQuantidade\":1}" | jq '{orcamentoValorTotal, servicos}'   # total 15000
check "peça acima do estoque" POST /service-orders/$OS/items/parts $MEC "{\"itemEstoqueId\":\"$PART\",\"osItemQuantidade\":999}"        # esperado: 422
api POST /service-orders/$OS/items/parts $MEC "{\"itemEstoqueId\":\"$PART\",\"osItemQuantidade\":2}" | jq '{orcamentoValorTotal, itens}'         # total 22000 (15000 + 2 x 3500)
api GET /itens/$PART $ATEND | jq '{itemEstoqueQuantidade, itemEstoqueReservada}'      # ainda 10 e 0: incluir NÃO reserva
api GET /service-orders/$OS/quote $ATEND | jq '{orcamentoStatus, orcamentoValorTotal}'   # RASCUNHO, 22000
```

### Passo 6 — Enviar o orçamento ao cliente (F6)

```bash
SEND=$(api POST /service-orders/$OS/quote/send $MEC)
echo "$SEND" | jq '{ordemServicoStatus, tracking}'                                  # esperado: AGUARDANDO_APROVACAO + url + token
TOKEN=$(echo "$SEND" | jq -r .tracking.token)
check "incluir item após o envio" POST /service-orders/$OS/items/services $MEC "{\"servicoId\":\"$SVC\",\"osServicoQuantidade\":1}"   # esperado: 409
```

### Passo 7 — Acompanhamento do cliente com o token (F10)

```bash
api GET /tracking/service-orders/$OS $TOKEN | jq '{number, status, statusDescription, vehicle, customer, quote, nextAction}'   # placa e CPF mascarados
check "JWT de equipe no /tracking" GET /tracking/service-orders/$OS $ADMIN                                          # esperado: 403
check "token em outra OS" GET /tracking/service-orders/00000000-0000-4000-8000-000000000000 $TOKEN                # esperado: 404
check "sem token" GET /tracking/service-orders/$OS ""                                                                         # esperado: 401
```

### Passo 8 — Cliente aprova o orçamento: reserva do estoque (F7, F15)

```bash
api POST /tracking/service-orders/$OS/quote/approve $TOKEN | jq '{status, nextAction}'    # esperado: AGUARDANDO_EXECUCAO
api GET /itens/$PART $ATEND | jq '{itemEstoqueQuantidade, itemEstoqueReservada}'          # esperado: quantidade 10, RESERVADA 2
check "aprovar de novo" POST /tracking/service-orders/$OS/quote/approve $TOKEN  # esperado: 409
```

### Passo 9 — Execução, finalização (baixa do estoque) e entrega (F8, F9)

```bash
check "finalizar sem executar" POST /service-orders/$OS/complete $MEC           # esperado: 409
check "atendente iniciando execução" POST /service-orders/$OS/start-execution $ATEND   # esperado: 403 (só mecânico/admin)
api POST /service-orders/$OS/start-execution $MEC | jq '.ordemServicoStatus'              # esperado: EM_EXECUCAO
api POST /service-orders/$OS/complete $MEC | jq '.ordemServicoStatus'                     # esperado: FINALIZADA
api GET /itens/$PART $ATEND | jq '{itemEstoqueQuantidade, itemEstoqueReservada}'          # esperado: quantidade 8, reservada 0 (baixou 2)
api POST /service-orders/$OS/deliver $ATEND | jq '.ordemServicoStatus'                    # esperado: ENTREGUE
check "comando após entregar" POST /service-orders/$OS/diagnosis $MEC           # esperado: 409
```

### Passo 10 — Histórico, trilha de estoque e detalhe final (F9, F15, F17)

```bash
api GET /service-orders/$OS/status-history $ATEND | jq -r '.[] | "\(.historicoStatusAnterior // "-") -> \(.historicoStatusNovo)"'
# esperado, em ordem: - -> RECEBIDA · RECEBIDA -> EM_DIAGNOSTICO · … -> AGUARDANDO_APROVACAO · … -> AGUARDANDO_EXECUCAO · … -> EM_EXECUCAO · … -> FINALIZADA · … -> ENTREGUE

api GET "/itens/$PART/stock-movements" $ATEND | jq -r '.movements[] | "\(.movimentacaoTipo)\t\(.movimentacaoQuantidade)\t\(.movimentacaoMotivo)"'
# esperado (mais recente primeiro): SAIDA 2 (baixa) · RESERVA 2 (reserva) · ENTRADA 10 (saldo inicial)

api GET /service-orders/$OS $ATEND | jq '{ordemServicoStatus, orcamentoStatus: .orcamento.orcamentoStatus, orcamentoValorTotal: .orcamento.orcamentoValorTotal, marcos}'   # marcos todos preenchidos
```

### Passo 11 — Tempo médio de execução (F18) e listagem de OS (F16)

```bash
api GET "/metrics/average-execution-time?serviceId=$SVC" $ATEND | jq    # esperado: serviceOrderCount >= 1 e byService com "Troca de óleo"
api GET "/service-orders?status=ENTREGUE&clientId=$CLI" $ATEND | jq '.total'   # esperado: 1
api GET "/service-orders?page=1&pageSize=5" $ATEND | jq '.total'                # total de OS no banco
```

<!-- roteiro:fim -->

> A OS desse roteiro ficou em `ENTREGUE`. Como o tempo entre iniciar e finalizar foi de segundos, a média aparece
> próxima de `0`. Para um número mais "bonito" no vídeo, deixe alguns segundos entre `start-execution` e `complete`.

---

## 8. Cenários extras

Rode depois do roteiro (reaproveita `API`, `ADMIN`, `ATEND`, `MEC`, `CPF`, `SVC`, `PART`, `MECID`, `CLI` do passo 0 a 4).
Cada cenário cria seu próprio veículo, porque só pode haver **uma OS aberta por veículo**.

```bash
# Função de apoio: abre uma OS nova (cliente $CLI, veículo novo), inclui a peça, diagnostica e envia o orçamento
nova_os_enviada() {   # uso: nova_os_enviada QUANTIDADE_DA_PECA  -> define $OS2 e $TOKEN2
  local v; v=$(api POST /vehicles $ATEND "{\"usuarioId\":\"$CLI\",\"veiculoPlaca\":\"$(gen_placa)\",\"veiculoMarca\":\"VW\",\"veiculoModelo\":\"Gol\",\"veiculoAnoFabricacao\":2019,\"veiculoCor\":\"Branco\"}" | jq -r .veiculoId)
  OS2=$(api POST /service-orders $ATEND "{\"clientId\":\"$CLI\",\"veiculoId\":\"$v\",\"mecanicoId\":\"$MECID\"}" | jq -r .ordemServicoId)
  api POST /service-orders/$OS2/items/parts $MEC "{\"itemEstoqueId\":\"$PART\",\"osItemQuantidade\":$1}" >/dev/null
  api POST /service-orders/$OS2/diagnosis $MEC >/dev/null
  TOKEN2=$(api POST /service-orders/$OS2/quote/send $MEC | jq -r .tracking.token)
}
```

### 8.1 Cliente recusa o orçamento (F7)

```bash
nova_os_enviada 1
api POST /tracking/service-orders/$OS2/quote/reject $TOKEN2 '{"reason":"Achei caro"}' | jq '{status, statusDescription}'   # ORCAMENTO_RECUSADO
check "cancelar após recusa" POST /service-orders/$OS2/cancel $ADMIN '{"reason":"x"}'                        # esperado: 409 (OS encerrada)
api GET /itens/$PART $ATEND | jq '{itemEstoqueQuantidade, itemEstoqueReservada}'                                      # estoque intacto (recusa não reserva)
```

### 8.2 Estoque insuficiente (F4, F15, T10 — transações)

```bash
# Duas OS disputam o mesmo estoque: a peça tem 8 em saldo; cada OS pede 5. A segunda aprovação deve falhar sem mexer em nada.
nova_os_enviada 5; A_OS=$OS2; A_TOKEN=$TOKEN2
nova_os_enviada 5; B_OS=$OS2; B_TOKEN=$TOKEN2
check "1ª aprovação" POST /tracking/service-orders/$A_OS/quote/approve $A_TOKEN    # esperado: 200
check "2ª aprovação" POST /tracking/service-orders/$B_OS/quote/approve $B_TOKEN    # esperado: 422 (estoque insuficiente)
api GET /service-orders/$B_OS $ATEND | jq '.ordemServicoStatus'                              # continua AGUARDANDO_APROVACAO (rollback)
api GET /itens/$PART $ATEND | jq '{itemEstoqueQuantidade, itemEstoqueReservada}'            # reservada = 5 (só a 1ª OS)
# Repor o estoque e aprovar de novo:
api POST /itens/$PART/stock-movements $ATEND '{"movimentacaoTipo":"ENTRADA","movimentacaoQuantidade":10,"movimentacaoMotivo":"Reposição"}' | jq '.saldo'
check "2ª aprovação, de novo" POST /tracking/service-orders/$B_OS/quote/approve $B_TOKEN   # esperado: 200
```

### 8.3 Movimentações manuais de estoque (F15)

```bash
api POST /itens/$PART/stock-movements $ATEND '{"movimentacaoTipo":"ENTRADA","movimentacaoQuantidade":5,"movimentacaoMotivo":"Compra"}' | jq '.saldo'
check "saída acima do disponível" POST /itens/$PART/stock-movements $ATEND '{"movimentacaoTipo":"SAIDA","movimentacaoQuantidade":9999}'   # esperado: 422
check "ajuste sem motivo" POST /itens/$PART/stock-movements $ATEND '{"movimentacaoTipo":"AJUSTE","movimentacaoQuantidade":20}'             # esperado: 422
api POST /itens/$PART/stock-movements $ATEND '{"movimentacaoTipo":"AJUSTE","movimentacaoQuantidade":30,"movimentacaoMotivo":"Contagem de inventário"}' | jq '.saldo'
check "RESERVA manual" POST /itens/$PART/stock-movements $ATEND '{"movimentacaoTipo":"RESERVA","movimentacaoQuantidade":1}'             # esperado: 400 (reserva só nasce da OS)
```

### 8.4 Autenticação e papéis (requisito de segurança)

```bash
check "sem token" GET /customers ""                                                              # esperado: 401
check "senha errada" POST /auth/login "" '{"email":"admin@oficina.local","senha":"errada-123456"}'   # esperado: 401
check "mecânico criando cliente" POST /customers $MEC '{}'                              # esperado: 403
check "atendente criando serviço" POST /services $ATEND '{"servicoNome":"X","servicoPrecoBase":100}'   # esperado: 403
check "atendente cancelando OS" POST /service-orders/$OS/cancel $ATEND '{"reason":"x"}'   # esperado: 403
CLIENTE=$(login cliente@oficina.local)
check "cliente em rota de equipe" GET /service-orders $CLIENTE                          # esperado: 403
```

### 8.5 Cancelamento pelo Admin e renovação de login

```bash
nova_os_enviada 1
check "cancelar pelo admin (aguardando aprovação)" POST /service-orders/$OS2/cancel $ADMIN '{"reason":"Cliente desistiu"}'   # esperado: 200 -> CANCELADA

# refresh token com rotação
R=$(curl -s $API/auth/login -H 'content-type: application/json' -d "{\"email\":\"atendente@oficina.local\",\"senha\":\"$SENHA\"}")
AT=$(echo "$R" | jq -r .accessToken); RT=$(echo "$R" | jq -r .refreshToken)
check "refresh" POST /auth/refresh $AT "{\"refreshToken\":\"$RT\"}"                    # esperado: 200
check "refresh reusado" POST /auth/refresh $AT "{\"refreshToken\":\"$RT\"}"            # esperado: 401 (token de uso único)
```

### 8.6 Acompanhamento pelo login do cliente (alternativa ao token)

O cliente de demonstração (`cliente@oficina.local`, dono do veículo `ABC1D23`) acompanha a própria OS **com o próprio login**:

```bash
SEED_CLI=$(api GET "/customers?usuarioNome=Cliente%20Local" $ATEND | jq -r '.customers[0].usuarioId')
SEED_VEI=$(api GET "/vehicles?veiculoPlaca=ABC1D23" $ATEND | jq -r '.vehicles[0].veiculoId')
OS3=$(api POST /service-orders $ATEND "{\"clientId\":\"$SEED_CLI\",\"veiculoId\":\"$SEED_VEI\",\"mecanicoId\":\"$MECID\"}" | jq -r '.ordemServicoId // empty')
# se o veículo já tinha uma OS aberta (409), usa essa
[ -z "$OS3" ] && OS3=$(api GET "/service-orders?veiculoId=$SEED_VEI" $ATEND | jq -r '[.serviceOrders[] | select(.ordemServicoStatus != "ENTREGUE" and .ordemServicoStatus != "CANCELADA" and .ordemServicoStatus != "ORCAMENTO_RECUSADO")][0].ordemServicoId')
check "cliente vê a própria OS" GET /tracking/service-orders/$OS3 $CLIENTE                         # esperado: 200
check "cliente vê OS de outro" GET /tracking/service-orders/$OS $CLIENTE                           # esperado: 404
check "cliente no detalhe da própria OS" GET /service-orders/$OS3 $CLIENTE                         # esperado: 200
check "cliente no detalhe de OS alheia" GET /service-orders/$OS $CLIENTE                           # esperado: 404
# libera o veículo de demonstração para o próximo teste (e para a gravação)
check "cancelar a OS de demonstração" POST /service-orders/$OS3/cancel $ADMIN '{"reason":"Fim do teste"}'   # esperado: 200
```

---

## 9. Requisitos do desafio → como demonstrar

### 9.1 Funcionalidades (enunciado §5)

| # | Requisito | Onde mostrar | Resultado esperado |
|---|---|---|---|
| F1 | Identificar o cliente por CPF/CNPJ | Passo 1 e 4 (`customerDocument`) | OS aberta pelo CPF; CPF inválido → 400; sem cliente → 404 |
| F2 | Cadastro de veículo (placa, marca, modelo, ano) | Passo 2 | 201; placa inválida → 400; repetida → 409 |
| F3 | Inclusão dos serviços | Passo 5 | Orçamento com o serviço (preço congelado) |
| F4 | Inclusão de peças e insumos | Passo 5 e 8.2 | Entra no orçamento; acima do estoque → 422 |
| F5 | Geração automática do orçamento | Passo 5 (`GET …/quote`) | Total recalculado a cada inclusão/remoção |
| F6 | Envio do orçamento para aprovação | Passo 6 | Status `AGUARDANDO_APROVACAO` + token de acompanhamento |
| F7 | Registro da aprovação ou rejeição | Passo 8 e 8.1 | Aprova → `AGUARDANDO_EXECUCAO`; recusa → `ORCAMENTO_RECUSADO`; histórico gravado |
| F8 | Status da OS | Seção 6 + Passo 10 | 6 do enunciado + 3 de apoio |
| F9 | Controle de status e regras de transição | Passo 9 (409/403) e 10 | Transição inválida → 409; histórico completo |
| F10 | Consulta do cliente via API | Passo 7 e 8.6 | Dados mascarados; OS alheia → 404; JWT de equipe → 403 |
| F11 | CRUD de clientes | Passo 1 + seção 5.2 | — |
| F12 | CRUD de veículos | Passo 2 + seção 5.3 | — |
| F13 | CRUD de serviços | Seção 5.4 (Admin) | Atendente → 403 |
| F14 | CRUD de peças e insumos | Passo 3 + seção 5.5 | — |
| F15 | Controle de estoque | Passo 8, 9, 10 e 8.2, 8.3 | Reserva na aprovação, baixa na finalização, histórico de movimentações |
| F16 | Listagem de OS | Passo 11 | Filtros `status`, `clientId`, `veiculoId`, `from`, `to`, paginação |
| F17 | Detalhamento de OS | Passo 4 e 10 | Cliente, veículo, mecânico, itens, orçamento e marcos |
| F18 | Tempo médio de execução | Passo 11 | `averageMinutes` geral e por serviço |

### 9.2 Requisitos técnicos (enunciado §6)

| # | Requisito | Como demonstrar |
|---|---|---|
| T1/T2 | Monólito em camadas | Mostrar a árvore `src/modules/<módulo>/{controllers,dtos,services,domain}` (`docs/04-arquitetura/estrutura-do-repositorio.md`) |
| T3 | Banco justificado | PostgreSQL 16: transações (aprovação + reserva), `NUMERIC`, índices únicos (README §9) |
| T4 | REST + Swagger | `http://localhost:3001/docs` (seção 4.3) |
| T5 | JWT nas rotas administrativas | Seção 8.4 (401/403/200) e refresh (8.5) |
| T6 | Validação de CPF/CNPJ e placa | Passo 1 e 2 (400 em CPF/placa inválidos) |
| T7 | Testes unitários e de integração | Seção 10 |
| T8 | Cobertura ≥ 80 % nos domínios críticos | `pnpm run test:cov` + `docs/06-entrega/evidencias/cobertura.md` |
| T10 | Transações | Seção 8.2 (falha na 2ª aprovação não deixa nada pela metade) e teste `stock.int-spec.ts` |
| T11 | Dockerfile e compose | Seção 3.1 |

---

## 10. Testes automatizados

Rode na raiz do projeto, depois de `pnpm install` (Node 22+, `corepack enable`).

| Tipo | Comando | Precisa de | Resultado esperado |
|---|---|---|---|
| **Unitários** | `pnpm test` | nada (sem banco) | 36 suítes, **562 testes** passando |
| **Cobertura** (com gate) | `pnpm run test:cov` | nada | Mesmos testes + tabela de cobertura; **falha** se algum módulo crítico ou o global ficar < 80 % |
| **Integração** (banco real) | `pnpm run test:integration` | **Docker ligado** | 4 suítes, **82 testes** passando (~10 s; a 1ª vez baixa a imagem `postgres:16-alpine`) |
| Lint | `pnpm lint` | — | sem erros (há avisos de estilo, normais) |
| Build | `pnpm run build` | — | sem erros |

> Se o Jest reclamar do `watchman`, rode com `-- --no-watchman` (ex.: `pnpm test -- --no-watchman`).

### 10.1 Cobertura

`pnpm run test:cov` imprime a tabela no terminal e gera o relatório em HTML:

- abrir `coverage/lcov-report/index.html` no navegador (mostra arquivo a arquivo);
- evidência versionada, com a data e os percentuais: `docs/06-entrega/evidencias/cobertura.md`.

Resultados de referência (02/11/2026): **global 97 % de linhas e 83 % de branches**; `service-orders` e `catalog`
(`domain` + `services`) acima de 80 % em linhas e branches, que é a meta do desafio.

### 10.2 O que os testes cobrem

- **Unitários (`test/unit`, `test/services`):** regras de domínio (máquina de estados com **todas** as combinações
  status × comando, orçamento, estoque, marcos, tempo médio, validação de CPF/CNPJ e placa), serviços com o banco
  simulado, controllers (papéis e delegação) e DTOs (validação).
- **Integração (`test/integration`):** sobem um PostgreSQL 16 descartável (Testcontainers), aplicam as migrações e o
  seed e chamam a API real:

| Arquivo | O que prova |
|---|---|
| `auth.int-spec.ts` | Login, 401/403, rotação e reuso de refresh token, logout, registro de usuário |
| `cadastros.int-spec.ts` | CRUD de clientes, veículos, serviços e peças; validações; exclusão lógica |
| `service-order-flow.int-spec.ts` | Fluxo completo da OS (aprovada e recusada), tracking, detalhe, métrica, CPF na abertura, regras de criação e cancelamento, atomicidade do envio |
| `stock.int-spec.ts` | Movimentações, reserva e baixa, **rollback** da aprovação sem estoque, aprovações **concorrentes**, `CHECK` do banco |

Para mostrar um teste de integração isolado: `pnpm run test:integration -- stock` (filtra pelo nome do arquivo).

### 10.3 CI (GitHub Actions)

`.github/workflows/ci.yml` roda a cada PR/push em `develop` e `master`: título do PR (Conventional Commits), build e
lint, testes unitários com o gate de cobertura, testes de integração, build da imagem Docker + compose subindo
a stack, gitleaks (segredos) e auditoria de dependências. Mostre a aba **Actions** com o último run verde.

---

## 11. Roteiro para gravar o vídeo

Limite de **15 minutos**, vídeo **público no YouTube**, áudio compreensível. Base: `docs/06-entrega/roteiro-do-video.md`
(blocos e tempos). Abaixo, o que executar em cada item pedido pelo enunciado.

### Antes de gravar

1. `git checkout` da **branch/tag/hash exatos** que vão no PDF e **diga o hash na abertura** (`git rev-parse --short HEAD`).
2. Ambiente limpo: `docker compose down -v` e `cp .env.example .env`.
3. Deixe prontos: Swagger aberto, um terminal com o passo 0 já executado, o README e a pasta `docs/ddd`.
4. Aumente a fonte do terminal; feche notificações.

### Itens e o que mostrar

| # | Item do enunciado | Mostrar |
|---|---|---|
| 1 | Proposta da solução + integrantes | Nome, RM e papel de cada integrante; problema da oficina; MVP |
| 2 | Arquitetura | `docs/04-arquitetura/visao-geral.md` (C4): atores, API monolítica, banco, compose |
| 3 | Organização do monólito e camadas | Árvore `src/modules/…/{controllers,dtos,services,domain}`; módulos `customers`, `catalog`, `service-orders`, `identity`; módulos só se falam por serviços exportados |
| 4 | Banco e justificativa | PostgreSQL 16: transação da aprovação (status + reserva), `NUMERIC`, índices únicos, Testcontainers |
| 5 | Event Storming + DDD | Miro e `docs/ddd/` (**ainda a produzir pelo grupo**, ver observação abaixo) |
| 6 | Criação e acompanhamento da OS | Passos 1, 2, 4 e 7 |
| 7 | Inclusão de serviços, peças e insumos | Passo 3 (estoque antes) e 5 (inclusão, 422 sem estoque) |
| 8 | Geração e aprovação do orçamento | Passos 5 (`quote`), 6 (`send`), 8 (`approve` + estoque reservado) |
| 9 | Alteração dos status | Passos 9 e 10 (`complete` baixa o estoque, `deliver`, histórico) e o diagrama da seção 6 |
| 10 | Autenticação das APIs administrativas | Seção 8.4: 401 sem token → login → 200; 403 com papel errado; *Authorize* no Swagger |
| 11 | Execução da aplicação | Seção 3.1: clone → `.env.example` → `docker compose up --build` → logs → `/docs` |
| 12 | Swagger/OpenAPI | `http://localhost:3001/docs`: tags por módulo, esquema Bearer, respostas de erro documentadas |
| 13 | Testes automatizados | Seção 10: `pnpm run test:cov` (tabela), `pnpm run test:integration`, aba Actions verde |
| 14 | Análise de vulnerabilidades | Relatório em `docs/06-entrega/` (**ainda a produzir**, ver observação abaixo) |

### Observações importantes para quem grava

- O arquivo `docs/06-entrega/roteiro-do-video.md` foi escrito antes da implementação e cita coisas que **não existem
  no código final**: a rota `/health` (não existe; use `/docs` para mostrar que a API está no ar), `/docs/openapi.json`
  (o caminho real é `/docs-json`), cenários BDD/Cucumber e Semgrep/ZAP. **Não mostre/mencione o que não existe.**
- **Pendências do grupo que impactam o vídeo:** (a) Event Storming/diagramas no Miro e os PDFs em `docs/ddd/`;
  (b) relatório de análise de vulnerabilidades. Sem esses artefatos os itens 5 e 14 ficam sem o que mostrar.
- O código usa **nomes em português** (`/itens`, `ordemServicoStatus`…); o glossário em `docs/ddd/linguagem-ubiqua.md`
  pede inglês. Isso está registrado em `docs/02-adr/decisoes-leves.md` — vale citar no item 3 como decisão consciente.
- Dica de ritmo: gravar o fluxo (passos 1–11) em 5–6 minutos, copiando e colando os blocos já testados.

---

## 12. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `port is already allocated` ao subir | Porta 5432 ou 3001 em uso (outro Postgres/app) | No `.env`: `POSTGRES_PORT=55432` e/ou `API_PORT=3002`; suba de novo. Ajuste `API` nos comandos |
| `docker compose up` falha no `migrate` | Banco ainda iniciando ou `.env` ausente | Confirme `cp .env.example .env`; rode `docker compose down -v` e suba de novo |
| `Defina JWT_SECRET…` / variável obrigatória | `.env` sem `JWT_SECRET` ou `SEED_PASSWORD` | Recopie o `.env.example` |
| `401` em tudo | Token expirou (15 min) ou faltou `Bearer ` | Refaça o login (`ADMIN=$(login …)`) |
| `jq: command not found` | `jq` não instalado | Instale (seção 2) ou use o Swagger |
| `409` ao abrir OS | Veículo já tem OS aberta, ou veículo de outro cliente | Use um veículo novo (passo 2) |
| `422` ao incluir peça / aprovar | Estoque disponível insuficiente | `GET /itens/{id}` e faça uma `ENTRADA` (8.3) |
| `403` | Papel sem permissão naquela rota | Veja a coluna de papéis na seção 5 |
| Testes de integração falham ao iniciar | Docker não está rodando | Abra o Docker Desktop e rode de novo |
| Jest: `watchman … Library not loaded` | Watchman quebrado no macOS | `pnpm test -- --no-watchman` |
| Quero recomeçar do zero | — | `docker compose down -v && docker compose up --build` |
