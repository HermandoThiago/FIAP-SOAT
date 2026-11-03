# Relatório de análise de vulnerabilidades — SGO (Oficina Mecânica)

| Campo | Valor |
|---|---|
| Versão analisada | base `6f62d13` (branch `developer`) com alterações locais não commitadas; repetir no hash final |
| Data da análise | 02/11/2026 (execução inicial) e 03/11/2026 (repetição após as correções de V-003 e V-004, e execução do ZAP) |
| Responsáveis | a confirmar pelo grupo (F4) |

## 1. Escopo

Código-fonte (`src/`), dependências (`pnpm-lock.yaml`), `Dockerfile` e `docker-compose.yaml`, histórico Git, árvore de trabalho e imagem Docker de produção. **Fora do escopo:** infraestrutura de nuvem e front-end (inexistentes na fase). A análise dinâmica (OWASP ZAP) foi executada em 03/11/2026 contra a API no ar, com os limites descritos na seção 3.1.

O resultado descreve o que as ferramentas encontraram nesta data e com estas versões. Não prova ausência de vulnerabilidades.

## 2. Ferramentas

| Camada | Ferramenta | Versão | Configuração |
|---|---|---|---|
| SAST | Semgrep | 1.182.1 | `p/owasp-top-ten`, `p/typescript`, `p/nodejs`, `p/secrets`; métricas desligadas; `src/` sem o client gerado do Prisma |
| SCA | `pnpm audit` | pnpm 10.15.1 | `--prod` (gate do CI) e auditoria completa |
| SCA, config e segredos | Trivy fs | 0.76.1 | `pnpm-lock.yaml`, `Dockerfile`, `docker-compose.yaml`, `src/`, `prisma/` |
| Imagem | Trivy image | 0.76.1 | `docker build --target runtime`; `vuln,secret` |
| Dockerfile | hadolint | 2.15.1 | regras padrão (o CI falha só em `error`) |
| Segredos | gitleaks | 8.30.1 | histórico completo (`git`) e árvore de trabalho (`dir`), com `--redact` |
| DAST | OWASP ZAP | 2.17.0 (imagem `ghcr.io/zaproxy/zaproxy:stable`) | `zap-api-scan.py` com o OpenAPI gerado pelo código (51 operações), autenticado como Admin, API do `docker compose` |

Saídas em `evidencias/scan/`. A auditoria de dependências roda também no CI (`ci.yml`), assim como hadolint e gitleaks.

## 3. Resumo

| Verificação | Resultado |
|---|---|
| Semgrep (113 regras, 105 arquivos) | 0 achados |
| gitleaks, histórico (128 commits) | 0 vazamentos |
| gitleaks, árvore de trabalho (2,4 MB) | 0 vazamentos |
| Trivy fs, segredos e configuração do Dockerfile | 0 achados |
| `pnpm audit --prod` | 0 (antes: 4, todas `fast-uri`) |
| `pnpm audit` completo | 30 (8 altas, 16 moderadas, 6 baixas); as 8 altas são de desenvolvimento (antes: 34) |
| Trivy fs, dependências | 0 (antes: 4, as mesmas de `fast-uri`) |
| Trivy image, Debian 12.15 | 1 crítica, 32 altas, 98 médias, 83 baixas, 2 desconhecidas; sem versão corrigida (base reconstruída com `--pull`, sem mudança) |
| Trivy image, pacotes Node | 0 (antes: 10 altas, 14 médias, 3 baixas, todas do `npm` da imagem base) |
| hadolint | 1 warning (DL3025) e 1 info (DL3066) |
| OWASP ZAP (API, autenticado) | 48 URLs importadas, 132 examinadas, 120 regras aprovadas, 0 alertas de risco; 2 informativos |

### 3.1 OWASP ZAP: escopo e limites

