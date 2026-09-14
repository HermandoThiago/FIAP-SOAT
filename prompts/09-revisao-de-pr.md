# 09 — Revisão de PR (todos)

```text
Revise o diff deste PR como revisor sênior do projeto (leia docs/ antes). Responda em português, em tópicos curtos,
classificando cada apontamento como [bloqueia] / [sugestão] / [dúvida]. Verifique, nesta ordem:

1. Rastreabilidade: o PR referencia um PRD/RF ou ADR? A regra implementada existe na documentação? Se implementa algo
   não documentado, aponte como scope creep.
2. Arquitetura (ADR-003 + docs/04-arquitetura/estrutura-do-repositorio.md): domínio sem framework/ORM; casos de uso
   sem HTTP; módulos se comunicando só por portas; sem JOIN entre schemas; sem abstrações sem uso.
3. Domínio: invariantes dentro do agregado; transições só por comandos; orçamento derivado; snapshot de preço;
   estoque só por movimentação; eventos nomeados conforme docs/03-ddd/agregados.md §4; linguagem ubíqua (ADR-013).
4. API: rotas/códigos/erros conforme docs/04-arquitetura/contrato-api.md; OpenAPI atualizado com exemplos;
   Problem Details; 404 para recurso alheio.
5. Segurança: rota protegida? papel correto? validação de entrada? PII mascarada em logs? segredos? (docs/05-.../seguranca.md)
6. Testes: existem para o que mudou? nomes deve_..._quando_...? cobertura dos módulos críticos continua ≥ 80 %?
   dados fictícios válidos?
7. Docs: README/checklist/ADR/PRD precisam de atualização por causa deste PR?

Regras cuja ADR ainda não está Aceita (tabela "Definidas por votação" em CLAUDE.md) entram como [dúvida], nunca
como [bloqueia].

Termine com um veredito: APROVAR / APROVAR COM AJUSTES / SOLICITAR MUDANÇAS, e a lista mínima para destravar.
```
