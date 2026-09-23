# ADR-005 — Documentação da API: OpenAPI code-first × design-first

| Campo | Valor |
|---|---|
| Status | ✅ **Aceita** — enquete E-09 encerrada em 22/09/2026 (Opção A, diferente da recomendação) |
| Tipo | Tipo 2 (enquete opcional — abrimos porque afeta como o time paraleliza) |
| Decisores | Grupo — enquete **E-09** |
| Data | 2026-09-14 (proposta) · 2026-09-22 (decisão) |
| Relacionadas | ADR-001, ADR-007 (ZAP usa o OpenAPI gerado), `docs/04-arquitetura/contrato-api.md` |

## Contexto e problema

"APIs RESTful documentadas via Swagger ou similar" é obrigatório e o vídeo mostra o Swagger. Trabalhando assíncronos,
precisamos combinar o **contrato** antes de codar para que testes, docs e implementação avancem em paralelo.

## Opções consideradas

### Opção A — Code-first (anotações/decorators geram o OpenAPI e o Swagger UI)

springdoc-openapi · `@nestjs/swagger` · Swashbuckle · FastAPI (nativo) · swaggo.

- **Prós:** documentação nunca fica desatualizada em relação ao código; zero ferramenta extra; Swagger UI pronto.
- **Contras:** o contrato só "existe" quando o código existe (paralelismo depende do `contrato-api.md`).

### Opção B — Design-first (`openapi.yaml` é a fonte da verdade; CI valida; servidor/clients gerados)

- **Prós:** contrato explícito e revisável em PR antes de codar; ferramentas de lint (Spectral); mocks (Prism) para testes de API cedo.
- **Contras:** geração de código varia por framework; duplicação (yaml + código) se não gerar; curva para quem nunca fez.

### Opção C — Híbrido: contrato humano em `contrato-api.md` (tabelas + exemplos) → implementação code-first → CI publica o `openapi.json` gerado como artefato

- **Prós:** ganha o alinhamento antecipado sem ferramental extra; Swagger sempre correto.
- **Contras:** `contrato-api.md` pode divergir do gerado — revisão de PR precisa checar.

## Recomendação (não vinculante)

**Opção C.** Já temos o `contrato-api.md`; code-first mantém o Swagger fiel; o CI exporta o `openapi.json` versionado em
`docs/04-arquitetura/openapi.json` para diff em PRs.

## Decisão

**Code-first** (Opção A): os decorators do `@nestjs/swagger` nos controllers e DTOs são a **única fonte** da documentação
da API. Swagger UI em `/docs` e documento OpenAPI em `/docs/openapi.json` (ambos só em `APP_ENV=dev`). Não existe
`openapi.yaml` escrito à mão nem validação de contrato no CI.

O que acontece com `docs/04-arquitetura/contrato-api.md`: continua sendo o **acordo antes de codar** (rotas, payloads e
códigos combinados entre F1 e F3 para paralelizar) e a referência citada pelos PRDs. Depois que um endpoint existe, o
Swagger gerado é a versão oficial; divergência é corrigida no código (ou, se a intenção mudou, no contrato) — a revisão de
PR checa "OpenAPI atualizado com exemplos", não "contrato idêntico ao gerado".

`openapi.json`: exportado por script (`scripts/export-openapi.ts`, sem subir o servidor) e publicado como **artefato do
CI** em todo PR — é o insumo do ZAP API scan (ADR-007) e do bloco 12 do vídeo. Não é versionado no repositório.

## Consequências

- Convenções obrigatórias no Swagger: título e versão da API, **tags por módulo**, descrição por endpoint, exemplos de
  request/response, esquema de segurança `bearerAuth`, códigos de erro documentados (400/401/403/404/409/422) com o
  esquema Problem Details.
- PR que muda a API sem atualizar os decorators é `[bloqueia]` na revisão (`prompts/09-revisao-de-pr.md`, item 4).
- Rota do Swagger no README e no vídeo (bloco 12); `/docs/openapi.json` referenciado no `security.yml` (ZAP).

## Enquete (texto para o Discord)

> **Enquete E-09 — ADR-005 OpenAPI** (prazo 48 h)
> 🧩 Code-first · 📄 Design-first · 🔀 Híbrido (recomendada)
