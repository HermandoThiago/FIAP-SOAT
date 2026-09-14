# ADR-007 — Ferramentas da análise de vulnerabilidades

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 3) |
| Tipo | Tipo 2 (enquete para alinhar; F4 decide detalhes) |
| Decisores | F4 + grupo — enquete **E-13** |
| Data | 2026-09-14 |
| Relacionadas | PRD-005, `docs/05-qualidade-e-seguranca/plano-analise-vulnerabilidades.md`, `docs/06-entrega/relatorio-de-vulnerabilidades-template.md` |

## Contexto e problema

Entregável obrigatório: "Relatório com análise de vulnerabilidades — adicionar no relatório a análise do scan realizado
no código" e o vídeo mostra "o resultado da análise de vulnerabilidades". A disciplina *Desenvolvimento Seguro* cobre
OWASP Top 10, avaliação de vulnerabilidades e ferramentas de risco. Precisamos de um conjunto de ferramentas gratuito,
executável no CI e localmente, que gere evidências (relatórios) para o PDF.

## Critérios de decisão

1. Gratuito e roda em GitHub Actions + local (Docker) — peso 5
2. Cobre camadas diferentes: código (SAST), dependências (SCA), imagem, segredos, aplicação em execução (DAST) — peso 5
3. Gera relatório legível (HTML/SARIF/JSON) para anexar — peso 4
4. Baixo esforço de configuração — peso 4

## Conjunto proposto (mínimo)

| Camada | Ferramenta | Por quê | Saída |
|---|---|---|---|
| **SAST** (código) | **Semgrep** (regras `p/owasp-top-ten`, `p/<linguagem>`) — alternativa: SonarCloud (gratuito p/ repo… privado tem limite) ou CodeQL (privado exige GitHub Advanced Security) | Rápido, sem servidor, SARIF | SARIF/JSON + resumo |
| **SCA** (dependências) | Auditoria nativa (`npm audit` / `pip-audit` / `dotnet list package --vulnerable` / `govulncheck`) **+** **OWASP Dependency-Check** (Java/.NET) ou **Trivy fs** (todas) | Cobre CVEs conhecidas; Dependency-Check é referência OWASP | HTML/JSON |
| **Imagem Docker** | **Trivy image** | Vulnerabilidades do SO base e libs; recomenda base slim/distroless | Tabela/JSON |
| **Segredos** | **gitleaks** | Evita `.env`/tokens no histórico | JSON |
| **DAST** (app rodando) | **OWASP ZAP baseline scan** (`zaproxy/zap-stable` via Docker) contra o `docker compose up` usando o `openapi.json` | Testa headers, auth, injeção básica na API real | HTML |
| **Config Docker/IaC** | Trivy config / hadolint (Dockerfile) | Boas práticas de imagem | texto |

## Opções em votação

- 👍 Aceitar o conjunto mínimo acima (F4 ajusta detalhes por linguagem após ADR-001).
- 🔧 Trocar algo (ex.: SonarCloud no lugar do Semgrep; Snyk no lugar do Dependency-Check) — comentar.

## Recomendação (não vinculante)

Aceitar o conjunto mínimo. Rodar **duas vezes**: um scan inicial (com achados, antes das correções) e um final (após
correções) — o relatório mostra o antes/depois, o que valoriza muito a entrega.

## Decisão

> Preencher após a enquete E-13.

## Consequências

- Workflow `security.yml` no CI (Semgrep + SCA + Trivy + gitleaks em todo PR; ZAP em `master`/manual).
- Relatórios versionados em `docs/06-entrega/evidencias/` (HTML/JSON) e consolidados no template do relatório.
- Política: **0 críticas/altas abertas** na entrega; médias/baixas justificadas no relatório.

## Enquete (texto para o Discord)

> **Enquete E-13 — ADR-007 Scans de vulnerabilidade** (prazo 72 h)
> Conjunto mínimo: Semgrep (SAST) + auditoria de dependências/Dependency-Check (SCA) + Trivy (imagem) + gitleaks (segredos) + OWASP ZAP baseline (DAST)
> 👍 ok · 🔧 quero trocar algo (comente)
