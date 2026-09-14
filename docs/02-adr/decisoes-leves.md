# Decisões leves (Tipo 2) — registro

Decisões **reversíveis ou locais** (Tipo 2 em `docs/00-guia-do-grupo/como-trabalhamos.md` §3) não precisam de ADR nem
de enquete: o dono da frente decide e **registra aqui**, uma linha por decisão, com link para a issue/PR onde foi
discutida. Assim o histórico fica pesquisável fora do GitHub Issues. Se uma decisão leve passar a afetar todos ou ficar
difícil de reverter, promova-a a ADR (`ADR-000-template.md`).

Regras do registro:

- Adicione no fim da tabela (mais recente por último). Nunca apague uma linha: se mudar de ideia, adicione outra que
  **substitui** a anterior e preencha a coluna *Substitui*.
- Uso do *bypass* da proteção de `master` (emergências) também entra aqui: o quê, por quê, quem.
- Data em `AAAA-MM-DD`; *Onde* = issue, PR ou mensagem do Discord.

| Data | Frente | Decisão | Dono | Onde | Substitui |
|---|---|---|---|---|---|
| 2026-09-14 | F1 | Branch padrão do repositório é `master` (não `main`); já protegida, todos os membros com *bypass* só para emergências | Vi | issue #1 (itens 1 e 10) | — |
| 2026-09-14 | F1 | Prazo padrão de enquete: **72 h** (duração nativa do Discord); vence a opção com **3 votos**; sem 3 votos, discussão + enquete rápida | Vi | issue #1 (itens 4 e 8) — ratificar na E-03 | — |
| 2026-09-14 | F1 | Escopo de commit único `catalogo-estoque`; escopos transversais `docs`, `infra`, `ci` | Vi | issue #1 (item 5) | — |
| 2026-09-14 | F1 | Sem `ISSUE_TEMPLATE/config.yml`: issues em branco continuam permitidas | Vi | issue #1 (item 11) | — |
| 2026-09-14 | F1 | O repositório será renomeado (nome atual `FIAP-SOAT-1`); o GitHub redireciona o nome antigo | Vi | issue #1 (item 12) | — |
