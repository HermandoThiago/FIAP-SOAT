# BDD — Cucumber-js (ADR-006)

Cenários em português executados contra a API real (NestJS + supertest) sobre o PostgreSQL de teste com as migrações
aplicadas. Configuração em `cucumber.js`; relatório em `reports/bdd/report.html` (ignorado pelo git).

## Como rodar

```bash
npm run test:bdd                      # com Docker: sobe o PostgreSQL 16 via Testcontainers
TEST_DATABASE_URL=postgresql://oficina:oficina@localhost:5432/oficina_test npm run test:bdd   # sem Docker
```

## Estrutura

| Pasta | O que contém |
| ----- | ------------ |
| `features/` | Um `.feature` por fluxo (`# language: pt`), nome do arquivo em inglês (`service-order-creation.feature`, `quote-and-approval.feature`, `stock-management.feature`). |
| `steps/` | Definições de passos. `api.steps.ts` traz os comuns (consultar rota, enviar POST, verificar status/corpo/Problem Details); cada fluxo ganha o seu `<fluxo>.steps.ts`. |
| `support/` | `world.ts` (`ApiWorld`: `app`, `agent`, `lastResponse`, `get`/`post`) e `hooks.ts` (banco + app uma vez por execução). |

## Convenções

- Features seguem os critérios de aceite dos PRDs; texto dos passos em português, código e identificadores em inglês.
- Passos usam `function (this: ApiWorld, ...)` (nunca arrow function) para acessar o World; guardam a resposta em
  `this.lastResponse` e verificam com `node:assert/strict` — sem Jest aqui.
- Corpo de requisição vai em docstring JSON:

  ```gherkin
  Quando envio POST "/api/v1/customers" com o corpo:
    """
    { "name": "Cliente Exemplo" }
    """
  Então a resposta é 201
  ```

- Dados fictícios porém válidos (CPF/CNPJ/placa gerados por `test/support/generators.ts`); nunca dados reais.
- A app é compartilhada entre cenários: cada cenário cria os próprios registros (ids/documentos únicos) e não depende
  da ordem de execução. `strict: true` — passo sem definição falha a execução.
