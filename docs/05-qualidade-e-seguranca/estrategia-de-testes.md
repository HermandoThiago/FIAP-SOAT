# Estratégia de testes

> Concretiza a ADR-006. Meta do enunciado: testes unitários e de integração dos fluxos principais; **cobertura ≥ 80 %
> nos domínios críticos** (`service-orders`, `catalog`).

## 1. Pirâmide

```mermaid
flowchart TB
    E2E["🔺 Ponta a ponta (≈5 %)<br/>fluxo completo via HTTP no compose:<br/>login → cliente → veículo → OS → itens → enviar → aprovar → finalizar → entregar → métrica"]
    INT["🔶 Integração (≈25 %)<br/>casos de uso + repositório real (Testcontainers) + controllers<br/>auth 401/403 · validações 422 · transições 409 · transação aprovação+estoque"]
    UNIT["🟩 Unitários (≈70 %)<br/>domínio puro: máquina de estados (todas as combinações), cálculo do orçamento,<br/>VOs (CPF/CNPJ/placa/dinheiro), invariantes de estoque, políticas"]
    E2E --> INT --> UNIT
```

## 2. O que testar, por módulo

| Módulo | Unitário (domínio/aplicação com fakes) | Integração | BDD (se ADR-006 aprovar) |
|---|---|---|---|
| `shared` | `Document` (CPF/CNPJ válidos/inválidos/repetidos/formatados), `LicensePlate` (antiga/Mercosul/normalização), `Money` (arredondamento, soma, multiplicação), `Quantity` | — | — |
| `customers` | Regras de inativação; unicidade via fake de repositório | POST/GET/PUT/DELETE clientes/veículos; 409 duplicado; 422 documento/placa | — |
| `catalog` | `Part.recordInbound/withdraw/reserve/release/adjust` (nunca negativo; movimentação gerada); snapshot de preço | Movimentações via API; constraint de estoque ≥ 0 | *Gestão de estoque* |
| `service-orders` | **Tabela de transições completa** (parametrizado: cada par de/ação → esperado); orçamento recalculado; itens congelados; enviar sem itens; aprovar duas vezes; histórico append-only; `version` incrementa | Fluxo completo via API; aprovação baixa estoque na mesma transação (falha na baixa → OS não muda); acompanhamento com token válido/inválido/expirado; tempo médio com seed | *Criação da OS e orçamento*; *Aprovação e execução* |
| `identity` | Emissão/validação de JWT (assinatura, exp, roles); hash de senha | Login 200/401; rota protegida 401/403 | — |

## 3. Convenções

- Nome: `should <resultado> when <condição>` no `it()` (ex.: `it('should reject completion when status is RECEIVED')`) — descrições em inglês, como o código (ADR-013).
- Arrange/Act/Assert; um comportamento por teste; builders (`aServiceOrder().inDiagnosis().withService(...).build()`).
- Dados fictícios válidos gerados por utilitário (`validCpf()`, `mercosulLicensePlate()`); nunca dados reais.
- Relógio e ids injetados (`FixedClock`, `SequentialIdGenerator`) → testes determinísticos.
- Testes de integração sobem o banco com **Testcontainers** (ou o serviço do compose em CI) e aplicam migrações reais.
- Cada endpoint: caso feliz + 1 validação (422) + 1 autorização (401/403) no mínimo.

## 4. Cobertura

| Escopo | Meta | Ferramenta (por linguagem) |
|---|---|---|
| `service-orders` domain+application | ≥ 80 % linhas e branches (gate) | Jest/Istanbul (`coverageThreshold` por pasta) |
| `catalog` domain+application | ≥ 80 % (gate) | idem |
| Global | ≥ 60 % (informativo) | idem |
| Excluídos da métrica | DTOs, mapeadores triviais, configuração, `main`, código gerado | configuração da ferramenta |

O CI publica o relatório (HTML) como artefato e falha abaixo do gate. Badge no README (Could).

## 5. BDD — features (Gherkin, em português)

```gherkin
# language: pt
Funcionalidade: Aprovação do orçamento inicia a execução
  Contexto:
    Dado uma OS "OS-2026-000001" em "AWAITING_APPROVAL" com orçamento de R$ 330,00
    E a peça "Pastilha de freio" com estoque 12 e 2 unidades na OS

  Cenário: Cliente aprova o orçamento
    Quando o cliente aprova o orçamento com um token de acompanhamento válido
    Então a OS passa para "IN_PROGRESS"
    E o estoque de "Pastilha de freio" passa a 10
    E o histórico registra a transição "AWAITING_APPROVAL -> IN_PROGRESS" pelo autor "CUSTOMER"

  Cenário: Token inválido
    Quando o cliente tenta aprovar com um token expirado
    Então a resposta é 401
    E a OS continua em "AWAITING_APPROVAL"
```

Features planejadas (arquivos em inglês, cenários em português): `service-order-creation.feature`,
`quote-and-approval.feature`, `execution-and-delivery.feature`, `stock-management.feature`, `authentication.feature`.

## 6. Pipeline de testes no CI

```mermaid
flowchart LR
    A[Checkout] --> B[Build + lint] --> C[Unitários] --> D[Sobe banco<br/>Testcontainers/compose] --> E[Integração] --> F[BDD] --> G{Cobertura ≥ 80 %<br/>nos módulos críticos?}
    G -- sim --> H[Publica relatório<br/>+ openapi.json]
    G -- não --> X[Falha o PR]
```

## 7. Evidências para a entrega

- Print/GIF do relatório de cobertura (percentual por módulo) → `docs/06-entrega/evidencias/`.
- Saída dos testes BDD passando (cenários em português) → vídeo, bloco "testes automatizados".
- Link do workflow verde no PR final.
