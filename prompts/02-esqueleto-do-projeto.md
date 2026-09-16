# 02 — Esqueleto do projeto (F1 + F5) — NestJS + Clean Architecture

```text
Gere o esqueleto executável do monólito em TypeScript + NestJS 11 (Node 22) seguindo
docs/04-arquitetura/estrutura-do-repositorio.md (Clean Architecture: domain/ ← application/ ← adapters/ ← infrastructure/
por módulo) e docs/04-arquitetura/visao-geral.md. Nomes em inglês conforme docs/03-ddd/linguagem-ubiqua.md.
Entregue nesta ordem e pare para revisão entre as etapas:

ETAPA 1 — Base
- package.json (scripts: start:dev, build, lint, test, test:e2e, test:cov, migration:*), tsconfig strict, nest-cli.json,
  ESLint + Prettier, .editorconfig já existente, .dependency-cruiser.cjs com as regras da seção 4 da estrutura.
- Pastas src/shared/{domain,application,adapters,infrastructure}, src/modules/{customers,catalog,service-orders,identity}
  cada um com domain/, application/{use-cases,boundaries,models,ports}, adapters/{controllers,presenters,gateways,dto},
  infrastructure/; src/main.ts e src/app.module.ts; test/{unit,integration,bdd,support}.
- Configuração por variáveis de ambiente validada na subida (.env.example completo): DB_URL, JWT_SECRET, JWT_EXPIRES_MIN,
  APP_ENV, ADMIN_EMAIL, ADMIN_PASSWORD, PORT.
- GET /health e GET /ready (checa banco). Logs estruturados (pino ou nest-winston) com requestId e função de máscara
  para CPF/CNPJ/placa. Exception filter global no formato Problem Details (docs/04-arquitetura/contrato-api.md §5).
- @nestjs/swagger em /docs com esquema bearerAuth e tags por módulo; script que exporta openapi.json.
- Value objects em src/shared/domain: Money (decimal 2 casas — usar decimal.js ou bigint em centavos), Quantity
  (decimal 3 casas), Document (Cpf | Cnpj, dígitos verificadores, masked()), LicensePlate (antiga + Mercosul,
  masked()), Email, Phone, ServiceOrderNumber — com testes unitários exaustivos em test/unit/shared.

ETAPA 2 — Banco e contêineres
- PostgreSQL 16 com {{ORM}} (decisão leve: TypeORM ou Prisma — se ainda não registrada em docs/02-adr/decisoes-leves.md,
  pare e pergunte). Um schema por módulo (docs/04-arquitetura/modelo-de-dados.md §2), constraints da §3, migrações
  versionadas, seed de desenvolvimento (§5) apenas em APP_ENV=dev. Entidades do ORM ficam em
  modules/<x>/infrastructure/orm e nunca vazam para domain/.
- Dockerfile multi-stage (node:22-alpine, usuário não-root, HEALTHCHECK em /health).
- docker-compose.yml: api + postgres:16-alpine (volume nomeado, healthcheck) + execução de migrações/seed;
  `docker compose up --build` deve subir tudo e o Swagger responder.

ETAPA 3 — Identity (walking skeleton)
- Módulo identity: User (email, passwordHash bcrypt, roles ATTENDANT|MECHANIC|MANAGER), AuthenticateUserUseCase,
  IssueAccessTokenUseCase, POST /auth/login → JWT ({{AUTH}} — se a ADR-004 ainda não estiver Aceita, implemente a
  proposta A: JWT próprio HS256 e marque como provisório), guard de autenticação em todas as rotas exceto públicas,
  decorator @Roles, usuário seed a partir de env.
- Testes: unit do use case e do token service; integração (supertest): 200 login, 401 sem/expirado, 403 papel.

ETAPA 4 — CI
- .github/workflows/ci.yml: npm ci, lint, dependency-cruiser, testes unitários, testes de integração com Testcontainers
  (Postgres), BDD, cobertura com coverageThreshold ≥ 80 % (linhas e branches) em src/modules/service-orders/{domain,application}
  e src/modules/catalog/{domain,application} — configure o gate mesmo com pastas ainda vazias —, publicação do relatório
  de cobertura e do openapi.json como artefatos; build da imagem Docker.
- .github/workflows/security.yml conforme docs/05-qualidade-e-seguranca/plano-analise-vulnerabilidades.md ({{SCANS}}).

Restrições: sem abstrações sem uso (presenter só onde o formato difere do modelo); README com comandos reais testados;
nenhuma regra de negócio dos módulos ainda (isso vem nos prompts 03–05). Ao final de cada etapa, liste os comandos para
eu verificar localmente.
```
