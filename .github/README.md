# Templates do GitHub

Esta pasta deve se chamar **`.github/`** no repositório (foi criada como `_github/` porque a ferramenta que gerou os
arquivos não grava em pastas ocultas). Ao subir o repo:

```bash
git mv _github .github
```

Conteúdo:

- `ISSUE_TEMPLATE/tarefa.md` — tarefa ligada a PRD/ADR com critérios de aceite (DoR).
- `ISSUE_TEMPLATE/decisao.md` — abertura de uma decisão (vira ADR + enquete).
- `PULL_REQUEST_TEMPLATE.md` — checklist de Definition of Done.
- `workflows/` — a criar após ADR-001 (`ci.yml`, `security.yml`) — ver `prompts/02-esqueleto-do-projeto.md`.

Configurações recomendadas no GitHub (Settings):

1. **Repositório privado**; convidar `soat-architecture` como colaborador (read) — requisito do enunciado.
2. **Branch protection em `main`**: require PR, 1 aprovação, status checks (CI) obrigatórios, sem force-push, apagar branch após merge.
3. **Projects**: quadro kanban com colunas Backlog · Pronto para fazer · Em andamento · Em revisão · Feito.
4. **Labels**: `frente:F1..F5`, `tipo:feat|fix|docs|test|chore|security`, `prioridade:must|should|could`, `bloqueado`.
5. **Squash merge** como padrão; título do PR em Conventional Commits.
