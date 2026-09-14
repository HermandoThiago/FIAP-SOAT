# `.github/` — templates, workflows e Claude

| Arquivo | Para quê |
|---|---|
| `ISSUE_TEMPLATE/tarefa.md` | Tarefa de implementação ou documentação ligada a um PRD/ADR (Definition of Ready embutida) |
| `ISSUE_TEMPLATE/decisao.md` | Decisão que precisa de ADR e/ou enquete (Tipo 1) ou registro de decisão leve (Tipo 2) |
| `PULL_REQUEST_TEMPLATE.md` | Checklist da Definition of Done (`docs/00-guia-do-grupo/como-trabalhamos.md` §5) |
| `workflows/claude.yml` | Responde a `@claude` em issues e PRs; pode implementar e abrir PRs em branches `claude/` |
| `workflows/claude-code-review.yml` | Revisão automática de todo PR não-rascunho com o checklist de `prompts/09-revisao-de-pr.md` |

Labels: 1 `frente:*` + 1 `tipo:*` + 1 `prioridade:*` por issue — a lista vive na aba *Labels* do repositório
(regra em `docs/00-guia-do-grupo/como-trabalhamos.md` §4).

## Claude no GitHub

Pré-requisitos (uma vez, pelo dono do repositório):

1. GitHub App **Claude** instalado no repositório (<https://github.com/apps/claude>).
2. Secret `CLAUDE_CODE_OAUTH_TOKEN` (assinatura Pro/Max, gerado com `claude setup-token`) **ou** `ANTHROPIC_API_KEY`
   (API paga) — troque o input correspondente nos dois workflows.

Como usar no dia a dia:

| Onde | Escreva | O que acontece |
|---|---|---|
| Comentário em issue ou PR | `@claude explique o que este PR muda em relação ao PRD-003` | Responde no mesmo lugar (comentário único, editável) |
| Issue | `@claude implemente esta issue` | Cria branch `claude/...`, commita e abre PR para revisão humana |
| PR aberto (automático) | — | Revisão com o checklist de `prompts/09-revisao-de-pr.md`: comentários inline + resumo com veredito |
| PR (manual) | `@claude revise de novo considerando a ADR-012` | Nova revisão focada |

Limites: `--max-turns` (hoje 30 no `@claude` e 12 na revisão — o valor que vale é o de `claude_args` em cada workflow)
e `timeout-minutes` (45 e 20), para não estourar a assinatura nem os minutos do GitHub Actions (repositório privado:
2.000 min/mês no plano gratuito). Uma execução que estoura `--max-turns` termina com erro e sem push (aconteceu na
implementação da issue #1): quebre tarefas grandes em issues menores ou aumente o limite no workflow — só uma pessoa
pode editar `workflows/*`; o Claude não tem essa permissão. Rascunhos (*draft*) não são revisados automaticamente —
marque *Ready for review* quando quiser a revisão.

**Modelo e esforço** (em `claude_args` nos dois workflows):

| Flag | Valores | Configurado |
|---|---|---|
| `--model` | `claude-fable-5-1` (ID fixo) ou alias `fable` (sempre a versão mais recente); também `opus`, `sonnet`, `haiku` | `claude-fable-5-1` nos dois |
| `--effort` | `low` · `medium` · `high` · `xhigh` · `max` | `max` nos dois (também via `CLAUDE_CODE_EFFORT_LEVEL=max` no `env` do passo, porque `max` só persiste por variável de ambiente) |
| `--fallback-model` | lista separada por vírgula, sem espaço | `claude-opus-4-8` — o effort é da sessão, então o fallback também roda em `max` |

Cota: no plano **Max**, o Fable 5.1 usa até 50 % do limite semanal da conta sem custo extra e, acima disso, créditos
de uso (pagos); no **Pro**, só créditos de uso. Effort `max` é o cenário de maior consumo por execução e a revisão
automática dispara em **todo push** de PR não-rascunho — se a cota da conta do token apertar, o primeiro ajuste é
`--effort high` na revisão (mantendo `max` no `@claude`), o segundo é usar *draft* durante o trabalho e só marcar
*Ready for review* quando o PR estiver fechado. Requer Claude Code ≥ 2.1.255 (a action instala a versão atual sozinha).

As regras que o Claude segue estão em `CLAUDE.md`. A revisão automática **não substitui** a aprovação humana
obrigatória (`docs/00-guia-do-grupo/como-trabalhamos.md` §4).
