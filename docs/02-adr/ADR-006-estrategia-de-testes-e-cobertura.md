# ADR-006 — Estratégia de testes e cobertura ≥ 80 % nos domínios críticos

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-12 encerrada em 22/09/2026 (Testcontainers + BDD com Cucumber-js, conforme recomendação) |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-12** |
| Data | 2026-09-14 (proposta) · 2026-09-22 (decisão) |
| Relacionadas | ADR-001, ADR-002, ADR-003, ADR-013, `docs/05-qualidade-e-seguranca/estrategia-de-testes.md` |

## Contexto e problema

Enunciado: "testes unitários e de integração para os principais fluxos" e "cobertura mínima de 80 % nos domínios
críticos". A disciplina de Qualidade cobre pirâmide de testes, **TDD e BDD**. Precisamos definir: o que conta como
"domínio crítico", como medir, como rodar testes de integração com banco e se faremos BDD.

## Pacote decidido

| Tema | Decisão |
|---|---|
| Domínios críticos | Módulos `service-orders` (OS/orçamento/status) e `catalog` (estoque) — pastas `domain/` + `services/` (camadas clássicas, ADR-003) |
| Meta | ≥ 80 % de linhas **e** de branches nos módulos críticos; ≥ 60 % global (informativo) |
| Gate | CI falha abaixo da meta — Jest `coverageThreshold` por pasta |
| Pirâmide | ~70 % unitários (domínio puro e services com repositórios fake em memória), ~25 % integração (services + repositórios reais + HTTP), ~5 % ponta a ponta (fluxo completo via API) |
| Banco nos testes de integração | **Testcontainers** (PostgreSQL 16 real) — E-12a |
| BDD | **Sim**: cenários Gherkin em português executados por **Cucumber-js** nos 3 fluxos principais — E-12b |
| TDD | Recomendado no domínio (máquina de estados, cálculo de orçamento, VOs) — não obrigatório |
| Dados de teste | Builders/fixtures com CPF/CNPJ/placas gerados válidos e fictícios; sem dados reais |
| Testes de contrato/API | Cada endpoint tem ao menos: caso feliz + 1 validação (422) + 1 autorização (401/403) |
| Convenções | `it('should <resultado> when <condição>')` em inglês (ADR-013); um assert lógico por teste; testes de transição parametrizados cobrindo a tabela completa da PRD-004 |

## Opções votadas

1. Banco de teste: 🐳 **Testcontainers / serviço do compose** (recomendado — o que roda em produção é o que testamos) × 💾 em memória.
2. BDD: 👍 **sim** (recomendado, 3 fluxos) × 👎 não.

## Recomendação (não vinculante)

Testcontainers + BDD para os 3 fluxos. O custo é baixo com IA gerando o esqueleto dos steps, e o ganho no vídeo
("os testes automatizados") é grande: mostrar o relatório de cobertura + os cenários Gherkin passando.

## Decisão

Pacote acima aceito, com as duas escolhas em votação fechadas:

1. **Banco nos testes de integração: Testcontainers** (`@testcontainers/postgresql`) — sobe um PostgreSQL 16 real por
   execução, aplica as migrações do Prisma (`prisma migrate deploy`, E-17) e roda os testes contra o mesmo motor da
   produção. Localmente exige Docker; no GitHub Actions (`ubuntu-latest`) funciona sem configuração extra.
2. **BDD: sim, Cucumber-js nos 3 fluxos principais** — features em português (`# language: pt`) executadas contra a API
   real (supertest) sobre o banco de teste: `service-order-creation.feature` (criar OS + orçamento),
   `quote-and-approval.feature` (aprovação + execução) e `stock-management.feature` (estoque).
   `execution-and-delivery.feature` e `authentication.feature` são Should.

Ferramentas concretas (ADR-001): Jest + `supertest` + Testcontainers + Cucumber-js (`@cucumber/cucumber`); cobertura via
Istanbul com `coverageThreshold` ≥ 80 % (linhas e branches) em `src/modules/service-orders/{domain,services}` e
`src/modules/catalog/{domain,services}`; scripts `npm test` (unitários), `npm run test:e2e` (integração + BDD) e
`npm run test:cov` (cobertura com gate).

## Consequências

- CI executa: lint → unitários → integração (Testcontainers) → BDD → cobertura com gate → relatório publicado como
  artefato (badge no README é Could).
- Shirley (F2) escreve as features Gherkin a partir dos critérios de aceite dos PRDs; Hermando (F4) automatiza os steps.
- `docs/05-qualidade-e-seguranca/estrategia-de-testes.md` detalha o que testar por módulo e as convenções.

## Enquete (texto para o Discord)

> **Enquete E-12 — ADR-006 Testes** (prazo 48 h)
> Banco nos testes de integração: 🐳 Testcontainers/compose · 💾 em memória
> BDD (Gherkin) para os 3 fluxos principais: 👍 sim · 👎 não
