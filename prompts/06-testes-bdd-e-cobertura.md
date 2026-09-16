# 06 — Testes, BDD e cobertura (F4, Hermando)

```text
Com base em docs/05-qualidade-e-seguranca/estrategia-de-testes.md, ADR-006 ({{TESTES}} — se ainda em votação, siga a
recomendação: Testcontainers + BDD) e nos cenários Gherkin dos PRDs (docs/01-requisitos/*.md, seção "Critérios de aceite"):

1. Audite a suíte atual: liste por módulo (customers, catalog, service-orders, identity, shared) o que está coberto
   (unit/integração) e o que falta em relação à tabela §2 da estratégia. Gere os testes faltantes priorizando: máquina de
   estados completa (it.each status × comando), cálculo do quote, VOs, invariantes de estoque, transação approve +
   withdraw, acesso do cliente (token válido/inválido/expirado/alheio).
2. BDD: crie test/bdd/features/*.feature em português (# language: pt) — service-order-creation, quote-and-approval,
   execution-and-delivery, stock-management, authentication — com steps (Cucumber-js) reutilizáveis que exercitam a API
   real (supertest) sobre o banco de teste (Testcontainers). Use os builders e os geradores de dados fictícios de
   test/support.
3. Configure o coverageThreshold do Jest ≥ 80 % (linhas e branches) em src/modules/service-orders/{domain,application} e
   src/modules/catalog/{domain,application}, excluindo DTOs/presenters triviais/infrastructure/código gerado, e faça o CI
   falhar abaixo disso. Publique o relatório HTML como artefato e gere um resumo em Markdown (percentual por módulo) para
   docs/06-entrega/evidencias/cobertura.md.
4. Entregue um teste ponta a ponta único que percorra todo o fluxo demonstrado no vídeo (blocos 6–9 do roteiro), para
   servir de "ensaio automatizado" da demo.

Descrições de teste em inglês (it('should … when …')); cenários Gherkin em português. Não altere regras de negócio para
"fazer o teste passar": se encontrar divergência entre código e PRD, reporte.
```
