# Plano da análise de vulnerabilidades

> Executa a ADR-007 e alimenta `docs/06-entrega/relatorio-de-vulnerabilidades-template.md` (entregável obrigatório) e o
> bloco "resultado da análise de vulnerabilidades" do vídeo.

## 1. Escopo

| Alvo | Ferramenta | Camada |
|---|---|---|
| Código-fonte (`src/`) | Semgrep (`p/owasp-top-ten`, `p/typescript`, `p/nodejs`, `p/secrets`) | SAST |
| Dependências (`package-lock.json`) | `npm audit --audit-level=high` + Trivy `fs` (ADR-007) | SCA |
| Imagem Docker (`Dockerfile` → imagem) | Trivy `image` + hadolint | Contêiner |
| Histórico Git | gitleaks | Segredos |
| API em execução (`docker compose up`) | OWASP ZAP baseline scan (+ API scan com `/docs/openapi.json`, ADR-005) | DAST |
| Configuração (`docker-compose.yml`, `Dockerfile`) | Trivy `config` | IaC |

## 2. Execução local (scripts em `scripts/security/`)

```bash
# SAST
docker run --rm -v "$PWD:/src" semgrep/semgrep semgrep scan --config p/owasp-top-ten --config p/typescript --config p/nodejs --config p/secrets --sarif -o reports/semgrep.sarif /src

# SCA — auditoria nativa (ADR-007)
npm audit --audit-level=high

# SCA + IaC + segredos no filesystem
docker run --rm -v "$PWD:/src" aquasec/trivy fs --scanners vuln,misconfig,secret --format table -o reports/trivy-fs.txt /src

# Imagem — <sistema> é o nome escolhido na enquete E-01; padrão `<sistema>-api` (como-trabalhamos.md §4, "Imagem Docker no CI")
docker build -t <sistema>-api:scan .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL <sistema>-api:scan

# Segredos no histórico
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect -s /repo --report-path /repo/reports/gitleaks.json

# DAST (com a API no ar em http://localhost:8080)
docker run --rm --network host -v "$PWD/reports:/zap/wrk" zaproxy/zap-stable zap-baseline.py -t http://localhost:8080/api/v1 -r zap-baseline.html
docker run --rm --network host -v "$PWD/reports:/zap/wrk" zaproxy/zap-stable zap-api-scan.py -t http://localhost:8080/docs/openapi.json -f openapi -r zap-api.html
```

> Comandos já ajustados para a stack (ADR-001/ADR-007). A API precisa subir com `APP_ENV=dev` para o ZAP alcançar o
> `/docs/openapi.json` (fora de dev o Swagger fica desligado — risco aceito e documentado no relatório).

## 3. Execução no CI (`.github/workflows/security.yml`)

| Gatilho | Passos | Bloqueia merge? |
|---|---|---|
| Todo PR | Semgrep · SCA · gitleaks · hadolint · build da imagem + Trivy (HIGH/CRITICAL) | **Sim** para CRITICAL; HIGH gera alerta (bloqueia a partir da semana 6) |
| Push em `develop` ou `master` / manual | Tudo acima + ZAP baseline/API contra o compose (GitFlow, ADR-008) | Não (gera relatório) |

## 4. Cronograma de scans

| Momento | Objetivo | Saída |
|---|---|---|
| **Scan 1 — semana 4** (após walking skeleton) | Baseline: achar problemas cedo | `reports/scan-1/` — anexado como "antes" |
| **Correções — semanas 5–6** | Corrigir críticas/altas; justificar médias/baixas aceitas | issues `security` |
| **Scan 2 — semana 7** (code freeze) | Evidência final | `reports/scan-2/` — anexado como "depois" |

## 5. Classificação e tratamento

| Severidade | Ação | Prazo |
|---|---|---|
| Crítica | Corrigir antes de qualquer merge | imediato |
| Alta | Corrigir antes da entrega | até o scan 2 |
| Média | Corrigir se custo baixo; senão, justificar no relatório (risco aceito) | scan 2 |
| Baixa / informativa | Registrar; corrigir se sobrar tempo | — |
| Falso positivo | Marcar com justificativa (ex.: `# nosemgrep: regra` com comentário) | — |

## 6. Achados esperados (para não ser surpresa) e como evitar

| Achado típico | Prevenção |
|---|---|
| Header `X-Content-Type-Options`/`Content-Security-Policy` ausentes (ZAP) | Middleware de security headers |
| Imagem base com CVEs (Trivy) | Base slim/distroless com tag recente; rebuild antes do scan 2 |
| Dependência transitiva vulnerável (SCA) | Atualizar; se impossível, justificar e limitar exposição |
| Segredo de exemplo no `.env.example` reconhecido como real (gitleaks) | Valores claramente fictícios (`change-me`), allowlist do gitleaks |
| Swagger acessível sem auth (ZAP) | Restringir a `APP_ENV=dev` (e explicar no relatório) |
| Mensagens de erro verbosas | Problem Details sem stack trace |

## 7. Estrutura do relatório final

Ver `docs/06-entrega/relatorio-de-vulnerabilidades-template.md`: escopo, metodologia, ferramentas/versões, resumo por
severidade (antes × depois), tabela de achados (id, ferramenta, severidade, CWE/CVE, local, descrição, correção, status),
riscos aceitos, conclusão, anexos (relatórios brutos em `docs/06-entrega/evidencias/`).
