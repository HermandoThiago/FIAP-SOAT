# PRD-005 — Segurança: autenticação JWT, papéis e validação de dados sensíveis (contexto `identidade`)

| Campo | Valor |
|---|---|
| Status | 📝 Rascunho para revisão |
| Dono | F4 (Qualidade & Segurança) |
| Origem no enunciado | "Implementação de autenticação JWT para APIs administrativas"; "Validação dos dados sensíveis (CPF/CNPJ, placa de veículo)"; vídeo: "A autenticação das APIs administrativas"; disciplina *Desenvolvimento Seguro* (OWASP Top 10) |
| Contexto DDD | `identidade` (generic subdomain) |

## 1. Objetivo

Garantir que só funcionários autenticados operem as APIs administrativas, com **JWT**, e que dados sensíveis sejam
validados e protegidos (entrada, armazenamento, logs, respostas).

## 2. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-060 | `POST /auth/login` com e-mail + senha → `accessToken` (JWT) com expiração curta (ex.: 60 min) | Must |
| RF-061 | Todas as rotas administrativas (`/clientes`, `/veiculos`, `/servicos`, `/pecas`, `/ordens-servico`, `/metricas`, `/usuarios`) exigem `Authorization: Bearer <jwt>` | Must |
| RF-062 | Usuário administrativo seed criado na subida do ambiente (credenciais via variáveis de ambiente, documentadas no README) | Must |
| RF-063 | Papéis `ATENDENTE`, `MECANICO`, `GERENTE` como claim `roles`; autorização por rota conforme PRDs | Should (fallback: papel único `ADMIN`) |
| RF-064 | CRUD de usuários administrativos (`/usuarios`) restrito a GERENTE | Should |
| RF-065 | Refresh token / logout (revogação) | Could |
| RF-066 | Rotas do cliente (`/acompanhamento/**`) protegidas pelo mecanismo da ADR-011, **não** por JWT administrativo | Must |
| RF-067 | Rotas públicas: `POST /auth/login`, `GET /health`, Swagger (em dev) | Must |

## 3. Regras e controles de segurança

| ID | Regra / controle | OWASP Top 10 |
|---|---|---|
| RN-060 | Senhas com **bcrypt/argon2** (custo adequado); nunca em texto claro ou em logs | A02 Cryptographic Failures |
| RN-061 | JWT assinado (HS256 com segredo ≥ 256 bits via env, ou RS256 — ADR-004); claims `sub`, `roles`, `iat`, `exp`, `iss`; validar assinatura, expiração e issuer | A07 Identification & Auth Failures |
| RN-062 | Segredos só por variáveis de ambiente / `.env` **fora** do Git (`.env.example` versionado) | A05 Security Misconfiguration |
| RN-063 | Validação de entrada em **toda** API: CPF/CNPJ (dígitos verificadores), placa (padrões), e-mail, quantidades/valores (≥ 0), tamanhos máximos; erros 422 padronizados | A03 Injection (defesa em profundidade) |
| RN-064 | Acesso a dados via ORM/consultas parametrizadas; nunca concatenar SQL | A03 Injection |
| RN-065 | Autorização verificada no servidor por rota e por **propriedade** (cliente só acessa a própria OS) | A01 Broken Access Control |
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
    Quando chamo GET /clientes sem Authorization
    Então recebo 401

  Cenário: Token expirado
    Dado um token com exp no passado
    Quando chamo GET /clientes
    Então recebo 401

  Cenário: Papel insuficiente
    Dado que estou autenticado como ATENDENTE
    Quando chamo DELETE /pecas/{id}
    Então recebo 403

Funcionalidade: Validação de dados sensíveis
  Cenário: CPF com dígito inválido
    Quando cadastro cliente com CPF "52998224726"
    Então recebo 422 com o campo "documento" apontado

  Cenário: Placa fora do padrão
    Quando cadastro veículo com placa "ABCD123"
    Então recebo 422 com o campo "placa" apontado
```

## 5. API (resumo)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | `{email, senha}` → `{accessToken, expiresIn, tokenType}` |
| POST | `/auth/refresh` | portador de refresh | (Could) |
| GET/POST/PUT/DELETE | `/usuarios` | GERENTE | (Should) |
| GET | `/health` | público | liveness/readiness |

## 6. Modelo

**Usuario**: `id`, `nome`, `email` (único), `senhaHash`, `papeis[]`, `ativo`, timestamps.

## 7. Questões abertas

| # | Questão | Enquete |
|---|---|---|
| Q1 | JWT próprio vs. Keycloak vs. provedor | E-08 / ADR-004 |
| Q2 | 3 papéis ou papel único | Revisão deste PRD (proposta: 3 papéis, custo baixo, valoriza o vídeo) |
| Q3 | Credencial do cliente | E-15 / ADR-011 |

## 8. Evidências

Bloco do vídeo "autenticação das APIs administrativas" (401 sem token → login → 200 com token → 403 por papel);
testes de integração de auth; checklist OWASP preenchido em `docs/05-qualidade-e-seguranca/seguranca.md`; relatório de scan.
