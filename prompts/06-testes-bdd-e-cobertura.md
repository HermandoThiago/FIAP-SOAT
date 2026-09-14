# 06 — Testes, BDD e cobertura (F4)

```text
Com base em docs/05-qualidade-e-seguranca/estrategia-de-testes.md, ADR-006 ({{TESTES}}) e nos cenários Gherkin dos
PRDs (docs/01-requisitos/*.md, seção "Critérios de aceite"):

1. Audite a suíte atual: liste por módulo o que está coberto (unit/integração) e o que falta em relação à tabela §2 da
   estratégia. Gere os testes faltantes priorizando: máquina de estados completa, cálculo de orçamento, VOs,
   invariantes de estoque, transação aprovação+baixa, acesso do cliente (token válido/inválido/expirado/alheio).
2. BDD: crie tests/bdd/features/*.feature em português (# language: pt) para os 3 fluxos principais
   (criacao-da-os, orcamento-e-aprovacao, execucao-e-entrega) + gestao-de-estoque + autenticacao, com steps
   reutilizáveis que exercitam a API real (HTTP) sobre o banco de teste. Use builders e o gerador de dados fictícios.
3. Configure o gate de cobertura ≥ 80 % (linhas e branches) em atendimento e catalogo-estoque (domain+application),
   excluindo DTOs/mapeadores/config/código gerado, e faça o CI falhar abaixo disso. Publique o relatório HTML como
   artefato e gere um resumo em Markdown (percentual por módulo) para docs/06-entrega/evidencias/cobertura.md.
4. Entregue um teste ponta a ponta único que percorra todo o fluxo demonstrado no vídeo (bloco 6–9 do roteiro), para
   servir de "ensaio automatizado" da demo.

Não altere regras de negócio para "fazer o teste passar": se encontrar divergência entre código e PRD, reporte.
```
