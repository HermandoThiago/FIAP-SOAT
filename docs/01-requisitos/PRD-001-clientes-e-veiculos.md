# PRD-001 — Clientes e veículos (contexto `customers`)

| Campo | Valor |
|---|---|
| Status | Planejamento (ver *Situação da implementação*) |
| Dono | F3 (Domínio & API) · apoio F4 (validações) |
| Origem no enunciado | "Identificação do cliente por CPF/CNPJ"; "Cadastro de veículo (placa, marca, modelo, ano)"; "CRUD de clientes"; "CRUD de veículos"; "Validação dos dados sensíveis (CPF/CNPJ, placa de veículo)" |
| Contexto DDD | `customers` (supporting) — ver `docs/ddd/contextos-delimitados.md` |

## Situação da implementação

> Planejamento original; onde o código difere, vale o código ([contrato](../04-arquitetura/contrato-api.md), [divergências das ADRs](../02-adr/README.md#leitura-das-divergências)). Nomes de status, papéis e rotas no texto abaixo são os do planejamento.

| Requisito | Situação |
|---|---|
| Entidade `Customer` | **Não existe**: cliente é um `Usuario` com perfil Cliente, sem senha de acesso própria; documento imutável |
| RF-002 consulta por documento | `GET /customers?usuarioDocumento=`; a OS também aceita `customerDocument` |
| RF-005 / RF-009 remoção | exclusão lógica; cliente com OS em aberto → 409 |
| RF-010 cadastrar na hora, junto com a OS | **Não implementado**: cadastro de cliente e veículo é anterior e separado |
| `active` | campo `usuarioAtivo` (cliente) e inativação do veículo |
| RN-008 mascaramento | respostas do acompanhamento mascaram documento e placa; máscara em logs não foi verificada |

## 1. Objetivo

Manter o histórico de clientes e veículos da oficina, permitindo identificar rapidamente um cliente por CPF/CNPJ e vincular
seus veículos às ordens de serviço.

## 2. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-001 | Cadastrar cliente com tipo (PF/PJ), documento (CPF ou CNPJ), nome/razão social, e-mail e telefone | Must |
| RF-002 | Consultar cliente por **documento** (CPF/CNPJ) e por id | Must |
| RF-003 | Listar clientes (paginação simples; filtro por nome/documento) | Should |
| RF-004 | Atualizar dados do cliente (documento **não** é alterável após criação) | Must |
| RF-005 | Remover cliente (soft delete = inativar) somente se não houver OS em aberto | Must (regra) / Could (soft delete) |
| RF-006 | Cadastrar veículo vinculado a um cliente: placa, marca, modelo, ano (+ cor opcional) | Must |
| RF-007 | Consultar veículo por id e por placa; listar veículos de um cliente | Must |
| RF-008 | Atualizar veículo (placa alterável apenas por `MANAGER`, com validação) | Must |
| RF-009 | Remover veículo se não houver OS em aberto | Must |
| RF-010 | Na criação da OS, permitir identificar cliente por documento e **cadastrar cliente/veículo na hora** se não existirem (atalho de atendimento) | Should |

## 3. Regras de negócio

| ID | Regra |
|---|---|
| RN-001 | CPF: 11 dígitos, dígitos verificadores válidos, rejeitar sequências repetidas (`111.111.111-11`); armazenar só dígitos |
| RN-002 | CNPJ: 14 dígitos, dígitos verificadores válidos; armazenar só dígitos (avaliar formato alfanumérico da Receita a partir de 2026 — *Could*) |
| RN-003 | Documento é **único** entre clientes ativos |
| RN-004 | Placa: aceitar padrão antigo `AAA9999` e Mercosul `AAA9A99`; normalizar para maiúsculas sem hífen; única entre veículos ativos |
| RN-005 | Ano do veículo entre 1900 e ano atual + 1 |
| RN-006 | E-mail válido (formato); telefone só dígitos com DDD (10–11) — ambos opcionais mas um deles é recomendado para "envio" do orçamento |
| RN-007 | Cliente/veículo com OS em aberto (status ≠ Entregue/Cancelada) não pode ser removido |
| RN-008 | Documento e placa aparecem **mascarados** em logs (`***.456.789-**`, `ABC1***`); respostas de APIs administrativas retornam completos; respostas para o cliente retornam mascarados |

## 4. Critérios de aceite (Gherkin)

```gherkin
Funcionalidade: Cadastro de clientes
  Cenário: Cadastrar cliente PF com CPF válido
    Dado que estou autenticado como ATTENDANT
    Quando cadastro o cliente "Maria Silva" com CPF "529.982.247-25"
    Então o cliente é criado com id e documento "52998224725"
    E a resposta é 201 com Location

  Cenário: Rejeitar CPF inválido
    Quando cadastro um cliente com CPF "123.456.789-00"
    Então a resposta é 422 com erro "documento inválido"

  Cenário: Rejeitar documento duplicado
    Dado que existe cliente com CNPJ "45.723.174/0001-10"
    Quando cadastro outro cliente com o mesmo CNPJ
    Então a resposta é 409

Funcionalidade: Cadastro de veículos
  Cenário: Cadastrar veículo Mercosul
    Dado um cliente existente
    Quando cadastro o veículo placa "abc1d23", marca "Fiat", modelo "Argo", ano 2022
    Então o veículo é criado com placa "ABC1D23" vinculado ao cliente

  Cenário: Rejeitar placa inválida
    Quando cadastro veículo com placa "AB12345"
    Então a resposta é 422
```

> Os documentos dos exemplos são fictícios, gerados com dígitos verificadores válidos.

## 5. API (resumo — contrato completo em `docs/04-arquitetura/contrato-api.md`)

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | `/customers` | ATTENDANT+ | Cria cliente |
| GET | `/customers?document=&name=&page=&size=` | ATTENDANT+ | Lista/busca |
| GET | `/customers/{id}` | ATTENDANT+ | Detalha |
| PUT | `/customers/{id}` | ATTENDANT+ | Atualiza |
| DELETE | `/customers/{id}` | MANAGER | Inativa |
| GET | `/customers/{id}/vehicles` | ATTENDANT+ | Veículos do cliente |
| POST | `/vehicles` | ATTENDANT+ | Cria veículo (body inclui `customerId`) |
| GET | `/vehicles?licensePlate=` · `/vehicles/{id}` | ATTENDANT+ | Busca/detalha |
| PUT | `/vehicles/{id}` | ATTENDANT+ (placa: MANAGER) | Atualiza |
| DELETE | `/vehicles/{id}` | MANAGER | Inativa |

## 6. Modelo (resumo)

- **Customer** (agregado): `id`, `customerType (INDIVIDUAL|COMPANY)`, `document` (VO `Document` = CPF | CNPJ), `name`, `email`, `phone`, `active`, timestamps.
- **Vehicle** (agregado): `id`, `customerId`, `licensePlate` (VO `LicensePlate`), `brand`, `model`, `year`, `color?`, `active`, timestamps.

## 7. Fora de escopo

Endereço completo, múltiplos contatos, histórico de proprietários do veículo, consulta a bases externas (Receita/DETRAN).

## 8. Questões abertas

| # | Questão | Proposta |
|---|---|---|
| Q1 | Veículo pode trocar de dono? | Não no MVP (novo cadastro) |
| Q2 | Remoção física ou soft delete? | Soft delete (`active=false`) — preserva histórico das OS |

## 9. Evidências para a entrega

Swagger com os CRUDs; testes unitários dos VOs `Document` e `LicensePlate` (casos válidos/inválidos); teste de integração de
criação + duplicidade; bloco do vídeo "validação de dados sensíveis".