Varredura de API (`zap-api-scan.py`) contra a aplicação no `docker compose`, a partir do OpenAPI gerado pelo código (34 caminhos e 51 operações; 48 URLs importadas e 132 examinadas), com o JWT do usuário Admin do seed. Resultado: 120 regras aprovadas e nenhum alerta de risco. Os dois informativos são respostas 4xx esperadas durante o teste (154 instâncias) e conteúdo não armazenável em cache (5).

Limites: a varredura durou cerca de 75 segundos; as rotas `/tracking` exigem o token de acompanhamento e responderam 4xx ao token de Admin; não houve teste de lógica de negócio nem de autorização entre usuários; o Swagger e o CORS abertos são riscos conhecidos (seção 5) que o ZAP não classifica como alerta. Uma primeira tentativa, importando o OpenAPI pela URL, leu apenas 2 URLs e foi descartada. Saídas em `evidencias/scan/zap/`.

## 4. Achados que exigem decisão

| ID | Origem | Severidade | Local | Descrição | Situação |
|---|---|---|---|---|---|
| V-001 | Trivy image | Crítica | `zlib1g` 1.2.13 (CVE-2023-45853) | Pacote da imagem base; o Debian marca `will_not_fix` | Aberto; risco aceito proposto (sem correção disponível em 03/11/2026) |
| V-002 | Trivy image | Alta (32) | pacotes Debian: `util-linux`, `libsystemd0`, `libacl1`, `ncurses`, `perl-base`, `gzip` e outros | Sem versão corrigida disponível na base `node:22-bookworm-slim` | Aberto; base reconstruída com `docker build --pull` em 03/11/2026 continua em Debian 12.15 e sem correções; repetir o scan no commit final |
| V-003 | Trivy image | Alta (10) | `npm` embutido em `/usr/local/lib/node_modules/npm` (`brace-expansion`, `ip-address`, `pacote`, `picomatch`, `sigstore`) | Com correção disponível, mas no `npm` da imagem base, que não executa em produção (`CMD node dist/main`) | **Corrigido em 03/11/2026:** `npm`, `npx` e `corepack` removidos do estágio `runtime`; Trivy: 0 achados em pacotes Node; API e fluxo completo validados com a imagem nova |
| V-004 | `pnpm audit`, Trivy fs | Média e baixa (4) | `fast-uri` 3.1.8, via `prisma` → `@prisma/dev` → `ajv` | Corrigido na 3.1.9 | **Corrigido em 03/11/2026:** `pnpm.overrides` com `fast-uri` `^3.1.9` em `package.json`; `pnpm audit --prod` e Trivy fs sem achados |
| V-005 | `pnpm audit` completo | Alta (8) | `undici` e `tmp`, via `@nestjs/mau` (devDependency) | Fora da imagem de produção | Aceito: só desenvolvimento |
| V-006 | hadolint | Aviso e info | `Dockerfile` linhas 49 e 52 | `USER node` não numérico; `HEALTHCHECK CMD` em forma shell | Aceito; não bloqueia o CI |

V-003 e V-004 foram corrigidos e os scans repetidos; os resultados anteriores estão em `evidencias/scan/antes/`. V-001 e V-002 dependem do Debian publicar correções; repetir o scan no commit final e, se continuarem sem correção, manter como risco aceito.

## 5. Riscos conhecidos fora das ferramentas

Listados em [segurança](../05-qualidade-e-seguranca/seguranca.md): CORS aberto, Swagger sempre exposto, ausência de rate limit no login, access token válido até expirar após logout e notificação apenas simulada.

## 6. Anexos

`evidencias/scan/`: `semgrep.json`, `gitleaks-historico.json`, `gitleaks-arvore.json`, `hadolint.json`, `pnpm-audit-prod.txt`, `pnpm-audit-all.txt`, `trivy-fs.json`, `zap/` (relatório HTML, JSON, Markdown e resumo) e `trivy-image-resumo.txt` (o relatório bruto da imagem tem 1,3 MB e não foi versionado), todos de 03/11/2026. Os resultados de 02/11/2026, anteriores às correções, estão em `evidencias/scan/antes/`.
