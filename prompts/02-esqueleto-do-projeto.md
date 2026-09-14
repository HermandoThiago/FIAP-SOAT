# 02 — Esqueleto do projeto (F1) — usar após Lote 1 + ADR-004/008

```text
Gere o esqueleto executável do monólito em {{LINGUAGEM}} / {{FRAMEWORK}} seguindo docs/04-arquitetura/estrutura-do-repositorio.md
e docs/04-arquitetura/visao-geral.md ({{ARQUITETURA}}). Entregue, nesta ordem, e pare para revisão entre as etapas:

ETAPA 1 — Base
- Estrutura de pastas src/shared, src/modules/{cadastro,catalogo-estoque,atendimento,identidade}, src/main, tests/.
- Configuração por variáveis de ambiente (.env.example completo): DB_URL, JWT_SECRET, JWT_EXPIRES_MIN, APP_ENV,
  ADMIN_EMAIL, ADMIN_PASSWORD, PORT.
- GET /health e GET /ready (checa banco). Logs estruturados com requestId e função de máscara para CPF/CNPJ/placa.
- Tratamento global de erros no formato Problem Details (docs/04-arquitetura/contrato-api.md §5).
- OpenAPI/Swagger ({{OPENAPI}}) com esquema bearerAuth e tags por módulo.
- Value objects em shared/domain: Documento (CPF/CNPJ com dígitos verificadores), Placa (antiga + Mercosul),
  Dinheiro (decimal 2 casas), Quantidade (decimal 3 casas), Email, Telefone — com testes unitários exaustivos.

ETAPA 2 — Banco e contêineres
- {{BANCO}} com {{ORM}} e migrações {{MIGRACOES}}: um schema por módulo (docs/04-arquitetura/modelo-de-dados.md),
  constraints da §3, seed de desenvolvimento (§5) apenas em APP_ENV=dev.
- Dockerfile multi-stage, usuário não-root, imagem slim, HEALTHCHECK.
- docker-compose.yml: api + banco (volume nomeado) + execução de migrações/seed; `docker compose up --build` deve
  subir tudo e o Swagger responder.

ETAPA 3 — Identidade (walking skeleton)
- Módulo identidade: Usuario (email, senhaHash bcrypt/argon2, papeis), POST /auth/login → JWT {{AUTH}}, filtro de
  autenticação em todas as rotas exceto públicas, autorização por papel, usuário seed a partir de env.
- Testes de integração: 200 login, 401 sem/expirado, 403 papel.

ETAPA 4 — CI
- .github/workflows/ci.yml: build, lint, testes unitários, testes de integração (Testcontainers ou serviço do compose),
  cobertura com gate ≥ 80 % em atendimento e catalogo-estoque (ainda que vazios, configure o gate), publicação do
  relatório de cobertura e do openapi.json como artefatos.
- .github/workflows/security.yml conforme docs/05-qualidade-e-seguranca/plano-analise-vulnerabilidades.md ({{SCANS}}).
- Lint de arquitetura (ArchUnit/dependency-cruiser/NetArchTest/import-linter/go-arch-lint) com as regras de
  docs/04-arquitetura/estrutura-do-repositorio.md.

Restrições: sem abstrações sem uso; README com comandos reais testados; nenhuma regra de negócio dos módulos ainda
(isso vem nos prompts 03–05). Ao final de cada etapa, liste os comandos para eu verificar localmente.
```
