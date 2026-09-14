# 07 — Segurança e análise de vulnerabilidades (F4)

```text
Com base em docs/05-qualidade-e-seguranca/seguranca.md, docs/05-qualidade-e-seguranca/plano-analise-vulnerabilidades.md,
ADR-007 ({{SCANS}}) e docs/06-entrega/relatorio-de-vulnerabilidades-template.md:

1. Revise o código contra o checklist OWASP (A01–A10) e produza uma tabela com status e evidência (arquivo/linha) por
   item; proponha correções concretas para os itens pendentes (security headers, CORS, Problem Details sem stack
   trace, máscara de PII, allowlist de rotas públicas, rate limit no login, Dockerfile não-root, tags fixas).
2. Crie scripts/security/*.sh (ou Makefile) para rodar localmente: Semgrep (OWASP + secrets), auditoria de dependências
   nativa + Dependency-Check/Trivy fs, Trivy image + hadolint, gitleaks e OWASP ZAP baseline/API scan contra o compose;
   saídas em reports/<scan-n>/ (SARIF/HTML/JSON).
3. Crie .github/workflows/security.yml: em todo PR (Semgrep, SCA, gitleaks, hadolint, build + Trivy HIGH/CRITICAL —
   CRITICAL bloqueia) e em main/manual (tudo + ZAP contra a API subida no job com docker compose).
4. Execute o scan 1, consolide os achados no template do relatório (tabela por severidade, CWE/CVE, local, correção
   proposta), corrija críticas/altas com PRs pequenos, e prepare o scan 2 para o "depois". Falsos positivos devem
   ser marcados com justificativa no código/config.

Nunca desabilite uma regra apenas para limpar o relatório; toda exceção precisa de justificativa escrita.
```
