# 02 — Esqueleto do projeto (F1 + F5 infra — Hermando; Etapa 2 com Diego) — NestJS em camadas clássicas + Prisma

```text
Gere o esqueleto executável do monólito em TypeScript + NestJS 11 (Node 22) seguindo
docs/04-arquitetura/estrutura-do-repositorio.md (camadas clássicas por módulo: controllers/ + dto/ → services/ →
repositories/, todos sobre domain/) e docs/04-arquitetura/visao-geral.md. Nomes em inglês conforme
docs/03-ddd/linguagem-ubiqua.md. Todas as ADRs estão aceitas (docs/02-adr/README.md) — não há decisão pendente.
Entregue nesta ordem e pare para revisão entre as etapas:

ETAPA 1 — Base
- package.json (scripts: start:dev, build, lint, test, test:e2e, test:cov, prisma:migrate, prisma:seed, openapi:export),
  tsconfig strict, nest-cli.json, ESLint + Prettier, .editorconfig já existente, .dependency-cruiser.cjs com as regras
  da seção 4 da estrutura (domain/ sem @nestjs/* e sem @prisma/client; controller nunca importa repositories/; módulos
  só se conhecem pelos serviços exportados).
- Pastas src/shared/{domain,auth,http,prisma,events}, src/modules/{customers,catalog,service-orders,identity} cada um
  com domain/, services/, repositories/, controllers/, dto/ e <modulo>.module.ts; src/main.ts e src/app.module.ts;
  test/{unit,integration,bdd,support}; prisma/{schema.prisma,migrations,seed.ts}.
- Configuração por variáveis de ambiente validada na subida (.env.example completo): DATABASE_URL, JWT_SECRET,
  JWT_EXPIRES_MIN, APP_ENV, ADMIN_EMAIL, ADMIN_PASSWORD, PORT.
- GET /health e GET /ready (checa banco). Logs estruturados (pino) com requestId e função de máscara para
  CPF/CNPJ/placa. Exception filter global no formato Problem Details (docs/04-arquitetura/contrato-api.md §5).
- @nestjs/swagger em /docs e /docs/openapi.json (só em APP_ENV=dev) com esquema bearerAuth e tags por módulo;
  scripts/export-openapi.ts gera o openapi.json sem subir servidor (artefato do CI — ADR-005).
- Value objects em src/shared/domain: Money (decimal 2 casas — usar decimal.js ou bigint em centavos), Quantity
  (decimal 3 casas), Document (Cpf | Cnpj, dígitos verificadores, masked()), LicensePlate (antiga + Mercosul,
  masked()), Email, Phone, ServiceOrderNumber — com testes unitários exaustivos em test/unit/shared.
  UuidV4IdGenerator (crypto.randomUUID) e FixedIdGenerator; SystemClock e FixedClock.

ETAPA 2 — Banco e contêineres
- PostgreSQL 16 com Prisma (E-17): prisma/schema.prisma com multiSchema (schemas customers, catalog, service_orders,
  identity; models com @@schema) conforme docs/04-arquitetura/modelo-de-dados.md §2; ids @db.Uuid sem @default (o id
  vem do domínio — ADR-009); constraints da §3 e a sequência anual da OS escritas à mão na migração SQL; seed de
  desenvolvimento (§5) apenas em APP_ENV=dev via prisma db seed. PrismaService em src/shared/prisma; o domínio nunca
  importa @prisma/client; repositórios mapeiam registro ↔ agregado.
- Dockerfile multi-stage (node:22-alpine, usuário não-root, HEALTHCHECK em /health).
- docker-compose.yml: api + postgres:16-alpine (volume nomeado, healthcheck) + prisma migrate deploy e seed na subida;
  `docker compose up --build` deve subir tudo e o Swagger responder.

ETAPA 3 — Identity (walking skeleton)
- Módulo identity: User (email, passwordHash bcrypt custo 12, roles ATTENDANT|MECHANIC|MANAGER|CUSTOMER, customerId
  obrigatório se e só se CUSTOMER), AuthService (login → JWT HS256 com sub, roles, iss, aud=api, exp 60 min e customerId
  quando CUSTOMER — ADR-004), TrackingTokenService (aud=tracking, sub=serviceOrderId, 7 dias — ADR-011), UsersService
  (register; usuário CUSTOMER criável por ATTENDANT/MANAGER, validando o cliente pelo CustomersService), POST
  /auth/login; guards em src/shared/auth: JwtAuthGuard global (rotas públicas em allowlist com @Public()), @Roles(),
  TrackingAuthGuard (token de acompanhamento ou login CUSTOMER; rejeita JWT de equipe); usuário seed MANAGER a partir
  de env.
- Testes: unit dos services e dos tokens (assinatura inválida, expirado, aud errado); integração (supertest): 200
  login, 401 sem/expirado, 403 papel, 403 CUSTOMER em rota administrativa.

ETAPA 4 — CI
- .github/workflows/ci.yml (PR e push em develop e master — GitFlow, ADR-008): validação do título do PR em
  Conventional Commits (amannn/action-semantic-pull-request), recusa de PR para master vindo de branch que não seja
  release/* ou hotfix/*, npm ci, lint, dependency-cruiser, testes unitários, testes de integração com Testcontainers
  (Postgres), BDD, cobertura com coverageThreshold ≥ 80 % (linhas e branches) em src/modules/service-orders/{domain,services}
  e src/modules/catalog/{domain,services} — configure o gate mesmo com pastas ainda vazias —, publicação do relatório
  de cobertura e do openapi.json como artefatos; build da imagem Docker (tag <sha-curto>; tag vX.Y.Z quando houver tag).
- .github/workflows/security.yml conforme docs/05-qualidade-e-seguranca/plano-analise-vulnerabilidades.md (ADR-007):
  Semgrep, npm audit + Trivy fs, hadolint, gitleaks, build + Trivy image em todo PR; ZAP no push em develop/master ou
  manual.

Restrições: sem abstrações sem uso; README com comandos reais testados; nenhuma regra de negócio dos módulos ainda
(isso vem nos prompts 03–05). Ao final de cada etapa, liste os comandos para eu verificar localmente.
```
