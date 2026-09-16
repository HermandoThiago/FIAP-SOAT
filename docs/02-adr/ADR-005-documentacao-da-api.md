# ADR-005 — Documentação da API: OpenAPI code-first × design-first

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 2) |
| Tipo | Tipo 2 (enquete opcional — abrimos porque afeta como o time paraleliza) |
| Decisores | Grupo — enquete **E-09** |
| Data | 2026-09-14 |
| Relacionadas | ADR-001, `docs/04-arquitetura/contrato-api.md` |

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

> Preencher após a enquete E-09.

## Consequências

- Convenções obrigatórias no Swagger: título, versão, descrição por endpoint, exemplos de request/response, esquema de
  segurança `bearerAuth`, códigos de erro documentados (400/401/403/404/409/422).
- Rota do Swagger no README e no vídeo.

## Enquete (texto para o Discord)

> **Enquete E-09 — ADR-005 OpenAPI** (prazo 48 h)
> 🧩 Code-first · 📄 Design-first · 🔀 Híbrido (recomendada)
