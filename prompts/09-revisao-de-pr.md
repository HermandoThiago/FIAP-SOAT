# 09 — Revisão de PR (todos)

```text
Revise o diff deste PR como revisor sênior do projeto (leia CLAUDE.md e docs/ antes). Responda em português, em tópicos
curtos, classificando cada apontamento como [bloqueia] / [sugestão] / [dúvida]. Verifique, nesta ordem:

1. Rastreabilidade: o PR referencia um PRD/RF ou ADR? A regra implementada existe na documentação? Se implementa algo
   não documentado, aponte como scope creep. As ADRs são histórico: onde o código divergiu, a divergência está em
   docs/02-adr/README.md e docs/02-adr/decisoes-leves.md. O título do PR deve seguir Conventional Commits e a base deve
   seguir o fluxo da ADR-008.
2. Arquitetura (CLAUDE.md e docs/04-arquitetura/estrutura-do-repositorio.md): domain/ sem @nestjs/* e sem
   @prisma/client; controller → service (não há camada repositories/); controller nunca acessa o banco; módulos se
   comunicam só pelos serviços exportados (CustomersService, VehiclesService, CatalogService, ItemService,
   StockService, AuthService, TrackingTokenService); sem abstrações sem uso.
3. Domínio e linguagem ubíqua (docs/ddd/linguagem-ubiqua.md): transições só por comandos via StatusTransitionPolicy
   (9 status; ENTREGUE, ORCAMENTO_RECUSADO e CANCELADA terminais); orçamento derivado dos itens; preço congelado na
   inclusão; estoque só por MovimentacaoEstoque, reserva na aprovação e baixa na finalização, na mesma transação da
   transição; dinheiro em centavos. Nome fora do glossário ou divergente do código existente é [bloqueia]. Documento
   que descreve como funcionalidade algo que o código não faz (linguagem-ubiqua.md §5) é [bloqueia].
4. API: rotas, códigos e erros conforme docs/04-arquitetura/contrato-api.md e o Swagger gerado (code-first); decorators
   do OpenAPI atualizados com exemplos coerentes com a validação; 400 validação, 401/403 auth, 404 inexistente ou
   alheio, 409 conflito ou transição inválida, 422 regra de negócio; /tracking aceita token de acompanhamento ou login
   de Cliente e rejeita JWT de equipe.
5. Segurança: rota protegida? papel correto (Cliente fora das rotas administrativas)? validação de entrada? PII
   mascarada em logs? segredos? (docs/05-qualidade-e-seguranca/seguranca.md)
6. Testes: existem para o que mudou? it('should … when …') em inglês; o gate de cobertura do jest.config.ts continua
   passando? dados fictícios válidos? Testcontainers na integração.
7. Docs: README/checklist/ADR/PRD/glossário precisam de atualização por causa deste PR?

Termine com um veredito: APROVAR / APROVAR COM AJUSTES / SOLICITAR MUDANÇAS, e a lista mínima para destravar.
```
