# Contribuindo

Regras completas em `docs/00-guia-do-grupo/como-trabalhamos.md`. Resumo:

1. **Toda tarefa nasce de um PRD/ADR** e vira uma issue (template *Tarefa*). Sem origem documentada = scope creep.
2. **GitFlow (ADR-008)**: branch curta a partir de **`develop`** — `feat/<modulo>-<descricao>`, `fix/…`, `docs/…`, `test/…`,
   `chore/…` — com PR **para `develop`**. `master` só recebe `release/*` e `hotfix/*` (F1), sempre com tag.
3. **Commits** em Conventional Commits (**obrigatório** — o CI valida o título do PR) com escopo = módulo (`customers`,
   `catalog`, `service-orders`, `identity`, `shared`) ou transversal (`infra`, `ci`): `feat(service-orders): approve quote
   reserves stock`. Documentação usa o tipo `docs` com a pasta como escopo: `docs(adr): aceitar ADR-002`.
4. **PR** com o template preenchido; 1 aprovação de outro membro; CI verde; squash merge; branch apagada.
5. **Definition of Done**: código + testes (cobertura ≥ 80 % nos módulos críticos) + Swagger + docs + checklist de entrega.
6. **Decisões**: Tipo 1 → ADR + enquete no Discord (72 h; vence com 2 votos de 3, empate → discussão + enquete rápida de 24 h);
   Tipo 2 → dono da frente decide e registra em `docs/02-adr/decisoes-leves.md`. Hoje todas as 13 ADRs estão aceitas.
7. **Dados**: nunca CPF/CNPJ/placas reais; nunca segredos no repositório (`.env.example` apenas).
8. **IA**: pode gerar, mas quem sobe entende, testa e sabe explicar no vídeo (`prompts/README.md`).
