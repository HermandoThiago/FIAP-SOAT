# Contribuindo

Regras completas em `docs/00-guia-do-grupo/como-trabalhamos.md`. Resumo:

1. **Toda tarefa nasce de um PRD/ADR** e vira uma issue (template *Tarefa*). Sem origem documentada = scope creep.
2. **Branch curta** a partir de `master`: `feat/<modulo>-<descricao>`, `fix/…`, `docs/…`, `test/…`, `chore/…`.
3. **Commits** em Conventional Commits com escopo = módulo: `feat(atendimento): aprovar orçamento inicia execução`.
4. **PR** com o template preenchido; 1 aprovação de outro membro; CI verde; squash merge; branch apagada.
5. **Definition of Done**: código + testes (cobertura ≥ 80 % nos módulos críticos) + Swagger + docs + checklist de entrega.
6. **Decisões**: Tipo 1 → ADR + enquete no Discord (48 h); Tipo 2 → dono da frente decide e registra.
7. **Dados**: nunca CPF/CNPJ/placas reais; nunca segredos no repositório (`.env.example` apenas).
8. **IA**: pode gerar, mas quem sobe entende, testa e sabe explicar no vídeo (`prompts/README.md`).
