# 09 — Revisão de PR (todos)

```text
Revise o diff deste PR como revisor sênior do projeto (leia CLAUDE.md e docs/ antes). Responda em português, em tópicos
curtos, classificando cada apontamento como [bloqueia] / [sugestão] / [dúvida]. Verifique, nesta ordem:

1. Rastreabilidade: o PR referencia um PRD/RF ou ADR? A regra implementada existe na documentação? Se implementa algo
   não documentado, aponte como scope creep. Regra que depende de ADR ainda não **Aceita** (status em
   docs/02-adr/README.md): classifique como [dúvida] citando a enquete, nunca como [bloqueia].
2. Arquitetura (ADR-003 Clean Architecture + docs/04-arquitetura/estrutura-do-repositorio.md): domain/ e application/
   sem @nestjs/* e sem ORM; controllers falam com use cases por boundaries e devolvem por presenters; gateways mapeiam
   ORM ↔ domínio; módulos se comunicam só pelas portas expostas (CustomerLookup, CatalogLookup, StockMovements) ou
   eventos; sem JOIN entre schemas; sem abstrações sem uso; sufixo UseCase (nunca Service).
3. Domínio e linguagem ubíqua (ADR-013 + docs/03-ddd/linguagem-ubiqua.md): invariantes dentro do agregado; transições
   só por comandos; quote derivado; snapshot de preço; estoque só por StockMovement; eventos nomeados conforme o
   glossário §8; identificadores em inglês com a tradução oficial (Quote, Part, ServiceOrder…) — nome fora do glossário
   ou tradução divergente é [bloqueia].
4. API: rotas/códigos/erros conforme docs/04-arquitetura/contrato-api.md; OpenAPI atualizado com exemplos;
   Problem Details; 404 para recurso alheio.
5. Segurança: rota protegida? papel correto? validação de entrada? PII mascarada em logs? segredos?
   (docs/05-qualidade-e-seguranca/seguranca.md)
6. Testes: existem para o que mudou? it('should … when …') em inglês; cobertura dos módulos críticos continua ≥ 80 %?
   dados fictícios válidos?
7. Docs: README/checklist/ADR/PRD/glossário precisam de atualização por causa deste PR?

Termine com um veredito: APROVAR / APROVAR COM AJUSTES / SOLICITAR MUDANÇAS, e a lista mínima para destravar.
```
