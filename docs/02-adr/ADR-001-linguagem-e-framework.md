# ADR-001 — Linguagem e framework do back-end

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-04 encerrada em 16/09/2026 |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-04** |
| Data | 2026-09-14 |
| Relacionadas | ADR-002 (banco), ADR-003 (arquitetura), ADR-006 (testes), `docs/04-arquitetura/evolucao-fases.md` |

## Contexto e problema

Precisamos escolher a linguagem/framework do monólito. O enunciado não restringe. Temos 6–8 semanas, trabalho
assíncrono, e o **mesmo projeto será refatorado nas fases seguintes** (Fase 2: Docker/Kubernetes/EKS + CI/CD + Clean
Architecture; Fase 3: API Gateway + serverless na AWS; Fase 4: microsserviços + SAGA + bancos diversos). A decisão
errada aqui custa caro: reescrever não cabe no prazo.

## Critérios de decisão (em ordem de peso)

1. **Familiaridade da maioria do grupo** (quem vai revisar e explicar no vídeo precisa dominar) — peso 5
2. **Produtividade em prazo curto** (scaffolding, ORM, validação, JWT, OpenAPI "de graça") — peso 4
3. **Ecossistema de testes e cobertura** com gate simples no CI — peso 4
4. **Fases futuras**: imagem Docker enxuta, start rápido (K8s/Lambda), bibliotecas para mensageria/observabilidade — peso 3
5. **Referências disponíveis** (exemplos de Tech Challenge SOAT, documentação em português) — peso 2

## Opções consideradas

### Opção A — Java 21 + Spring Boot 3

Spring Web, Spring Data JPA, Spring Security (JWT via `spring-security-oauth2-resource-server` ou `jjwt`), Bean Validation,
springdoc-openapi, Flyway, JUnit 5 + Mockito + Testcontainers, JaCoCo, Cucumber-JVM (BDD).

- **Prós:** ecossistema mais completo para DDD/hexagonal; muitas referências de SOAT; JaCoCo + gate trivial; Spring Security maduro.
- **Contras:** verboso; build/start mais lentos; imagens maiores (mitigável com JRE slim/multi-stage); cold start ruim em Lambda (Fase 3 pode usar função separada em outra linguagem ou SnapStart).
- **Fases futuras:** excelente para K8s/EKS, OpenTelemetry (auto-instrumentação), Spring Cloud Stream/SQS para SAGA.

### Opção B — TypeScript + NestJS (Node 22)

NestJS (módulos = bounded contexts), Prisma **ou** TypeORM, class-validator, `@nestjs/jwt` + Passport, `@nestjs/swagger`,
Jest + supertest, Testcontainers-node, cobertura via Istanbul, Cucumber-js (BDD).

- **Prós:** produtividade alta; estrutura modular natural para hexagonal; Swagger por decorators; testes rápidos; ótimo para Lambda (Fase 3) e imagens pequenas.
- **Contras:** tipagem só em compile-time (validação em runtime obrigatória); ORM: Prisma é simples mas menos "DDD-friendly" (mapeamento de agregados exige camada de conversão).
- **Fases futuras:** muito bom; SDK AWS v3, OpenTelemetry JS, filas (SQS) simples.

### Opção C — C# / .NET 8 (ASP.NET Core)

Controllers ou Minimal APIs, EF Core, FluentValidation, JWT Bearer nativo, Swashbuckle, xUnit + Testcontainers, coverlet + ReportGenerator, SpecFlow/Reqnroll (BDD).

- **Prós:** muito produtivo; tipagem forte; JWT/Swagger nativos; ótimo desempenho; boa história com Clean Architecture (Fase 2).
- **Contras:** menos referências de SOAT em .NET (a FIAP tem trilha .NET separada); quem não usa no dia a dia tem curva.
- **Fases futuras:** bom em K8s (imagens `aspnet` slim); Lambda com .NET ok (cold start médio).

### Opção D — Python 3.12 + FastAPI

