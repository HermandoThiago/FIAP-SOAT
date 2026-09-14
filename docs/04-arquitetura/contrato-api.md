# Contrato da API REST (v1)

> Referência humana do contrato (ADR-005 = híbrido): o Swagger gerado pelo código é a versão executável; este arquivo é o
> acordo **antes** de codar. Base: `http://localhost:8080/api/v1`. JSON em `camelCase`, datas ISO-8601 UTC, dinheiro como
> número decimal com 2 casas (ex.: `330.00`). Idioma conforme ADR-013.

## 1. Autenticação e autorização

| Tipo | Como | Onde |
|---|---|---|
| Administrativa | `Authorization: Bearer <accessToken>` (JWT, ADR-004) | Todas as rotas exceto públicas |
| Cliente | `Authorization: Bearer <tokenAcompanhamento>` (JWT `aud=cliente`, ADR-011) | `/acompanhamento/**` |
| Pública | — | `POST /auth/login`, `GET /health`, `GET /ready`, `/swagger` (dev) |

Papéis: `ATENDENTE` · `MECANICO` · `GERENTE` (GERENTE inclui tudo). Notação abaixo: **A** atendente, **M** mecânico, **G** gerente, **C** cliente, **P** público.

## 2. Convenções

- Criação: `201 Created` + header `Location` + corpo do recurso.
- Ações de negócio (transições): `POST /recurso/{id}/acao` → `200` com o recurso atualizado.
- Listagens: `?page=0&size=20&sort=campo,asc` → `{ "items": [...], "page": 0, "size": 20, "total": 57 }`.
- Remoção lógica: `DELETE` → `204`.
- Concorrência: `If-Match: <versao>` opcional; conflito → `409`.
- Idempotência de transições: repetir uma ação já aplicada → `409` (`transição inválida`).

## 3. Endpoints

### 3.1 Identidade

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/auth/login` | P | `{ "email", "senha" }` | `200 { "accessToken", "tokenType": "Bearer", "expiresIn": 3600, "papeis": [] }` · `401` |
| POST | `/auth/refresh` | portador | `{ "refreshToken" }` | (Could) |
| GET | `/usuarios` · POST · GET/PUT/DELETE `/usuarios/{id}` | G | `{ "nome", "email", "senha", "papeis": ["MECANICO"] }` | (Should) |
| GET | `/health` · `/ready` | P | — | `200 { "status": "UP" }` |

### 3.2 Cadastro — clientes e veículos

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/clientes` | A,G | `{ "tipoPessoa": "PF", "documento": "52998224725", "nome", "email", "telefone" }` | `201 Cliente` · `422` · `409` duplicado |
| GET | `/clientes?documento=&nome=&page=&size=` | A,M,G | — | `200 Página<Cliente>` |
| GET | `/clientes/{id}` | A,M,G | — | `200 Cliente` · `404` |
| PUT | `/clientes/{id}` | A,G | `{ "nome", "email", "telefone" }` (documento imutável) | `200` |
| DELETE | `/clientes/{id}` | G | — | `204` · `409` OS em aberto |
| GET | `/clientes/{id}/veiculos` | A,M,G | — | `200 [Veiculo]` |
| POST | `/veiculos` | A,G | `{ "clienteId", "placa": "ABC1D23", "marca", "modelo", "ano": 2022, "cor" }` | `201` · `422` · `409` |
| GET | `/veiculos?placa=` · `/veiculos/{id}` | A,M,G | — | `200` |
| PUT | `/veiculos/{id}` | A,G (placa: G) | `{ "marca", "modelo", "ano", "cor", "placa"? }` | `200` |
| DELETE | `/veiculos/{id}` | G | — | `204` · `409` |

`Cliente`: `{ "id", "tipoPessoa", "documento", "documentoFormatado", "nome", "email", "telefone", "ativo", "criadoEm", "atualizadoEm" }`
`Veiculo`: `{ "id", "clienteId", "placa", "marca", "modelo", "ano", "cor", "ativo", "criadoEm" }`

