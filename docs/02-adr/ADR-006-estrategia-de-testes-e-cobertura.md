# ADR-006 — Estratégia de testes e cobertura ≥ 80 % nos domínios críticos

| Campo | Valor |
|---|---|
| Status | ⏳ Proposta (Lote 3) |
| Tipo | Tipo 1 |
| Decisores | Grupo — enquete **E-12** |
| Data | 2026-09-14 |
| Relacionadas | ADR-001, ADR-002, ADR-003, `docs/05-qualidade-e-seguranca/estrategia-de-testes.md` |

## Contexto e problema

Enunciado: "testes unitários e de integração para os principais fluxos" e "cobertura mínima de 80 % nos domínios
críticos". A disciplina de Qualidade cobre pirâmide de testes, **TDD e BDD**. Precisamos definir: o que conta como
"domínio crítico", como medir, como rodar testes de integração com banco e se faremos BDD.

## Decisões propostas (pacote)

| Tema | Proposta |
|---|---|
| Domínios críticos | Módulos `atendimento` (OS/orçamento/status) e `catalogo-estoque` (estoque) — camadas `domain` + `application` |
| Meta | ≥ 80 % de linhas **e** de branches nos módulos críticos; ≥ 60 % global (informativo) |
| Gate | CI falha abaixo da meta (JaCoCo rule / Jest `coverageThreshold` / coverlet threshold / `--cov-fail-under` / `go test -cover` + script) |
| Pirâmide | ~70 % unitários (domínio puro, sem framework), ~25 % integração (casos de uso + repositório real + HTTP), ~5 % ponta a ponta (fluxo completo via API no compose) |
| Banco nos testes de integração | **Opção A:** Testcontainers (banco real, isolado, mesmo motor da produção) · **Opção B:** banco em memória (H2/SQLite — rápido, mas diverge do motor real) |
| BDD | **Sim/Não:** cenários Gherkin dos PRDs executados por Cucumber/SpecFlow/behave/godog para os 3 fluxos principais (criar OS + orçamento; aprovação + execução; estoque). Vale pontos na disciplina e vira roteiro do vídeo |
| TDD | Recomendado no domínio (máquina de estados, cálculo de orçamento, VOs) — não obrigatório |
| Dados de teste | Builders/fixtures com CPF/CNPJ/placas gerados válidos e fictícios; sem dados reais |
| Testes de contrato/API | Cada endpoint tem ao menos: caso feliz + 1 validação (422) + 1 autorização (401/403) |
| Convenções | Nome `deve_<comportamento>_quando_<condição>`; um assert lógico por teste; testes de transição parametrizados cobrindo a tabela completa da PRD-004 |

## Opções em votação

1. Banco de teste: 🐳 **Testcontainers / serviço do compose** (recomendado — o que roda em produção é o que testamos) × 💾 em memória.
2. BDD: 👍 **sim** (recomendado, 3 fluxos) × 👎 não.

## Recomendação (não vinculante)

Testcontainers + BDD para os 3 fluxos. O custo é baixo com IA gerando o esqueleto dos steps, e o ganho no vídeo
("os testes automatizados") é grande: mostrar o relatório de cobertura + os cenários Gherkin passando.

## Decisão

> Preencher após a enquete E-12.

## Consequências

- CI executa: unit → integração (sobe banco) → BDD → relatório de cobertura publicado como artefato (e badge no README).
- `docs/05-qualidade-e-seguranca/estrategia-de-testes.md` detalha ferramentas por linguagem após ADR-001.

## Enquete (texto para o Discord)

> **Enquete E-12 — ADR-006 Testes** (prazo 72 h)
> Banco nos testes de integração: 🐳 Testcontainers/compose · 💾 em memória
> BDD (Gherkin) para os 3 fluxos principais: 👍 sim · 👎 não
