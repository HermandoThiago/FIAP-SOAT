# PRD-005 — Segurança: autenticação JWT, papéis e validação de dados sensíveis (contexto `identity`)

| Campo | Valor |
|---|---|
| Status | Planejamento (ver *Situação da implementação*) |
| Dono | F4 (Qualidade & Segurança) |
| Origem no enunciado | "Implementação de autenticação JWT para APIs administrativas"; "Validação dos dados sensíveis (CPF/CNPJ, placa de veículo)"; vídeo: "A autenticação das APIs administrativas"; disciplina *Desenvolvimento Seguro* (OWASP Top 10) |
| Contexto DDD | `identity` (generic subdomain) |

## Situação da implementação

> Planejamento original; onde o código difere, vale o código ([contrato](../04-arquitetura/contrato-api.md), [divergências das ADRs](../02-adr/README.md#leitura-das-divergências)). Nomes de status, papéis e rotas no texto abaixo são os do planejamento.

| Requisito | Situação |
|---|---|
| RN-060 bcrypt | **Argon2id** (ADR-015) |
| RF-060 expiração de 60 min | 15 min por padrão (`JWT_ACCESS_EXPIRES_IN`) |
| RF-063 papéis `ATTENDANT`/`MECHANIC`/`MANAGER`/`CUSTOMER` | `Admin`, `Atendente`, `Mecanico`, `Cliente`; claim `role`; sem `MANAGER` |
| RF-061 rota `/parts` | `/itens` |
| RF-065 refresh e logout | **implementados**: rotação, revogação da família no reuso; refresh e logout exigem access token |
| RF-067 `/health`, `/ready` | **não existem**; Swagger em `/docs` e `/docs-json`, sempre expostos |
| RN-063 erros 422 de validação | validação de entrada → 400; regras de negócio → 422 |
| RN-067 CORS restritivo | **CORS aberto** (`origin: '*'`); `helmet` ativo |
| RN-068 SCA e Trivy no CI | `pnpm audit`, hadolint e gitleaks; Trivy não executado |
| RN-069 rate limit de login, RN-070 logs de segurança | **não implementados** |
| `POST /auth/register` | protegido (Admin/Atendente); não é cadastro público |

## 1. Objetivo

Garantir que só funcionários autenticados operem as APIs administrativas, com **JWT**, e que dados sensíveis sejam
validados e protegidos (entrada, armazenamento, logs, respostas).

## 2. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-060 | `POST /auth/login` com e-mail + senha → `accessToken` (JWT) com expiração curta (ex.: 60 min) | Must |
| RF-061 | Todas as rotas administrativas (`/customers`, `/vehicles`, `/services`, `/parts`, `/service-orders`, `/metrics`, `/users`) exigem `Authorization: Bearer <jwt>` | Must |
| RF-062 | Usuário administrativo seed criado na subida do ambiente (credenciais via variáveis de ambiente, documentadas no README) | Must |
| RF-063 | Papéis `ATTENDANT`, `MECHANIC`, `MANAGER` (equipe) e `CUSTOMER` (cliente) como claim `roles`; autorização por rota conforme PRDs (ADR-004) | Should (fallback: papel único `ADMIN` + `CUSTOMER`) |
| RF-064 | CRUD de usuários (`/users`): equipe restrito a `MANAGER`; usuário `CUSTOMER` (com `customerId`) criável por `ATTENDANT`/`MANAGER` (ADR-011) | Should |
| RF-065 | Refresh token / logout (revogação) | Could |
| RF-066 | Rotas do cliente (`/tracking/**`) aceitam o token de acompanhamento (`aud=tracking`, uma OS) **ou** o JWT de login com papel `CUSTOMER`; JWT de equipe é rejeitado (ADR-011) | Must |
| RF-067 | Rotas públicas: `POST /auth/login`, `GET /health`, `GET /ready`, Swagger (em dev) | Must |
| RF-068 | Login de cliente: usuário com papel `CUSTOMER` vinculado a um `customerId`, pelo mesmo `POST /auth/login`; lista/consulta/aprova as próprias OS em `/tracking/**`; recuperação de senha e cadastro autônomo fora do MVP (ADR-011) | Should |

## 3. Regras e controles de segurança

| ID | Regra / controle | OWASP Top 10 |
|---|---|---|
| RN-060 | Senhas com **bcrypt** (custo 12 — ADR-004); nunca em texto claro ou em logs | A02 Cryptographic Failures |
| RN-061 | JWT assinado **HS256** com segredo ≥ 256 bits via env (ADR-004, Aceita); claims `sub`, `roles`, `iat`, `exp`, `iss`, `aud` (+ `customerId` para `CUSTOMER`); validar assinatura, expiração, issuer e audiência (`api` × `tracking`) | A07 Identification & Auth Failures |
| RN-062 | Segredos só por variáveis de ambiente / `.env` **fora** do Git (`.env.example` versionado) | A05 Security Misconfiguration |
| RN-063 | Validação de entrada em **toda** API: CPF/CNPJ (dígitos verificadores), placa (padrões), e-mail, quantidades/valores (≥ 0), tamanhos máximos; erros 422 padronizados | A03 Injection (defesa em profundidade) |
| RN-064 | Acesso a dados via ORM/consultas parametrizadas; nunca concatenar SQL | A03 Injection |
| RN-065 | Autorização verificada no servidor por rota e por **propriedade** (cliente só acessa a própria OS: token daquela OS ou `customerId` igual; senão 404) | A01 Broken Access Control |
| RN-066 | PII mascarada em logs; respostas ao cliente mascaram documento; ids não sequenciais expostos (ADR-009) | A01 / A02 |
| RN-067 | Cabeçalhos de segurança básicos; CORS restritivo; sem stack trace em respostas de erro em produção | A05 |
| RN-068 | Dependências auditadas (SCA) e imagem escaneada (Trivy) no CI; sem vulnerabilidades críticas/altas conhecidas na entrega | A06 Vulnerable Components |
| RN-069 | Login com proteção básica contra força bruta (rate limit ou atraso progressivo) | A07 (Should) |
| RN-070 | Logs de eventos de segurança (login ok/falha, aprovação de orçamento) sem dados sensíveis | A09 Logging Failures (Should) |

## 4. Critérios de aceite

```gherkin
Funcionalidade: Autenticação administrativa
  Cenário: Login válido
    Quando envio e-mail e senha corretos para /auth/login
    Então recebo 200 com accessToken JWT contendo roles e exp

  Cenário: Login inválido
    Quando envio senha incorreta
    Então recebo 401 sem indicar se o e-mail existe

  Cenário: Rota protegida sem token
    Quando chamo GET /customers sem Authorization
    Então recebo 401

  Cenário: Token expirado
    Dado um token com exp no passado
    Quando chamo GET /customers
    Então recebo 401

  Cenário: Papel insuficiente
    Dado que estou autenticado como ATTENDANT
    Quando chamo DELETE /parts/{id}
    Então recebo 403

Funcionalidade: Validação de dados sensíveis
  Cenário: CPF com dígito inválido
    Quando cadastro cliente com CPF "52998224726"
    Então recebo 422 com o campo "document" apontado

  Cenário: Placa fora do padrão
    Quando cadastro veículo com placa "ABCD123"
    Então recebo 422 com o campo "licensePlate" apontado
```

## 5. API (resumo)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | `{email, password}` → `{accessToken, expiresIn, tokenType}` |
| POST | `/auth/refresh` | portador de refresh | (Could) |
| GET/POST/PUT/DELETE | `/users` | MANAGER (POST de usuário `CUSTOMER`: ATTENDANT+) | (Should) |
| GET | `/health` | público | liveness/readiness |

## 6. Modelo

**User**: `id`, `name`, `email` (único), `passwordHash`, `roles[]`, `customerId` (obrigatório se, e só se, `CUSTOMER`), `active`, timestamps.

## 7. Questões abertas

| # | Questão | Enquete |
|---|---|---|
| Q1 | JWT próprio vs. Keycloak vs. provedor | ✅ E-08 / ADR-004 — JWT próprio (HS256, bcrypt) |
| Q2 | 3 papéis ou papel único | Revisão deste PRD (proposta: 3 papéis, custo baixo, valoriza o vídeo) |
| Q3 | Credencial do cliente | ✅ E-15 / ADR-011 — token de acompanhamento + login `CUSTOMER` |

## 8. Evidências

Bloco do vídeo "autenticação das APIs administrativas" (401 sem token → login → 200 com token → 403 por papel);
testes de integração de auth; checklist OWASP preenchido em `docs/05-qualidade-e-seguranca/seguranca.md`; relatório de scan.
