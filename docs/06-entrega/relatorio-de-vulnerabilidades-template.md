# Relatório de análise de vulnerabilidades — `<nome do sistema>`

| Campo | Valor |
|---|---|
| Versão analisada | commit `<sha>` / tag `<v0.x>` |
| Data do scan inicial | `<DD/MM/AAAA>` |
| Data do scan final | `<DD/MM/AAAA>` |
| Responsáveis | `<F4 — nomes>` |

## 1. Objetivo e escopo

Identificar vulnerabilidades no código-fonte, nas dependências, na imagem Docker, no histórico Git e na API em execução
do `<sistema>`, corrigir os achados relevantes e registrar os riscos aceitos, conforme a disciplina de Desenvolvimento
Seguro (OWASP Top 10) e o entregável do Tech Challenge.

Fora do escopo: infraestrutura de nuvem (não há nesta fase), front-end (inexistente).

## 2. Metodologia e ferramentas

| Camada | Ferramenta | Versão | Configuração |
|---|---|---|---|
| SAST | Semgrep | `<x.y>` | `p/owasp-top-ten`, `p/typescript`, `p/nodejs`, `p/secrets` |
| SCA | `npm audit` + Trivy fs | `<x.y>` | `package-lock.json` |
| Imagem | Trivy image + hadolint | `<x.y>` | `HIGH,CRITICAL` |
| Segredos | gitleaks | `<x.y>` | histórico completo |
| DAST | OWASP ZAP baseline + API scan | `<x.y>` | alvo `http://localhost:8080/api/v1`, `/docs/openapi.json` |
| IaC | Trivy config | `<x.y>` | `Dockerfile`, `docker-compose.yml` |

Execução: local (scripts em `scripts/security/`) e no CI (`.github/workflows/security.yml`). Relatórios brutos em
`docs/06-entrega/evidencias/scan-1/` e `scan-2/`.

## 3. Resumo executivo

| Severidade | Scan inicial | Corrigidas | Aceitas (justificadas) | Scan final |
|---|---|---|---|---|
| Crítica | `<n>` | `<n>` | 0 | 0 |
| Alta | `<n>` | `<n>` | 0 | 0 |
| Média | `<n>` | `<n>` | `<n>` | `<n>` |
| Baixa / informativa | `<n>` | `<n>` | `<n>` | `<n>` |

Conclusão em uma frase: `<ex.: "Não restam vulnerabilidades críticas ou altas; 2 médias aceitas com justificativa.">`

## 4. Achados

| ID | Ferramenta | Severidade | CWE / CVE | Local | Descrição | Correção aplicada | Status |
|---|---|---|---|---|---|---|---|
| V-001 | Trivy image | Alta | CVE-xxxx-xxxx | imagem base `<…>` | `<lib>` vulnerável | Atualizada base para `<tag>` | Corrigida |
| V-002 | ZAP | Média | CWE-693 | todas as rotas | Header `X-Content-Type-Options` ausente | Middleware de security headers | Corrigida |
| V-003 | Semgrep | Média | CWE-… | `src/…` | `<descrição>` | `<correção>` | Corrigida |
| V-004 | ZAP | Baixa | — | `/swagger` | Swagger acessível sem autenticação | Restrito a `APP_ENV=dev`; em produção desabilitado | Risco aceito (ambiente de avaliação) |
| … | | | | | | | |

## 5. Riscos aceitos

| ID | Justificativa | Mitigação parcial | Revisão prevista |
|---|---|---|---|
| V-004 | Swagger é requisito do Tech Challenge para avaliação | Só em `dev`; sem dados reais | Fase 2 (API Gateway) |

## 6. Controles de segurança implementados (referência OWASP Top 10)

Resumo do checklist `docs/05-qualidade-e-seguranca/seguranca.md` com status final por item (A01–A10).

## 7. Anexos

- `evidencias/scan-1/` — relatórios brutos iniciais (SARIF/HTML/JSON)
- `evidencias/scan-2/` — relatórios brutos finais
- Prints do CI (`security.yml`) verde
