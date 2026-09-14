# Documentação — índice

| # | Documento | Descrição | Dono | Status |
|---|---|---|---|---|
| 00 | [Como trabalhamos](00-guia-do-grupo/como-trabalhamos.md) | Regras do trabalho assíncrono, decisões por enquete, fluxo Git, Definition of Done | Líder | ✅ v1 |
| 00 | [Frentes e responsabilidades](00-guia-do-grupo/frentes-e-responsabilidades.md) | Frentes de trabalho, RACI, diagramas organizacionais | Líder | 🗳️ confirmar |
| 00 | [Cronograma](00-guia-do-grupo/cronograma.md) | Plano macro por semana, marcos, Gantt | Líder | 🗳️ ajustar data |
| 00 | [Enquetes](00-guia-do-grupo/enquetes.md) | Todas as decisões pendentes com texto pronto para o Discord | Líder | 🟡 em andamento |
| 01 | [PRD-000 Visão do produto](01-requisitos/PRD-000-visao-do-produto.md) | Problema, objetivos, personas, escopo do MVP, NFRs | | 📝 revisar |
| 01 | [PRD-001 Clientes e veículos](01-requisitos/PRD-001-clientes-e-veiculos.md) | CRUDs, CPF/CNPJ, placa | | 📝 revisar |
| 01 | [PRD-002 Catálogo e estoque](01-requisitos/PRD-002-catalogo-servicos-pecas-estoque.md) | Serviços, peças/insumos, controle de estoque | | 📝 revisar |
| 01 | [PRD-003 Ordem de serviço e orçamento](01-requisitos/PRD-003-ordem-de-servico-e-orcamento.md) | Criação da OS, diagnóstico, itens, orçamento, aprovação | | 📝 revisar |
| 01 | [PRD-004 Acompanhamento e status](01-requisitos/PRD-004-acompanhamento-e-status.md) | Máquina de estados, histórico, consulta do cliente | | 📝 revisar |
| 01 | [PRD-005 Segurança](01-requisitos/PRD-005-seguranca-autenticacao.md) | JWT, papéis, validação de dados sensíveis | | 📝 revisar |
| 01 | [PRD-006 Gestão administrativa e métricas](01-requisitos/PRD-006-gestao-administrativa-e-metricas.md) | Listagens, detalhamento, tempo médio de execução | | 📝 revisar |
| 02 | [ADRs](02-adr/README.md) | 13 decisões com opções, recomendação e enquete | Grupo | 🗳️ votação |
| 03 | [Linguagem ubíqua](03-ddd/linguagem-ubiqua.md) | Glossário do domínio | | 📝 revisar |
| 03 | [Domain storytelling](03-ddd/domain-storytelling.md) | Histórias do domínio (base para Egon.io/Miro) | | 📝 revisar |
| 03 | [Event storming](03-ddd/event-storming.md) | Eventos, comandos, políticas, agregados, hotspots — 2 fluxos | | 📝 levar ao Miro |
| 03 | [Contextos delimitados](03-ddd/contextos-delimitados.md) | Context map e relação com módulos/microsserviços futuros | | 📝 revisar |
| 03 | [Agregados](03-ddd/agregados.md) | Agregados, entidades, value objects, invariantes | | 📝 revisar |
| 04 | [Visão geral da arquitetura](04-arquitetura/visao-geral.md) | C4 (contexto, contêineres, componentes), camadas do monólito | | 📝 revisar |
| 04 | [Modelo de dados](04-arquitetura/modelo-de-dados.md) | ER, snapshots de preço, histórico | | 📝 revisar |
| 04 | [Contrato da API](04-arquitetura/contrato-api.md) | Endpoints, payloads, erros, autenticação | | 📝 revisar |
| 04 | [Fluxos](04-arquitetura/fluxos.md) | Diagramas de sequência dos fluxos principais | | 📝 revisar |
| 04 | [Evolução para as próximas fases](04-arquitetura/evolucao-fases.md) | O que decidir agora para facilitar K8s/AWS/microsserviços | | 📝 revisar |
| 04 | [Estrutura do repositório](04-arquitetura/estrutura-do-repositorio.md) | Esqueleto alvo (agnóstico de linguagem) | | 📝 após ADR-001 |
| 05 | [Estratégia de testes](05-qualidade-e-seguranca/estrategia-de-testes.md) | Pirâmide, cobertura, BDD, dados de teste | | 📝 revisar |
| 05 | [Segurança (OWASP)](05-qualidade-e-seguranca/seguranca.md) | Checklist de codificação segura para o MVP | | 📝 revisar |
| 05 | [Plano da análise de vulnerabilidades](05-qualidade-e-seguranca/plano-analise-vulnerabilidades.md) | Ferramentas, execução, formato do relatório | | 📝 revisar |
| 06 | [Checklist de entrega](06-entrega/checklist-de-entrega.md) | Rastreabilidade enunciado → evidência → vídeo | | 🟡 atualizar sempre |
| 06 | [Roteiro do vídeo](06-entrega/roteiro-do-video.md) | 15 minutos, por bloco, com responsável | | 📝 revisar |
| 06 | [Template do documento de entrega](06-entrega/documento-de-entrega-template.md) | PDF final | | 📝 |
| 06 | [Template do relatório de vulnerabilidades](06-entrega/relatorio-de-vulnerabilidades-template.md) | Relatório do scan | | 📝 |