### 3.3 Catálogo e estoque

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/servicos` | G | `{ "nome", "descricao", "preco": 120.00, "tempoEstimadoMin": 45 }` | `201` |
| GET | `/servicos?ativo=true&nome=` · `/servicos/{id}` | A,M,G | — | `200` |
| PUT | `/servicos/{id}` | G | idem | `200` |
| DELETE | `/servicos/{id}` | G | — | `204` (inativa) |
| POST | `/pecas` | G | `{ "sku", "nome", "tipo": "PECA", "unidadeMedida": "UN", "precoUnitario": 90.00, "estoqueMinimo": 4 }` | `201` (estoque inicial 0) |
| GET | `/pecas?ativo=true&sku=&nome=&abaixoDoMinimo=` · `/pecas/{id}` | A,M,G | — | `200 Peca` (inclui `quantidadeEstoque`, `quantidadeReservada`, `disponivel`) |
| PUT | `/pecas/{id}` | G | dados (não altera estoque) | `200` |
| DELETE | `/pecas/{id}` | G | — | `204` (inativa) |
| POST | `/pecas/{id}/movimentacoes` | G | `{ "tipo": "ENTRADA"\|"AJUSTE", "quantidade": 10, "motivo" }` | `201 Movimentacao` · `422` |
| GET | `/pecas/{id}/movimentacoes` | G | — | `200 [Movimentacao]` |

### 3.4 Atendimento — ordem de serviço

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| POST | `/ordens-servico` | A,G | `{ "clienteId"\|"documentoCliente", "veiculoId"\|"placa", "descricaoProblema", "servicosSolicitados": [{ "servicoId", "quantidade" }]? }` | `201 OrdemDeServico` (status `RECEBIDA`) · `404` cliente/veículo · `422` · `409` veículo não pertence ao cliente / OS aberta |
| GET | `/ordens-servico?status=&clienteId=&veiculoId=&de=&ate=&page=&size=` | A,M,G | — | `200 Página<OrdemDeServicoResumo>` |
| GET | `/ordens-servico/{id}` | A,M,G | — | `200 OrdemDeServico` (completa) |
| GET | `/ordens-servico/{id}/historico` | A,M,G | — | `200 [Historico]` |
| POST | `/ordens-servico/{id}/diagnostico` | M,G | — | `200` (→ `EM_DIAGNOSTICO`) · `409` |
| POST | `/ordens-servico/{id}/itens/servicos` | M,G | `{ "servicoId", "quantidade": 1 }` | `201 OrdemDeServico` (orçamento recalculado) · `409` status · `422` |
| DELETE | `/ordens-servico/{id}/itens/servicos/{itemId}` | M,G | — | `200 OrdemDeServico` |
| POST | `/ordens-servico/{id}/itens/pecas` | M,G | `{ "pecaId", "quantidade": 2 }` | `201` · `422 estoque insuficiente` (ADR-012) · `409` |
| DELETE | `/ordens-servico/{id}/itens/pecas/{itemId}` | M,G | — | `200` |
| GET | `/ordens-servico/{id}/orcamento` | A,M,G | — | `200 Orcamento` |
| POST | `/ordens-servico/{id}/orcamento/enviar` | M,G | — | `200 { ...OrdemDeServico, "acompanhamento": { "url", "token" (só em dev) } }` (→ `AGUARDANDO_APROVACAO`) · `422` sem itens · `409` |
| POST | `/ordens-servico/{id}/finalizar` | M,G | — | `200` (→ `FINALIZADA`) · `409` |
| POST | `/ordens-servico/{id}/entregar` | A,G | — | `200` (→ `ENTREGUE`) · `409` |
| POST | `/ordens-servico/{id}/cancelar` | G | `{ "motivo" }` | `200` (→ `CANCELADA`, se ADR-010) · `409` |

`OrdemDeServico` (completa):

```json
{
  "id": "0192f2a1-…", "numero": "OS-2026-000042", "status": "AGUARDANDO_APROVACAO",
  "cliente": { "id": "…", "nome": "Maria Silva", "documento": "52998224725" },
  "veiculo": { "id": "…", "placa": "ABC1D23", "marca": "Fiat", "modelo": "Argo", "ano": 2022 },
  "descricaoProblema": "barulho ao frear",
  "itensServico": [ { "id": "…", "servicoId": "…", "nome": "Troca de pastilhas", "precoUnitario": 150.00, "quantidade": 1, "subtotal": 150.00 } ],
  "itensPeca": [ { "id": "…", "pecaId": "…", "nome": "Pastilha de freio", "precoUnitario": 90.00, "quantidade": 2, "subtotal": 180.00 } ],
  "orcamento": { "valorTotal": 330.00, "status": "ENVIADO", "enviadoEm": "2026-10-05T14:30:00Z", "respondidoEm": null },
  "marcos": { "recebidaEm": "…", "diagnosticoIniciadoEm": "…", "orcamentoEnviadoEm": "…", "execucaoIniciadaEm": null, "finalizadaEm": null, "entregueEm": null },
  "versao": 5, "criadoEm": "…", "atualizadoEm": "…"
}
```

### 3.5 Acompanhamento do cliente (ADR-011)

| Método | Rota | Acesso | Request | Response |
|---|---|---|---|---|
| GET | `/acompanhamento/ordens-servico/{id}` | C | — | `200 Acompanhamento` · `401` token inválido · `404` |
| POST | `/acompanhamento/ordens-servico/{id}/orcamento/aprovar` | C | — | `200 Acompanhamento` (→ `EM_EXECUCAO`) · `409` |
| POST | `/acompanhamento/ordens-servico/{id}/orcamento/recusar` | C | `{ "motivo", "desistiu": false }` | `200` (ADR-010) · `409` |
| GET | `/acompanhamento/ordens-servico?documento=` | C | — | (Should) |

`Acompanhamento`:

```json
{
  "numero": "OS-2026-000042", "status": "AGUARDANDO_APROVACAO", "statusDescricao": "Aguardando sua aprovação do orçamento",
  "veiculo": { "placa": "ABC1***", "marca": "Fiat", "modelo": "Argo" },
  "cliente": { "nome": "Maria Silva", "documento": "***.982.247-**" },
  "orcamento": { "valorTotal": 330.00, "status": "ENVIADO", "itens": [ { "descricao": "Troca de pastilhas", "quantidade": 1, "subtotal": 150.00 }, { "descricao": "Pastilha de freio", "quantidade": 2, "subtotal": 180.00 } ] },
  "linhaDoTempo": [ { "status": "RECEBIDA", "em": "…" }, { "status": "EM_DIAGNOSTICO", "em": "…" }, { "status": "AGUARDANDO_APROVACAO", "em": "…" } ],
  "proximaAcao": "aprovar ou recusar o orçamento"
}
```

### 3.6 Métricas

| Método | Rota | Acesso | Response |
|---|---|---|---|
| GET | `/metricas/tempo-medio-execucao?de=&ate=&servicoId=` | G (A,M leitura) | `200 { "periodo": { "de", "ate" }, "mediaMinutos": 90.0, "quantidadeOs": 2, "porServico": [ { "servicoId", "nome", "mediaMinutos", "tempoEstimadoMin", "quantidadeOs" } ] }` |
| GET | `/metricas/resumo` | G | `200 { "porStatus": { "RECEBIDA": 3, "EM_DIAGNOSTICO": 1, … } }` (Could) |

## 4. Códigos de status

| Código | Quando |
|---|---|
| 200 / 201 / 204 | sucesso / criado / removido |
| 400 | JSON malformado, parâmetro inválido |
| 401 | sem token, token inválido/expirado |
| 403 | papel insuficiente |
| 404 | recurso inexistente **ou** não pertence ao solicitante (cliente) |
| 409 | conflito de estado: transição inválida, duplicidade, versão desatualizada, OS em aberto |
| 422 | validação de negócio: CPF/CNPJ/placa inválidos, estoque insuficiente, orçamento sem itens |
| 500 | erro inesperado (sem detalhes internos) |

## 5. Formato de erro (único para toda a API)

```json
{
  "tipo": "https://oficina.local/erros/validacao",
  "titulo": "Dados inválidos",
  "status": 422,
  "detalhe": "documento inválido",
  "instancia": "/api/v1/clientes",
  "erros": [ { "campo": "documento", "mensagem": "CPF com dígito verificador inválido" } ],
  "requestId": "…"
}
```

(Formato baseado em RFC 9457 *Problem Details*.)

## 6. Ordem de implementação sugerida (walking skeleton → completo)

1. `/health`, `/auth/login` (seed) → 2. `/clientes`, `/veiculos` → 3. `POST /ordens-servico`, `GET /ordens-servico/{id}` →
4. `/servicos`, `/pecas`, movimentações → 5. diagnóstico + itens + orçamento → 6. enviar + acompanhamento + aprovar/recusar →
7. finalizar + entregar + histórico → 8. listagem com filtros + métricas → 9. usuários/papéis (Should) → 10. cancelar (Could).
