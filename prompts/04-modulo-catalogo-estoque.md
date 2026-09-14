# 04 — Módulo `catalogo-estoque` (F3)

```text
Implemente o módulo catalogo-estoque conforme docs/01-requisitos/PRD-002, docs/03-ddd/agregados.md (Servico, Peca,
MovimentacaoEstoque) e docs/04-arquitetura/contrato-api.md §3.3. Decisão de estoque: {{ESTOQUE}} (ADR-012).

TDD, nesta ordem:

1. Domínio: Servico (nome único, preco, tempoEstimadoMin, ativo); Peca (sku único, tipo PECA|INSUMO, unidadeMedida,
   precoUnitario, quantidadeEstoque, quantidadeReservada, estoqueMinimo, ativo) com métodos registrarEntrada, baixar,
   reservar, liberar, ajustar, disponivel(); cada método gera uma MovimentacaoEstoque; invariantes: estoque ≥ 0,
   reservado ≤ estoque, quantidade > 0; evento EstoqueAbaixoDoMinimo quando cruzar o mínimo.
   Testes unitários de todas as invariantes.
2. Aplicação: CRUDs (inativar em vez de apagar), RegistrarEntradaDeEstoque, AjustarEstoque, BaixarEstoquePorOS
   (recebe lista {pecaId, quantidade, osId}; tudo-ou-nada), LiberarReservaPorOS; porta exposta ConsultaCatalogo
   (obterServico/obterPeca com nome, preço, disponibilidade, ativo) e MovimentacaoEstoque (para o módulo atendimento).
3. Adapters: persistência com constraints de docs/04-arquitetura/modelo-de-dados.md §3; REST conforme contrato;
   OpenAPI com exemplos; testes de integração (entrada → baixa → histórico; constraint de estoque ≥ 0 no banco;
   filtro abaixoDoMinimo).

Regra: nenhuma edição direta de quantidadeEstoque por API (PUT /pecas não altera estoque). Ao final, cobertura do
módulo e checklist atualizado.
```
