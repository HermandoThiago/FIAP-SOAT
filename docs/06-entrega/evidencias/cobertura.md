# Evidência de cobertura de testes (T8)

## Medição de 02/11/2026 (suíte sem banco + integração)

- Base: `6f62d13` com alterações locais não commitadas (Swagger e documentação). Repetir no hash final.
- Ambiente: Windows, Node 24.22.2 temporário via `npm exec`, pnpm 10.15.1, Docker Desktop (WSL 2). O Node 22.14.0 da máquina falha no carregamento ESM; o CI usa Node 24 e a imagem Docker, Node 22.
- Typecheck e build NestJS: aprovados.
- Sem banco: **37 suítes, 567 testes aprovados**. Global: **97,51 % de linhas, 83,99 % de branches**, 90,29 % de funções. Gate aprovado.
- Integração (`test:integration`, Testcontainers + PostgreSQL 16, migrações reais): **4 suítes, 82 testes aprovados**.

| Escopo crítico | Linhas | Branches |
|---|---|---|
| `service-orders/services` | 98,88 % | 87,79 % |
| `service-orders/domain` | 100 % | 93,75 % |
| `catalog/services` | 100 % | 88,60 % |
| `catalog/domain` | 100 % | 100 % |

Uma primeira execução na mesma data teve uma suíte (`metrics.controller.spec.ts`) interrompida por erro de leitura de arquivo (`UNKNOWN: unknown error, open`) com a máquina sem memória; na repetição, isolada, todas passaram.

Comandos (raiz do repositório, PowerShell):

```powershell
npm.cmd exec --yes --package=node@24 -- node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand --coverage --silent
npm.cmd exec --yes --package=node@24 -- node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/integration/jest-integration.json --runInBand
```

O histórico abaixo foi preservado.

## Revalidação local — correção do Swagger (02/11/2026)

- Base: branch local `developer`, HEAD `6f62d13c66da6b34ca7c55a387e3031584201d4c`, **com alterações locais ainda não commitadas** em Swagger e seu teste de regressão. Esta medição não representa um novo commit publicado.
- Ambiente: Windows, **Node 24.22.2 temporário** via `npm exec`, dependências instaladas com pnpm 10.15.1 e `--frozen-lockfile`, sem alterar o lockfile ou instalar Node globalmente.
- Resultado: **37 suítes, 567 testes aprovados**; gate de cobertura aprovado. O novo `src/shared/swagger.ts` teve 100% em linhas, branches e funções.
- Global: **97,51% de linhas**, **83,99% de branches**, 90,29% de funções e 96,83% de statements.
- Escopos críticos: `service-orders/services` 98,88% linhas / 87,79% branches; `service-orders/domain` 100% / 93,75% (policies 100%); `catalog/services` 100% / 88,60%; `catalog/domain` 100% / 100%.
- Relatório bruto local: `coverage/lcov.info`; HTML: `coverage/lcov-report/index.html` (ignorados pelo Git, regeneráveis pelo comando abaixo).
- Também aprovados: typecheck (`tsc --noEmit`), build NestJS com Node 24 e formatação/lint dos arquivos novos/alterados de Swagger.
- **Limites:** os testes HTTP de Swagger usam controllers e guards JWT reais, mas serviços de autenticação/cadastro simulados; não acessam PostgreSQL nem validam credenciais reais. Testes de integração com banco, Compose e navegação manual no Swagger UI não foram executados nesta revalidação.
- Node 22.14.0 da máquina falhou no carregamento ESM das dependências antes de executar os testes/build. Não foi alterado o runtime do projeto ou do Docker; validar um Node compatível no ambiente de entrega.

Comandos utilizados (raiz do repositório, PowerShell):

```powershell
npm.cmd exec --yes --package=pnpm@10.15.1 -- pnpm install --frozen-lockfile
npm.cmd exec --yes --package=node@24 -- node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/unit/swagger.spec.ts
npm.cmd exec --yes --package=node@24 -- node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand --coverage --silent
npm.cmd exec --yes --package=node@24 -- node ./node_modules/@nestjs/cli/bin/nest.js build
.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
.\node_modules\.bin\prettier.cmd --check src/main.ts src/shared/swagger.ts test/unit/swagger.spec.ts
.\node_modules\.bin\oxlint.cmd --type-aware src/shared/swagger.ts test/unit/swagger.spec.ts
```

Repetir a medição e associá-la ao hash final antes da submissão. O registro anterior abaixo foi preservado como histórico.

## Medição anterior (antes da correção do Swagger)

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
