# ADR-004 — Autenticação JWT das APIs administrativas

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 2) |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-08** |
| Data | 2026-09-14 |
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

### Opção A — JWT emitido pela própria aplicação (módulo `identidade`)

Tabela `usuarios` (e-mail, hash bcrypt/argon2, papéis), `POST /auth/login` emite JWT **HS256** (segredo ≥ 32 bytes por env)
com `sub`, `roles`, `iss`, `iat`, `exp` (60 min). Middleware/filter valida o token e injeta o usuário; autorização por papel
nas rotas. Refresh token = Could.

- **Prós:** zero dependência externa; 1 dia de trabalho na maioria dos frameworks; fácil de testar e explicar;
  demonstra na prática o conteúdo de Desenvolvimento Seguro.
- **Contras:** implementação própria exige cuidado (rotação de segredo, brute force); sem SSO.
- **Fases futuras:** porta `EmissorDeToken`/`ValidadorDeToken` → trocar por validação de JWT do Cognito (RS256 via JWKS) sem mexer no domínio.

### Opção B — Keycloak no docker-compose (OIDC)

Realm com usuários/roles; a API só **valida** tokens RS256 via JWKS.

- **Prós:** padrão de mercado; papéis e usuários fora do código; RS256/JWKS igual ao Cognito (Fase 3 fica idêntica).
- **Contras:** contêiner pesado (~700 MB, 30–60 s para subir); configuração de realm exportada/importada; mais coisa para
  explicar no vídeo; login no vídeo depende de UI do Keycloak ou de fluxo `password grant`.

### Opção C — Provedor gerenciado (Cognito/Auth0) já na Fase 1

- **Prós:** alinhado à Fase 3.
- **Contras:** `docker compose up` deixa de ser autossuficiente (dependência de nuvem/credenciais); avaliador precisa de conta; fere "execução local simples".

## Sub-decisões (dentro da opção A)

| Item | Proposta |
|---|---|
| Algoritmo | HS256 no MVP (segredo via `JWT_SECRET`), com abstração para RS256 depois |
| Expiração | 60 min; refresh = Could |
| Papéis | `ATENDENTE`, `MECANICO`, `GERENTE` (claim `roles`); usuário seed `GERENTE` |
| Hash | bcrypt (custo 10–12) ou argon2id |
| Rotas públicas | `/auth/login`, `/health`, Swagger (dev), `/acompanhamento/**` (ADR-011) |
| Erros | 401 sem token/inválido/expirado; 403 papel insuficiente; corpo padronizado (`docs/04-arquitetura/contrato-api.md`) |

## Recomendação (não vinculante)

**Opção A.** É o que o enunciado pede literalmente, cabe no prazo, é 100 % local e fica com a fronteira certa para a
Fase 3. Keycloak pode ser mencionado no vídeo como evolução.

## Decisão

> Preencher após a enquete E-08.

## Consequências

- Módulo `identidade` com casos de uso `AutenticarUsuario` e `ValidarToken`; usuários seed por env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- Testes de integração: 401/403/200; teste unitário do emissor/validador; segredo de teste distinto do `.env.example`.

## Enquete (texto para o Discord)

> **Enquete E-08 — ADR-004 Autenticação** (prazo 48 h)
> 🔑 JWT próprio (recomendada) · 🛡️ Keycloak no compose · ☁️ Provedor externo (Cognito/Auth0)
