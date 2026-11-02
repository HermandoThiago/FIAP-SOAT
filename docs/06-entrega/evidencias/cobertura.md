# Evidência de cobertura de testes (T8)

- **Data da medição:** 02/11/2026 · **Comando:** `npm run test:cov` (Jest + ts-jest; 562 testes unitários, sem banco).
- **Gate:** `jest.config.ts` (`coverageThreshold`) derruba o comando se alguma meta abaixo cair; o CI roda o mesmo comando
  (`.github/workflows/ci.yml`, job *unit-tests*).
- **Meta (CLAUDE.md / ADR-006):** ≥ 80 % de **linhas e branches** em `domain/` + `services/` dos módulos críticos
  (`service-orders` e `catalog`), mais um piso global de 80 %.

## Resultado

| Escopo | Linhas | Branches | Funções | Meta | Situação |
|---|---|---|---|---|---|
| `service-orders/services` | 98,88 % | 87,79 % | 98,43 % | ≥ 80 % | ✅ |
| `service-orders/domain` (+ `policies`) | 100 % | 93,75 % (policies 100 %) | 100 % | ≥ 80 % | ✅ |
| `catalog/services` (inclui `StockService`) | 100 % | 88,6 % | 100 % | ≥ 80 % | ✅ |
| `catalog/domain` (regras de estoque) | 100 % | 100 % | 100 % | ≥ 80 % | ✅ |
| `customers/services` | 99,23 % | 93,18 % | 100 % | piso global | ✅ |
| `identity/services` | 100 % | 87,8 % | 94,73 % | piso global | ✅ |
| `identity/auth` (guards, contexto) | 96,15 % | 80,43 % | 94,44 % | piso global | ✅ |
| **Projeto (global)** | **97,42 %** | **83,49 %** | **90,25 %** | ≥ 80 % | ✅ |

## O que entra e o que fica de fora da medição

- **Fora:** código gerado pelo Prisma (`src/generated`), seed (`src/scripts`), `main.ts`, módulos Nest (`*.module.ts`),
  `index.ts` de reexport e `domain/entities/**` (classes de dados só com decorators, sem comportamento — o TypeScript emite
  helpers de decorator que contam como branches e distorcem o percentual).
- Os branches restantes dos `controllers/` e `dtos/` são, na maioria, código emitido para decorators do
  `class-validator`/Swagger; o comportamento deles (validação, papéis, delegação) é exercitado nos testes de controller e de
  DTO e nos testes de integração.

## Testes de integração (não entram no percentual acima)

`npm run test:integration` sobe um PostgreSQL 16 descartável (Testcontainers), aplica as migrações e o seed e exercita a API
inteira (82 testes): auth e papéis, cadastros, fluxo completo da OS (recebimento → entrega, com orçamento aprovado e
rejeitado), acompanhamento do cliente, detalhamento, métrica de tempo médio, **estoque** (movimentações manuais, reserva na
aprovação, baixa na finalização, invariantes no banco) e atomicidade: falta de estoque no meio da aprovação desfaz as
reservas já feitas, o status e a resposta do orçamento (T10), e duas aprovações concorrentes disputando as últimas unidades.
