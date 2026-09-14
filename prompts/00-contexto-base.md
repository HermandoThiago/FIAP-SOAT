# 00 — Contexto base (colar no início de toda sessão)

```text
Você está ajudando um grupo de pós-graduação (FIAP Pós Tech Software Architecture, Tech Challenge Fase 1) a construir
o MVP do back-end de uma oficina mecânica. Leia e respeite a documentação em docs/ deste repositório; ela é a fonte da
verdade. Se algo não estiver documentado, pergunte antes de inventar. Responda em português.

RESUMO DO DOMÍNIO
- Sistema de Gestão da Oficina: ordens de serviço (OS), clientes (CPF/CNPJ), veículos (placa), serviços, peças/insumos
  com estoque, orçamento gerado automaticamente e aprovado pelo cliente, status da OS e acompanhamento pelo cliente.
- Status da OS (obrigatórios): RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE
  (+ CANCELADA conforme ADR-010). Status mudam SOMENTE por comandos de negócio; toda transição gera histórico.
- Orçamento = Σ itens de serviço + Σ itens de peça (snapshot de preço na inclusão), recalculado a cada alteração;
  enviar exige ≥ 1 item; aprovação inicia a execução automaticamente e baixa o estoque (ADR-012).
- Contextos delimitados / módulos: cadastro (Cliente, Veiculo), catalogo-estoque (Servico, Peca, MovimentacaoEstoque),
  atendimento (OrdemDeServico — core), identidade (Usuario, JWT). Módulos só se comunicam por portas de aplicação
  ou eventos; sem imports de domínio entre módulos; sem JOIN entre schemas.
- Linguagem ubíqua: docs/03-ddd/linguagem-ubiqua.md (domínio em português, termos técnicos em inglês — ADR-013).

DECISÕES (preencher com o resultado das enquetes)
- Linguagem/framework: {{LINGUAGEM}} / {{FRAMEWORK}}        (ADR-001)
- Banco/ORM/migrações: {{BANCO}} / {{ORM}} / {{MIGRACOES}}  (ADR-002)
- Arquitetura: {{ARQUITETURA}}                               (ADR-003)
- Autenticação: {{AUTH}}                                     (ADR-004)
- OpenAPI: {{OPENAPI}}                                       (ADR-005)
- Testes: {{TESTES}}                                         (ADR-006)
- Scans: {{SCANS}}                                           (ADR-007)
- Git/CI: {{GIT}}                                            (ADR-008)
- Ids/validações: {{IDS}}; CPF/CNPJ com dígitos verificadores; placa antiga e Mercosul (ADR-009)
- Recusa/cancelamento: {{RECUSA}}                            (ADR-010)
- Acesso do cliente: {{ACESSO_CLIENTE}}                      (ADR-011)
- Estoque: {{ESTOQUE}}                                       (ADR-012)

CONVENÇÕES
- O que depende de ADR (camadas, schemas, ids, idioma, estoque, acesso do cliente, Git) só vale depois de a ADR estar
  Aceita — tabela "Definidas por votação" em CLAUDE.md; até lá, trate como suposição e diga qual enquete resolve.
- Estrutura: docs/04-arquitetura/estrutura-do-repositorio.md. Contrato da API: docs/04-arquitetura/contrato-api.md.
- Domínio puro (sem framework/ORM); casos de uso um por comando; adapters implementam portas.
- Dinheiro como decimal (2 casas), quantidades decimal(10,3), datas UTC ISO-8601, ids gerados na aplicação.
- Erros: Problem Details (422 validação, 409 conflito/transição inválida, 401/403 auth, 404 inexistente ou alheio).
- Todo código vem com testes; cobertura ≥ 80 % em atendimento e catalogo-estoque; nomes de teste
  deve_<resultado>_quando_<condição>.
- Sem dados pessoais reais em seeds/testes/prompts. Sem segredos no código (.env.example apenas).
- Commits: Conventional Commits com escopo = módulo.

MODO DE TRABALHO
1) Antes de gerar, liste suposições e um plano curto. 2) Cite o PRD/ADR que justifica cada regra. 3) Gere código +
testes + atualização de docs/Swagger. 4) Aponte o que ficou fora e por quê.
```
