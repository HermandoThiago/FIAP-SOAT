# Segurança — checklist de codificação segura (OWASP Top 10 aplicado ao MVP)

> Preencher a coluna *Status* durante o desenvolvimento; vira seção do relatório de vulnerabilidades e roteiro do bloco
> "autenticação/segurança" do vídeo.

| # | OWASP 2021 | Risco no nosso sistema | Controle | Onde | Status |
|---|---|---|---|---|---|
| A01 | Broken Access Control | Cliente acessar OS de outro; atendente apagar peça | Autorização por papel em cada rota **e** verificação de propriedade (token de acompanhamento amarrado ao `osId`); 404 em vez de 403 para recursos alheios | filtro JWT + casos de uso | ☐ |
| A02 | Cryptographic Failures | Senhas em texto claro; segredo JWT fraco; PII em logs | bcrypt/argon2; `JWT_SECRET` ≥ 32 bytes por env; HTTPS assumido no gateway (fases futuras); máscara de CPF/CNPJ/placa em logs | `identidade`, `shared/infra` | ☐ |
| A03 | Injection | SQL via ORM; parâmetros de busca | Consultas parametrizadas; validação de tipos/tamanhos nos DTOs; sem concatenação de SQL; sem `eval` | adapters | ☐ |
| A04 | Insecure Design | Transições de status por `PATCH`; orçamento editável; estoque negativo | Comandos de negócio explícitos; orçamento derivado; invariantes no domínio + constraints no banco | domínio | ☐ |
| A05 | Security Misconfiguration | Swagger aberto em prod; stack trace em erro; CORS `*`; contêiner root | Swagger só em `APP_ENV=dev`; Problem Details sem detalhes internos; CORS restritivo; Dockerfile com usuário não-root, imagem slim; `.env` fora do Git | infra, Dockerfile | ☐ |
| A06 | Vulnerable & Outdated Components | CVEs em dependências/imagem base | SCA + Trivy no CI; atualizar antes da entrega; 0 críticas/altas | CI `security.yml` | ☐ |
| A07 | Identification & Auth Failures | Força bruta no login; tokens eternos | JWT com `exp` 60 min; mensagem genérica no 401; rate limit/atraso no login (Should); senha mínima 8 | `identidade` | ☐ |
| A08 | Software & Data Integrity | Dependências não verificadas; pipeline sem checagens | Lockfiles versionados; CI obrigatório para merge; imagens com tag fixa | CI | ☐ |
| A09 | Logging & Monitoring Failures | Sem rastro de quem aprovou/alterou | Histórico de status com autor; logs estruturados com `requestId`; eventos de login | `atendimento`, infra | ☐ |
| A10 | SSRF | Não aplicável (sem chamadas a URLs externas fornecidas pelo usuário) | — | — | n/a |

## Controles específicos do enunciado

| Requisito | Implementação | Teste |
|---|---|---|
| JWT nas APIs administrativas | Filtro global; rotas públicas em allowlist explícita | 401 sem token; 401 expirado; 403 papel |
| Validação de CPF/CNPJ | VO `Documento` com dígitos verificadores; 422 padronizado | unit (válidos/inválidos) + integração |
| Validação de placa | VO `Placa` (antiga/Mercosul); normalização | unit + integração |
| Dados sensíveis em trânsito/log | Máscara central; respostas ao cliente mascaradas | unit da máscara; integração do acompanhamento |

## Segredos e configuração

- `.env.example` com **todas** as chaves e valores de exemplo; `.env` no `.gitignore`; gitleaks no CI.
- Segredos de teste diferentes dos de dev; nada real em nenhum ambiente do Tech Challenge.
- Usuário seed com senha vinda de env (`ADMIN_PASSWORD`), documentada no README para o avaliador.

## Dockerfile seguro (checklist)

- [ ] Multi-stage (build → runtime slim/distroless)
- [ ] `USER` não-root
- [ ] Sem segredos em `ARG`/`ENV` no Dockerfile
- [ ] Tag de imagem base fixa (não `latest`)
- [ ] `HEALTHCHECK` ou probe via `/health`
- [ ] `hadolint` sem erros; `trivy image` sem críticas/altas
