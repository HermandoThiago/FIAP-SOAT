# ADR-004 — Autenticação JWT das APIs administrativas

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-08 encerrada em 22/09/2026 (Opção A, conforme recomendação) |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-08** |
| Data | 2026-09-14 (proposta) · 2026-09-22 (decisão) |
| Relacionadas | PRD-005, ADR-011 (acesso do cliente), `docs/04-arquitetura/evolucao-fases.md` |

## Contexto e problema

O enunciado exige "autenticação JWT para APIs administrativas". Precisamos decidir **quem emite e valida** o token e
como modelar papéis. Na Fase 3 o curso trabalha autenticação com API Gateway/serverless (AWS), então a implementação
deve ser trocável.

## Critérios de decisão

1. Simplicidade de subir no `docker compose` e de demonstrar no vídeo — peso 5
2. Segurança adequada (hash de senha, expiração, assinatura, sem segredos no repo) — peso 5
3. Trocabilidade na Fase 3 (Cognito/Lambda authorizer) — peso 3
4. Esforço de implementação e testes — peso 4

## Opções consideradas

### Opção A — JWT emitido pela própria aplicação (módulo `identity`)

Tabela `users` (e-mail, hash bcrypt/argon2, papéis), `POST /auth/login` emite JWT **HS256** (segredo ≥ 32 bytes por env)
com `sub`, `roles`, `iss`, `iat`, `exp` (60 min). Middleware/filter valida o token e injeta o usuário; autorização por papel
nas rotas. Refresh token = Could.

- **Prós:** zero dependência externa; 1 dia de trabalho na maioria dos frameworks; fácil de testar e explicar;
  demonstra na prática o conteúdo de Desenvolvimento Seguro.
- **Contras:** implementação própria exige cuidado (rotação de segredo, brute force); sem SSO.
- **Fases futuras:** um único ponto de validação do token → trocar por validação de JWT do Cognito (RS256 via JWKS) sem mexer nos módulos de negócio.

### Opção B — Keycloak no docker-compose (OIDC)

Realm com usuários/roles; a API só **valida** tokens RS256 via JWKS.

- **Prós:** padrão de mercado; papéis e usuários fora do código; RS256/JWKS igual ao Cognito (Fase 3 fica idêntica).
- **Contras:** contêiner pesado (~700 MB, 30–60 s para subir); configuração de realm exportada/importada; mais coisa para
  explicar no vídeo; login no vídeo depende de UI do Keycloak ou de fluxo `password grant`.

### Opção C — Provedor gerenciado (Cognito/Auth0) já na Fase 1

- **Prós:** alinhado à Fase 3.
- **Contras:** `docker compose up` deixa de ser autossuficiente (dependência de nuvem/credenciais); avaliador precisa de conta; fere "execução local simples".

## Sub-decisões propostas (dentro da opção A)

| Item | Proposta |
|---|---|
| Algoritmo | HS256 no MVP (segredo via `JWT_SECRET`), com abstração para RS256 depois |
| Expiração | 60 min; refresh = Could |
| Papéis | `ATTENDANT`, `MECHANIC`, `MANAGER` (claim `roles`); usuário seed `MANAGER` |
| Hash | bcrypt (custo 10–12) ou argon2id |
| Rotas públicas | `/auth/login`, `/health`, Swagger (dev), `/tracking/**` (ADR-011) |
| Erros | 401 sem token/inválido/expirado; 403 papel insuficiente; corpo padronizado (`docs/04-arquitetura/contrato-api.md`) |

## Recomendação (não vinculante)

**Opção A.** É o que o enunciado pede literalmente, cabe no prazo, é 100 % local e fica com a fronteira certa para a
Fase 3. Keycloak pode ser mencionado no vídeo como evolução.

## Decisão

**JWT próprio** (Opção A): usuários no banco (schema `identity`), senha com **bcrypt**, tokens **HS256** assinados pela
própria aplicação, papéis na claim `roles`. As sub-decisões propostas ficam confirmadas, com os ajustes vindos da ADR-011
(Aceita na mesma rodada — o cliente também faz login):

| Item | Decisão |
|---|---|
| Emissão | `POST /auth/login` (e-mail + senha) → `accessToken` HS256; segredo `JWT_SECRET` ≥ 32 bytes por env; claims `sub` (id do usuário), `roles`, `iss`, `aud=api`, `iat`, `exp` (60 min) e `customerId` quando o papel é `CUSTOMER` |
| Papéis | `ATTENDANT`, `MECHANIC`, `MANAGER` (equipe) **+ `CUSTOMER`** (cliente, ADR-011). `MANAGER` inclui tudo da equipe; `CUSTOMER` só acessa `/tracking/**` |
| Hash de senha | bcrypt, custo 12 (`bcrypt` npm); senha mínima 8 caracteres |
| Validação | um guard global em `shared/` valida assinatura, `exp`, `iss`, `aud` e injeta o usuário na requisição; autorização por papel com o decorator `@Roles()`; rotas públicas em allowlist explícita |
| Token de acompanhamento | mesmo emissor/validador, com `aud=tracking` e `sub=serviceOrderId`, 7 dias (ADR-011) |
| Rotas públicas | `POST /auth/login`, `GET /health`, `GET /ready`, `/docs` (só em `APP_ENV=dev`) |
| Erros | 401 sem token / inválido / expirado (mensagem genérica, sem dizer se o e-mail existe); 403 papel insuficiente; Problem Details (`contrato-api.md` §5) |
| Seed | usuário `MANAGER` criado na subida a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD` (env, documentados no README) |
| Força bruta | rate limit no login (`@nestjs/throttler`) — Should |
| Refresh / logout | Could (fora do MVP) |

## Consequências

- Módulo `identity` (camadas clássicas, ADR-003): `AuthService` (autenticar + emitir/validar token), `UsersService`
  (CRUD de usuários — Should; criação de usuário `CUSTOMER` — ADR-011), `TrackingTokenService` (ADR-011); guard JWT e
  `@Roles()` em `shared/`.
- Bibliotecas: `@nestjs/jwt` (HS256) + `bcrypt`; segredo de teste distinto do `.env.example`; nunca segredos no
  repositório (gitleaks no CI, ADR-007).
- Fase 3: trocar o validador por RS256/JWKS do Cognito sem mexer nos módulos de negócio — o guard é o único ponto que
  conhece o formato do token (`evolucao-fases.md`).
- Testes: unitários do emissor/validador (assinatura inválida, expirado, `aud` errado); integração 200 login / 401 sem
  token e expirado / 403 papel insuficiente (`estrategia-de-testes.md`).

## Enquete (texto para o Discord)

> **Enquete E-08 — ADR-004 Autenticação** (prazo 48 h)
> 🔑 JWT próprio (recomendada) · 🛡️ Keycloak no compose · ☁️ Provedor externo (Cognito/Auth0)