Legenda: ✅ pronto · 🗳️ em votação/confirmação · 🟡 vivo (atualizar sempre) · 📝 rascunho para revisão do grupo.

Convenções: documentos em português; termos do domínio conforme a linguagem ubíqua; diagramas em **Mermaid** (renderizam
no GitHub) — o Miro é montado a partir deles para a entrega oficial.


Como usar Claude no dia a dia:

| Onde | Escreva | O que acontece |
|---|---|---|
| Comentário em issue ou PR | `@claude explique o que este PR muda em relação ao PRD-003` | Responde no mesmo lugar (comentário único, editável) |
| Issue | `@claude implemente esta issue` | Cria branch `claude/...`, commita e abre PR para revisão humana |
| PR aberto (automático) | — | Revisão com o checklist de `prompts/09-revisao-de-pr.md`: comentários inline + resumo com veredito |
| PR (manual) | `@claude revise de novo considerando a ADR-012` | Nova revisão focada |

Limites: `--max-turns` configurado (30 no `@claude` — cabe implementar uma issue com testes e abrir PR; 12 na
revisão — tarefa fechada) e `timeout-minutes` (45 e 20) para não estourar a
assinatura nem os minutos do GitHub Actions (repositório privado: 2.000 min/mês no plano gratuito). Rascunhos
(*draft*) não são revisados automaticamente — marque *Ready for review* quando quiser a revisão.

**Modelo e esforço** (em `claude_args` nos dois workflows):

| Flag | Valores | Configurado |
|---|---|---|
| `--model` | `claude-fable-5-1` (ID fixo) ou alias `fable` (sempre a versão mais recente); também `opus`, `sonnet`, `haiku` | `claude-fable-5-1` nos dois |
| `--effort` | `low` · `medium` · `high` · `xhigh` · `max` | `max` nos dois (também via `CLAUDE_CODE_EFFORT_LEVEL=max` no `env` do passo, porque `max` só persiste por variável de ambiente) |
| `--fallback-model` | lista separada por vírgula, sem espaço | `claude-opus-4-8` — o effort é da sessão, então o fallback também roda em `max` |

Cota: no plano **Max**, o Fable 5.1 usa até 50 % do limite semanal da conta sem custo extra e, acima disso, créditos
de uso (pagos); no **Pro**, só créditos de uso. Effort `max` é o cenário de maior consumo por execução e a revisão
automática dispara em **todo push** de PR não-rascunho — se a cota da conta do token apertar, o primeiro ajuste é
`--effort high` na revisão (mantendo `max` no `@claude`), o segundo é usar *draft* durante o trabalho e só marcar
*Ready for review* quando o PR estiver fechado. Requer Claude Code ≥ 2.1.255 (a action instala a versão atual sozinha).