FastAPI + Pydantic v2, SQLAlchemy 2 + Alembic, python-jose/PyJWT, pytest + coverage + Testcontainers, behave (BDD).

- **Prós:** rapidez extrema para MVP; OpenAPI automático e excelente; validação nativa (Pydantic); ótimo em Lambda.
- **Contras:** disciplina de tipagem depende do time; DDD com SQLAlchemy exige cuidado (mapeamento imperativo); menos comum em referências SOAT.
- **Fases futuras:** bom; imagens pequenas; OpenTelemetry Python ok.

### Opção E — Go 1.23

Chi/Gin/Echo, sqlc ou GORM, golang-jwt, swaggo/oapi-codegen, testify + Testcontainers-go, `go test -cover`, godog (BDD).

- **Prós:** binário único, imagem mínima, melhor para K8s/Lambda; simples de revisar.
- **Contras:** mais boilerplate para DDD/agregados e validações; menor produtividade inicial se o grupo não domina; menos "mágica" de OpenAPI.
- **Fases futuras:** excelente tecnicamente.

## Matriz comparativa (preencher com a votação; notas 1–5)

| Critério (peso) | A Java/Spring | B TS/NestJS | C .NET | D Python/FastAPI | E Go |
|---|---|---|---|---|---|
| Familiaridade (5) | ? | ? | ? | ? | ? |
| Produtividade (4) | 3 | 5 | 4 | 5 | 3 |
| Testes/cobertura (4) | 5 | 4 | 4 | 4 | 4 |
| Fases futuras (3) | 4 | 4 | 4 | 4 | 5 |
| Referências SOAT (2) | 5 | 4 | 3 | 3 | 3 |

## Recomendação (não vinculante)

**A linguagem que a maioria usa no dia a dia.** A nota vem de DDD, testes, segurança e do vídeo — não da linguagem.
Se o grupo estiver dividido, **Java/Spring** ou **TypeScript/NestJS** são as apostas mais seguras para as 5 fases
(ecossistema completo + referências abundantes). Evitar escolher uma linguagem "para aprender" agora: o prazo é curto.

## Decisão

**TypeScript + NestJS** (Opção B), resultado da enquete E-04 registrado em `docs/00-guia-do-grupo/enquetes.md`.
É a stack do dia a dia da líder e o denominador comum do grupo (JavaScript/Node); Diego transita em Node, Hermando é generalista.

Toolchain concreta (detalhes em `docs/04-arquitetura/estrutura-do-repositorio.md` §5): Node 22 LTS, TypeScript 5 `strict`,
NestJS 11, `class-validator`, `@nestjs/swagger`, `@nestjs/jwt` + `bcrypt`, Jest + `supertest` + Testcontainers + Cucumber-js,
ESLint/Prettier, `dependency-cruiser`, imagem `node:22-alpine`.

**Decisão leve pendente (F1 + F3, registrar em `decisoes-leves.md`):** ORM/migrações — TypeORM (mapeamento explícito,
migrations SQL, mais controle) ou Prisma (schema declarativo, Prisma Migrate, mais rápido). Em ambos, as entidades do ORM
ficam em `infrastructure/orm` e o domínio não as conhece.

## Consequências

- Toolchain de testes/cobertura (ADR-006), Dockerfile e estrutura do repositório fixados para Node/Nest
  (`docs/04-arquitetura/estrutura-do-repositorio.md`).
- Shirley (Python) contribui com features Gherkin, revisão de contrato/Swagger e validação ponta a ponta
  (`docs/00-guia-do-grupo/frentes-e-responsabilidades.md`); Vi revisa o código Nest dos demais.
- Fase 3 (serverless): Node tem cold start baixo em Lambda — sem função separada em outra linguagem.

## Enquete (texto para o Discord)

> **Enquete E-04 — ADR-001 Linguagem/framework do back-end** (prazo 48 h)
> ☕ Java 21 + Spring Boot 3 · 🟦 TypeScript + NestJS · 🟪 C# .NET 8 · 🐍 Python + FastAPI · 🐹 Go
> Responda também no chat: qual você usa no dia a dia hoje?
