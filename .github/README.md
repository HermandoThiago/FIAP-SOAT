# Claude no GitHub

Guia dos dois workflows desta pasta: `workflows/claude.yml` (responde a `@claude`) e `workflows/claude-code-review.yml`
(revisão automática de todo PR). As regras que o Claude segue estão em [`CLAUDE.md`](../CLAUDE.md); o processo do grupo,
em [`docs/00-guia-do-grupo/como-trabalhamos.md`](../docs/00-guia-do-grupo/como-trabalhamos.md) §7. A revisão automática
**não substitui** a aprovação humana obrigatória.

Também moram aqui os templates de issue (`ISSUE_TEMPLATE/tarefa.md`, `ISSUE_TEMPLATE/decisao.md`) e de PR
(`PULL_REQUEST_TEMPLATE.md`).

## Pré-requisitos

1. GitHub App **Claude** instalado no repositório (<https://github.com/apps/claude>).
2. Secret `CLAUDE_CODE_OAUTH_TOKEN` (assinatura Pro/Max, gerado com `claude setup-token`) **ou** `ANTHROPIC_API_KEY`
   (API paga) — troque o input correspondente nos dois workflows.

## Como usar no dia a dia

| Onde | Escreva | O que acontece |
|---|---|---|
| Comentário em issue ou PR | `@claude explique o que este PR muda em relação ao PRD-003` | Responde no mesmo lugar (comentário único, editável) |
| Issue | `@claude implemente esta issue` | Cria branch `claude/...`, commita e abre PR para revisão humana |
| PR aberto (automático) | — | Revisão com o checklist de `prompts/09-revisao-de-pr.md`: comentários inline + resumo com veredito |
| PR (manual) | `@claude revise de novo considerando a ADR-012` | Nova revisão focada |

## Limites

`--max-turns` configurado (30 no `@claude` — cabe implementar uma issue com testes e abrir PR; 12 na revisão — tarefa
fechada) e `timeout-minutes` (45 e 20) para não estourar a assinatura nem os minutos do GitHub Actions (repositório
privado: 2.000 min/mês no plano gratuito). Rascunhos (*draft*) não são revisados automaticamente — marque *Ready for
review* quando quiser a revisão. O Claude **não consegue editar** arquivos de `workflows/` (permissão do GitHub App);
mudanças neles são manuais.

## Modelo e esforço

Em `claude_args` nos dois workflows:

| Flag | Valores | Configurado |
|---|---|---|
| `--model` | `claude-fable-5-1` (ID fixo) ou alias `fable` (sempre a versão mais recente); também `opus`, `sonnet`, `haiku` | `claude-fable-5-1` nos dois |
| `--effort` | `low` · `medium` · `high` · `xhigh` · `max` | `max` nos dois (também via `CLAUDE_CODE_EFFORT_LEVEL=max` no `env` do passo, porque `max` só persiste por variável de ambiente) |
| `--fallback-model` | lista separada por vírgula, sem espaço | `claude-opus-4-8` — o effort é da sessão, então o fallback também roda em `max` |

## Cota

No plano **Max**, o Fable 5.1 usa até 50 % do limite semanal da conta sem custo extra e, acima disso, créditos de uso
(pagos); no **Pro**, só créditos de uso. Effort `max` é o cenário de maior consumo por execução e a revisão automática
dispara em **todo push** de PR não-rascunho — se a cota da conta do token apertar, o primeiro ajuste é `--effort high`
na revisão (mantendo `max` no `@claude`), o segundo é usar *draft* durante o trabalho e só marcar *Ready for review*
quando o PR estiver fechado. Requer Claude Code ≥ 2.1.255 (a action instala a versão atual sozinha).
