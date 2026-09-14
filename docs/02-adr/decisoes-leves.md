# Decisões leves (Tipo 2) — registro

Log das decisões **reversíveis/locais** que não precisam de ADR nem enquete (`docs/00-guia-do-grupo/como-trabalhamos.md`
§3): o dono da frente decide, registra aqui em uma linha e linka a issue/PR onde a discussão aconteceu. "Fica na
issue/PR" não é pesquisável; esta tabela é. Se uma decisão leve crescer (difícil de reverter, afeta todos), vira ADR —
e a linha passa a apontar para ela.

Como registrar: uma linha por decisão, mais recente **em cima**; data em `AAAA-MM-DD`; *Onde* é o link da issue/PR
(ou da mensagem no Discord). Nunca apague uma linha: se mudar de ideia, adicione outra e preencha *Substituída por*.

| Data | Decisão | Quem (frente) | Onde | Substituída por |
|---|---|---|---|---|
| 2026-09-14 | Repositório renomeado para `FIAP-SOAT` (só remove o `-1`); continua sendo **o mesmo** nas próximas fases (tags `v1.0.0`, `v2.0.0`…) | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | Não criar `ISSUE_TEMPLATE/config.yml` bloqueando issues em branco | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | `master` protegida; todos os membros têm permissão de *bypass*, reservada a emergências | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | Decisões Tipo 2 passam a ser registradas neste arquivo | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | Regra de vitória das enquetes: 3 votos vence; sem 3 votos → discussão + enquete rápida de 24 h (prática já adotada no Discord) | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | Prazo padrão de enquete: 72 h (opção *3 dias* do Discord; prática já adotada) | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | `catalogo-estoque` é um módulo único; escopos transversais de commit: `docs`, `infra`, `ci` | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | Regras que dependem de ADR em votação ficam marcadas 🗳️ e só bloqueiam PR depois da ADR aceita | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
| 2026-09-14 | Branch padrão é `master` (não renomear para `main`) | Vi (F1) | [#1](https://github.com/katomaro/FIAP-SOAT/issues/1) | |
