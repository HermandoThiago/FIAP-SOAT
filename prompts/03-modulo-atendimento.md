# 03 — Módulo `atendimento` (F3) — core do sistema

```text
Implemente o módulo atendimento conforme docs/01-requisitos/PRD-003 (OS e orçamento), PRD-004 (status e acompanhamento),
PRD-006 (listagem e tempo médio), docs/03-ddd/agregados.md e docs/04-arquitetura/contrato-api.md §3.4–3.6.
Decisões: {{RECUSA}} (ADR-010), {{ACESSO_CLIENTE}} (ADR-011), {{ESTOQUE}} (ADR-012), {{IDS}} (ADR-009).

Trabalhe em TDD, nesta ordem, parando para revisão a cada passo:

PASSO 1 — Domínio puro (sem framework)
- Agregado OrdemDeServico com: numero (OS-AAAA-NNNNNN), clienteId, veiculoId, descricaoProblema, status (enum StatusOS),
  itensServico/itensPeca (snapshot de nome e preço), orcamento (valorTotal derivado, status, enviadoEm, respondidoEm),
  marcos temporais, historico (append-only), versao.
- Comandos: iniciarDiagnostico, incluirServico, incluirPeca, removerItem, enviarOrcamento, aprovarOrcamento,
  recusarOrcamento(motivo, desistiu), finalizar, entregar, cancelar(motivo).
- PoliticaDeTransicao com a tabela da PRD-004 §2; qualquer transição inválida lança erro de domínio (→ 409).
- Eventos de domínio nomeados como em docs/03-ddd/agregados.md §4.
- Testes unitários: TODAS as combinações (status × comando) parametrizadas; cálculo do orçamento (Dinheiro, arredondamento);
  itens congelados após envio; enviar sem itens; aprovar duas vezes; histórico e versao.

PASSO 2 — Aplicação
- Casos de uso: CriarOrdemDeServico (cliente por id ou documento; veículo por id ou placa; valida posse via porta
  ConsultaCadastro; RN-039 uma OS aberta por veículo), IniciarDiagnostico, IncluirItemNaOS (busca snapshot via
  ConsultaCatalogo; verifica disponibilidade), RemoverItem, EnviarOrcamento (token de acompanhamento + NotificadorDeCliente),
  AprovarOrcamento (transacional: agregado + porta MovimentacaoEstoque.baixar — falha na baixa reverte tudo),
  RecusarOrcamento, FinalizarExecucao, RegistrarEntrega, CancelarOS, ConsultarAcompanhamento (projeção mascarada),
  ListarOS (filtros/paginação), CalcularTempoMedioExecucao (PRD-006 §2, SQL de docs/04-arquitetura/modelo-de-dados.md §4).
- Portas de saída como interfaces; fakes em memória para testes de aplicação.

PASSO 3 — Adapters
- Persistência ({{ORM}}) com mapeamento separado do domínio; repositório com lock otimista; sequência anual do número.
- REST conforme contrato (rotas, códigos, Problem Details, OpenAPI com exemplos); rotas /acompanhamento validam o token
  de cliente (aud, osId) e NÃO passam pelo filtro administrativo.
- Testes de integração: fluxo completo criar → diagnóstico → itens → enviar → aprovar (estoque baixa) → finalizar →
  entregar → histórico → métrica; 401/403/404/409/422 relevantes.

Ao final: relatório de cobertura do módulo (meta ≥ 80 % linhas e branches em domain+application), lista de
endpoints implementados marcada em docs/06-entrega/checklist-de-entrega.md e pendências.
```
