# Segurança — OWASP Top 10 aplicado ao MVP

Legenda: ✅ implementado · ⚠️ parcial ou com limitação conhecida · ⛔ não implementado · n/a não se aplica.

| # | OWASP 2021 | Controle atual | Situação |
|---|---|---|---|
| A01 | Broken Access Control | `RolesGuard` com `@Roles` em cada rota; cliente só acessa a própria OS (OS alheia → 404); token de acompanhamento restrito a uma OS e às rotas `/tracking`; JWT de equipe em `/tracking` → 403. Testes unitários e de integração de 401/403/404 | ✅ |
| A02 | Cryptographic Failures | Senha com **Argon2id** em tabela própria (`UsuarioSenha`); refresh token guardado como hash SHA-256; `JWT_SECRET` com mínimo de 32 caracteres vindo do ambiente; documento e placa **mascarados** nas respostas do acompanhamento. TLS não é terminado pela aplicação | ✅ / ⚠️ TLS fora do escopo |
| A03 | Injection | Prisma parametrizado; DTOs com `class-validator`; SQL cru apenas no bloqueio `FOR UPDATE` do estoque, parametrizado | ✅ |
| A04 | Insecure Design | Transições só por comandos; orçamento derivado; invariantes de estoque no código **e** `CHECK` no banco; reserva/baixa transacionais | ✅ |
| A05 | Security Misconfiguration | `helmet`; contêiner não-root e multi-stage. **Limitações:** CORS aberto (`origin: '*'`), Swagger (`/docs`, `/docs-json`) **sempre exposto**, sem tratamento customizado de erros (padrão do NestJS) | ⚠️ |
| A06 | Vulnerable Components | `pnpm audit --prod --audit-level high` no CI; lockfile versionado. Semgrep e Trivy foram executados em 02/11/2026 e repetidos em 03/11/2026 após corrigir `fast-uri` e remover o `npm` da imagem (ver [relatório](../06-entrega/relatorio-de-vulnerabilidades.md)): restam CVEs do Debian sem correção na imagem base | ⚠️ |
| A07 | Identification & Auth Failures | Access token HS256 de 15 min; refresh opaco com rotação e revogação da família no reuso; token de acompanhamento de 7 dias com `aud` própria; logout revoga o refresh. **Sem rate limit/bloqueio de login**; o access token já emitido continua válido após logout ou inativação até expirar | ⚠️ |
| A08 | Integrity Failures | CI em PR e push (typecheck, lint, build, testes, integração, imagem); `--frozen-lockfile` | ✅ |
| A09 | Logging & Monitoring | Histórico de status com autor e movimentações de estoque com autor. **Sem** logs estruturados, `requestId` ou trilha de login | ⚠️ |
| A10 | SSRF | Sem chamadas a URLs fornecidas pelo usuário | n/a |

## Controles específicos do enunciado

| Requisito | Implementação | Evidência |
|---|---|---|
| JWT nas APIs administrativas | Guard global; rotas públicas explícitas (login e documentação); `/tracking` aceita token de acompanhamento ou login Cliente | `test/integration/auth.int-spec.ts`, `test/unit/swagger.spec.ts`, `test/unit/tracking-auth.spec.ts` |
| Validação de CPF/CNPJ | `isValidCpf`/`isValidCnpj` + decorator nos DTOs | `test/unit/document.validator.spec.ts` |
| Validação de placa | `license-plate.validator` (antiga e Mercosul) | `test/unit/license-plate.validator.spec.ts` |
| Dados sensíveis nas respostas | `maskDocument` e `maskLicensePlate` em `tracking-view.ts` | `test/unit/tracking-view.spec.ts` |

## Segredos e configuração

- `.env.example` só com valores fictícios; `.env` ignorado pelo Git; gitleaks no CI.
- Repositório **público** na entrega: nenhum segredo, token ou dado pessoal em arquivo ou histórico. Conferir antes de tornar público.
- O seed usa `SEED_PASSWORD` do ambiente; documentar no README o valor de demonstração.
- Em produção o token de acompanhamento não volta na resposta do envio do orçamento, e não há entrega real por e-mail.

## Dockerfile

| Item | Situação |
|---|---|
| Multi-stage | ✅ |
| `USER` não-root | ✅ |
| `HEALTHCHECK` | ✅, requisitando `/docs`; **não existe** `/health` |
| Sem segredos no Dockerfile | conferir na revisão |
| hadolint no CI | ✅ |
| Tag base fixa | `node:22-bookworm-slim` (versão major fixa, sem digest) |
| `trivy image` | executado em 02/11/2026: 1 crítica e 32 altas no Debian base (sem correção), 10 altas no `npm` embutido; ver relatório |

## Pendências para a entrega

Decidir e registrar se CORS, Swagger público e ausência de rate limit são riscos aceitos ou serão corrigidos; decidir sobre os achados abertos de `relatorio-de-vulnerabilidades.md`. O ZAP foi executado em 03/11/2026 (sem alertas de risco; limites na seção 3.1 do relatório).
