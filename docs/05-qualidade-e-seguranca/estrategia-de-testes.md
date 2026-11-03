# Estratégia de testes

## 1. Camadas existentes

| Camada | Pasta | O que cobre | Banco |
|---|---|---|---|
| Unitários | `test/unit` | domínio puro (política de transições, orçamento, estoque, marcos, tempo de execução, validadores de CPF/CNPJ/placa/ano), DTOs, controllers, visão mascarada do acompanhamento, guards e Swagger | não |
| Serviços | `test/services` | serviços de aplicação com o Prisma simulado (auth, cadastros, catálogo, itens da OS, OS, estoque, acompanhamento, métricas) | não |
| Integração | `test/integration` | API real com PostgreSQL 16 via Testcontainers, migrações e seed: autenticação, cadastros, fluxo completo da OS, estoque (reserva, baixa, rollback, concorrência) | sim (exige Docker) |
| E2E do Nest | `test/app.e2e-spec.ts` | teste gerado pelo template do Nest; confirmar se ainda agrega ou remover | — |

Comandos: `pnpm test`, `pnpm run test:cov` (gate), `pnpm run test:integration`.

## 2. O que a suíte protege

- **Máquina de estados:** `status-transition.policy.spec.ts`, parametrizado por status × comando.
- **Orçamento:** `quote.spec.ts` (total derivado, preço congelado).
- **Estoque:** `stock.domain.spec.ts` (funções puras), `stock.service.spec.ts` e `stock.int-spec.ts` (reserva e baixa transacionais; falta de saldo no meio da aprovação desfaz tudo, com 422; duas aprovações concorrentes disputando as últimas unidades → só uma vence).
- **Autenticação e acesso:** `auth.int-spec.ts` (401/403, rotação de refresh), `tracking-auth.spec.ts`, `swagger.spec.ts` (esquema Bearer, rotas públicas, 401 e 200 com JWT).
- **Fluxo ponta a ponta:** `service-order-flow.int-spec.ts` (criar OS → itens → enviar → aprovar → iniciar → finalizar → entregar → métrica) e `cadastros.int-spec.ts`.
- **Validadores:** CPF/CNPJ, placa (antiga e Mercosul) e ano do veículo.

Convenções: descrições `it('should … when …')` em inglês; dados fictícios válidos; sem CPF, placa ou e-mail reais.

## 3. Cobertura

Gate em `jest.config.ts` (`pnpm run test:cov` falha abaixo da meta):

| Escopo | Meta |
|---|---|
| Global | ≥ 80 % linhas e branches |
| `service-orders/domain` | ≥ 80 % linhas e branches |
| `service-orders/services` | ≥ 80 % linhas e branches |
| `catalog/services` | ≥ 80 % linhas e branches |

`catalog/domain` não tem limite próprio no gate, embora esteja acima de 80 % na medição. Ficam fora da métrica: código gerado do Prisma, seed, `main.ts`, módulos Nest, `index.ts` e `domain/entities` (classes de dados). Controllers e DTOs **entram** na medição.

Resultado e comandos de reprodução: [evidência de cobertura](../06-entrega/evidencias/cobertura.md). A medição precisa ser repetida e vinculada ao hash final da entrega.

## 4. CI

`ci.yml` roda em PR e push para `develop`/`master`: título do PR (Conventional Commits), typecheck, lint, build, testes com cobertura (artefato publicado), testes de integração com PostgreSQL, hadolint, build da imagem, subida do compose, gitleaks e `pnpm audit --prod --audit-level high`. Node 24.

Observação: em 02/11/2026 a suíte sem banco foi validada localmente com Node 24.22.2 porque o Node 22.14.0 da máquina falhou no carregamento ESM; o CI roda em Node 24 (a partir da 24.9 o Jest carrega o `@nestjs/common`, ESM) e a imagem Docker de produção usa Node 22. Validar o runtime do CI na entrega.

## 5. Lacunas conhecidas

| Lacuna | Observação |
|---|---|
| BDD (Cucumber-js, ADR-006) | não implementado; ou implementar os três fluxos em português, ou registrar a ADR como parcialmente atendida e dizer isso no vídeo |
| Compose em máquina limpa por outro integrante | pendente; o fluxo HTTP foi validado contra o compose real em 03/11/2026 (`docs/06-entrega/evidencias/validacao-http-integrada.md`) |
