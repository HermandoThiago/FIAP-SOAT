# Tech Challenge — Fase 1 · FIAP Pós Tech Software Architecture (SOAT)

**Sistema de Gestão da Oficina (SGO)** — nome provisório (ver enquete E-01 em `docs/00-guia-do-grupo/enquetes.md`).

Back-end **monolítico (MVP)** para uma oficina mecânica de médio porte: ordens de serviço (OS), clientes, veículos,
serviços, peças/insumos com estoque, orçamento com aprovação do cliente e acompanhamento de status — aplicando
**Domain-Driven Design**, **qualidade de software** (testes ≥ 80% nos domínios críticos) e **desenvolvimento seguro**
(JWT nas APIs administrativas, validação de dados sensíveis, análise de vulnerabilidades).

> **Status atual:** planejamento (documentação primeiro, código depois — decisão do grupo).
> As decisões de arquitetura estão **em votação**: veja `docs/02-adr/README.md`.
> A Fase 1 exige monólito; as fases seguintes do curso (Kubernetes/EKS, API Gateway, serverless, microsserviços com SAGA)
> vão **refatorar este mesmo projeto**, então as decisões daqui já consideram essa evolução (`docs/04-arquitetura/evolucao-fases.md`).

## Grupo

| Integrante | RM | Discord | Frente (sugestão — confirmar na E-02; ver `docs/00-guia-do-grupo/frentes-e-responsabilidades.md`) |
|---|---|---|---|
| Vi (Victor H. C. Reis Santos) | RM377398 | `preencher` | **F1** Tech Lead & Arquiteta — coordenação, ADRs, esqueleto, CI, revisão; apoio em segurança (F4) |
| Shirley Balbino | `preencher` | `preencher` | **F2** Product & DDD Lead — PRDs, event storming/Miro, BDD (Gherkin), checklist, roteiro do vídeo, PDF |
| Diego Marques | RM369305 | `preencher` | **F3** Domínio & API — core `atendimento`; co-revisão de arquitetura (F1) |
| Daniel Henrique (Dan) | RM377497 | `preencher` | **F3** módulos `cadastro` e `catalogo-estoque` + **F5** Infra (Docker, compose, CI, README, Swagger) |
| Hermando Thiago | RM378259 | `preencher` | **F4** Qualidade — testes, cobertura, BDD automatizado, scans e relatório; métrica de tempo médio |

Nome do grupo: **a definir (enquete E-01)**. Acesso obrigatório ao usuário GitHub `soat-architecture` (repositório privado).

## Mapa da documentação

| Pasta | O que tem | Quando usar |
|---|---|---|
| `docs/00-guia-do-grupo/` | Como trabalhamos (assíncrono), frentes e responsabilidades, cronograma, **enquetes prontas para o Discord** | Todo dia |
| `docs/01-requisitos/` | PRDs (requisitos de produto por módulo, com regras de negócio e critérios de aceite) | Antes de codar uma feature |
| `docs/02-adr/` | ADRs — decisões de arquitetura **com opções para votação** | Semana 1–2 (votações) |
| `docs/03-ddd/` | Linguagem ubíqua, domain storytelling, event storming, contextos delimitados, agregados | Documentação DDD (Miro) e vídeo |
| `docs/04-arquitetura/` | Visão geral (C4), camadas do monólito, modelo de dados, contrato da API, fluxos, evolução para as próximas fases | Codar e gravar o vídeo |
| `docs/05-qualidade-e-seguranca/` | Estratégia de testes, checklist OWASP, plano da análise de vulnerabilidades | Frente de qualidade/segurança |
| `docs/06-entrega/` | Checklist de entrega (rastreabilidade enunciado → evidência), roteiro do vídeo (15 min), templates do PDF e do relatório | Últimas 2 semanas |
| `prompts/` | Prompts prontos para sessões de IA por frente (referência, não obrigatório) | Ao abrir uma sessão |
| `.github/` | Templates de issue/PR, workflows do Claude e o guia *Claude no GitHub* (`.github/README.md`) | Setup do repo e uso do `@claude` |

Comece por: `docs/00-guia-do-grupo/como-trabalhamos.md` → `docs/02-adr/README.md` → `docs/00-guia-do-grupo/enquetes.md`.

## Como executar

> A preencher assim que as ADR-001 (linguagem/framework) e ADR-002 (banco) forem aceitas. Meta: `docker compose up` sobe
> API + banco + Swagger em um comando; `README` explica variáveis de ambiente, como rodar testes e como obter um token JWT.

```bash
# alvo
docker compose up --build
# API:      http://localhost:8080
# Swagger:  http://localhost:8080/swagger  (ou /docs, conforme framework)
```

## Entregáveis da Fase 1 (resumo do enunciado)

1. **Vídeo de até 15 min** demonstrando todos os pontos (roteiro em `docs/06-entrega/roteiro-do-video.md`).
2. **Documentação DDD** (Miro ou equivalente): event storming completo dos fluxos *criação e acompanhamento da OS* e
   *gestão de peças e insumos*; diagramas da disciplina de DDD; linguagem ubíqua aplicada.
3. **Código-fonte** em repositório privado (acesso a `soat-architecture`): APIs conforme requisitos, `Dockerfile`,
   `docker-compose.yml`, `README.md` completo.
4. **Relatório com análise de vulnerabilidades** (scan realizado no código).
5. **Documento de entrega (PDF)**: nome do grupo, participantes e usernames do Discord, link da documentação, link do
   repositório, relatório de vulnerabilidades.

Requisitos obrigatórios completos e rastreados: `docs/06-entrega/checklist-de-entrega.md`.
