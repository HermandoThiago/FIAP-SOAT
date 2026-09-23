# 09 — Revisão de PR (todos)

```text
Revise o diff deste PR como revisor sênior do projeto (leia CLAUDE.md e docs/ antes). Responda em português, em tópicos
curtos, classificando cada apontamento como [bloqueia] / [sugestão] / [dúvida]. Verifique, nesta ordem:

1. Rastreabilidade: o PR referencia um PRD/RF ou ADR? A regra implementada existe na documentação? Se implementa algo
   não documentado, aponte como scope creep. Todas as 13 ADRs estão Aceitas (docs/02-adr/README.md): código que contraria
   a seção Decisão de uma ADR é [bloqueia]. Base do PR deve ser develop (GitFlow, ADR-008) e o título deve seguir
   Conventional Commits.
2. Arquitetura (ADR-003 camadas clássicas + docs/04-arquitetura/estrutura-do-repositorio.md): domain/ sem @nestjs/* e
   sem @prisma/client; controller → service → repository (controller nunca chama repositório); regra de negócio no
   agregado, não no service; módulos se comunicam só pelos serviços exportados (CustomersService, VehiclesService,
   CatalogService, PartsService, AuthService, TrackingTokenService) ou eventos; sem JOIN entre schemas; sem abstrações
   sem uso; sufixo Service nos serviços de aplicação (CatalogService, nunca ServicesService).
3. Domínio e linguagem ubíqua (ADR-013 + docs/ddd/linguagem-ubiqua.md): invariantes dentro do agregado; transições
   só por comandos (7 status, CANCELLED terminal — ADR-010); quote derivado; snapshot de preço; estoque só por
   StockMovement, reserva na aprovação e baixa na finalização (ADR-012); eventos nomeados conforme o glossário §8;
   identificadores em inglês com a tradução oficial (Quote, Part, ServiceOrder…) — nome fora do glossário ou tradução
   divergente é [bloqueia].
4. API: rotas/códigos/erros conforme docs/04-arquitetura/contrato-api.md; decorators do OpenAPI atualizados com
   exemplos (code-first, ADR-005); Problem Details; 404 para recurso alheio; /tracking aceita token de acompanhamento
   ou login CUSTOMER e rejeita JWT de equipe (ADR-011).
5. Segurança: rota protegida? papel correto (CUSTOMER fora das rotas administrativas)? validação de entrada? PII
   mascarada em logs? segredos? (docs/05-qualidade-e-seguranca/seguranca.md)
6. Testes: existem para o que mudou? it('should … when …') em inglês; cobertura dos módulos críticos (domain +
   services) continua ≥ 80 %? dados fictícios válidos? Testcontainers na integração; BDD quando toca um dos 3 fluxos.
7. Docs: README/checklist/ADR/PRD/glossário precisam de atualização por causa deste PR?

Termine com um veredito: APROVAR / APROVAR COM AJUSTES / SOLICITAR MUDANÇAS, e a lista mínima para destravar.
```
