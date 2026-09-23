# Documentação — índice

| # | Documento | Descrição | Dono | Status |
|---|---|---|---|---|
| 00 | [Como trabalhamos](00-guia-do-grupo/como-trabalhamos.md) | Regras do trabalho assíncrono, decisões por enquete, fluxo Git (GitFlow), Definition of Done | F2 (Shirley, facilitação) | ✅ v2 (§4 Git: ADR-008 aceita, 22/09; votação 2 de 3) |
| 00 | [Frentes e responsabilidades](00-guia-do-grupo/frentes-e-responsabilidades.md) | Frentes de trabalho, RACI, diagramas organizacionais, pendências de transição | F2 (Shirley) | ✅ E-02 aprovada; redistribuída em 16/09 (saída do Daniel) e 22/09 (saída da Vi) |
| 00 | [Cronograma](00-guia-do-grupo/cronograma.md) | Plano macro por semana, marcos, Gantt | F2 (Shirley) | 🟡 data oficial pendente (E-03: meta interna = 1 semana antes) |
| 00 | [Enquetes](00-guia-do-grupo/enquetes.md) | Todas as enquetes com texto pronto para o Discord e os resultados | F2 (Shirley) | ✅ Lotes 1–3 encerrados (22/09); só a E-01 aberta |
| 01 | [PRD-000 Visão do produto](01-requisitos/PRD-000-visao-do-produto.md) | Problema, objetivos, personas, escopo do MVP, NFRs | | 📝 revisar |
| 01 | [PRD-001 Clientes e veículos](01-requisitos/PRD-001-clientes-e-veiculos.md) | CRUDs, CPF/CNPJ, placa | | 📝 revisar |
| 01 | [PRD-002 Catálogo e estoque](01-requisitos/PRD-002-catalogo-servicos-pecas-estoque.md) | Serviços, peças/insumos, controle de estoque | | 📝 revisar |
| 01 | [PRD-003 Ordem de serviço e orçamento](01-requisitos/PRD-003-ordem-de-servico-e-orcamento.md) | Criação da OS, diagnóstico, itens, orçamento, aprovação | | 📝 revisar |
| 01 | [PRD-004 Acompanhamento e status](01-requisitos/PRD-004-acompanhamento-e-status.md) | Máquina de estados, histórico, consulta do cliente | | 📝 revisar |
| 01 | [PRD-005 Segurança](01-requisitos/PRD-005-seguranca-autenticacao.md) | JWT, papéis, validação de dados sensíveis | | 📝 revisar |
| 01 | [PRD-006 Gestão administrativa e métricas](01-requisitos/PRD-006-gestao-administrativa-e-metricas.md) | Listagens, detalhamento, tempo médio de execução | | 📝 revisar |
| 02 | [ADRs](02-adr/README.md) | 13 decisões com opções, recomendação e enquete | Grupo (curadoria: Hermando) | ✅ Todas aceitas (Lotes 1–3; E-06 revotada em 22/09) |
| 02 | [Decisões leves](02-adr/decisoes-leves.md) | Log das decisões Tipo 2 (dono da frente decide), uma linha por decisão com link da issue/PR | Donos das frentes | 🟡 atualizar sempre |
| 03 | [Linguagem ubíqua](03-ddd/linguagem-ubiqua.md) | Glossário do domínio com a tradução oficial de cada termo para o código (ADR-013) | | 📝 revisar |
| 03 | [Domain storytelling](03-ddd/domain-storytelling.md) | Histórias do domínio (base para Egon.io/Miro) | | 📝 revisar |
| 03 | [Event storming](03-ddd/event-storming.md) | Eventos, comandos, políticas, agregados, hotspots — 2 fluxos | | 📝 levar ao Miro |
| 03 | [Contextos delimitados](03-ddd/contextos-delimitados.md) | Context map e relação com módulos/microsserviços futuros | | 📝 revisar |
| 03 | [Agregados](03-ddd/agregados.md) | Agregados, entidades, value objects, invariantes | | 📝 revisar |
| 04 | [Visão geral da arquitetura](04-arquitetura/visao-geral.md) | C4 (contexto, contêineres, componentes), camadas do monólito | | 📝 revisar |
| 04 | [Modelo de dados](04-arquitetura/modelo-de-dados.md) | ER, snapshots de preço, histórico | Diego | 📝 revisar |
| 04 | [Contrato da API](04-arquitetura/contrato-api.md) | Endpoints, payloads, erros, autenticação | | 📝 revisar |
| 04 | [Fluxos](04-arquitetura/fluxos.md) | Diagramas de sequência dos fluxos principais | | 📝 revisar |
| 04 | [Evolução para as próximas fases](04-arquitetura/evolucao-fases.md) | O que decidir agora para facilitar K8s/AWS/microsserviços | | 📝 revisar |
| 04 | [Estrutura do repositório](04-arquitetura/estrutura-do-repositorio.md) | Esqueleto alvo em NestJS + Prisma, camadas clássicas por módulo, e toolchain | Hermando | 📝 revisar |
| 05 | [Estratégia de testes](05-qualidade-e-seguranca/estrategia-de-testes.md) | Pirâmide, cobertura, BDD, dados de teste | | 📝 revisar |
| 05 | [Segurança (OWASP)](05-qualidade-e-seguranca/seguranca.md) | Checklist de codificação segura para o MVP | | 📝 revisar |
| 05 | [Plano da análise de vulnerabilidades](05-qualidade-e-seguranca/plano-analise-vulnerabilidades.md) | Ferramentas, execução, formato do relatório | | 📝 revisar |
| 06 | [Checklist de entrega](06-entrega/checklist-de-entrega.md) | Rastreabilidade enunciado → evidência → vídeo | | 🟡 atualizar sempre |
| 06 | [Roteiro do vídeo](06-entrega/roteiro-do-video.md) | 15 minutos, por bloco, com responsável | | 📝 revisar |
| 06 | [Template do documento de entrega](06-entrega/documento-de-entrega-template.md) | PDF final | | 📝 |
| 06 | [Template do relatório de vulnerabilidades](06-entrega/relatorio-de-vulnerabilidades-template.md) | Relatório do scan | | 📝 |

Legenda: ✅ pronto · 🗳️ em votação/confirmação · 🟡 vivo (atualizar sempre) · 📝 rascunho para revisão do grupo.

Convenções: documentos em português; código, API e identificadores nos diagramas em **inglês**, sempre com a tradução
do glossário (`03-ddd/linguagem-ubiqua.md`, ADR-013); diagramas em **Mermaid** (renderizam no GitHub) — o Miro é montado
a partir deles para a entrega oficial.

## Claude no GitHub

> Este guia mora aqui, e não em `.github/README.md`: um `README.md` dentro de `.github/` é exibido pelo GitHub **no lugar**
> do README da raiz (decisão registrada em [`02-adr/decisoes-leves.md`](02-adr/decisoes-leves.md), PR #2).

Pré-requisitos (uma vez, pelo dono do repositório): GitHub App **Claude** instalado no repositório
(<https://github.com/apps/claude>) e o secret `CLAUDE_CODE_OAUTH_TOKEN` (assinatura Pro/Max, gerado com `claude setup-token`)
**ou** `ANTHROPIC_API_KEY` (API paga) — troque o input correspondente nos dois workflows.

> ⚠️ **Transição (22/09/2026):** o repositório e o secret `CLAUDE_CODE_OAUTH_TOKEN` estão na conta da Vi (`katomaro`), que
> saiu do grupo. Até transferir o repositório e trocar o token (ou a chave) por um de membro ativo, os dois workflows podem
> parar de funcionar — checklist em `00-guia-do-grupo/frentes-e-responsabilidades.md` §7.

| Arquivo em `.github/` | Para quê |
|---|---|
| `ISSUE_TEMPLATE/tarefa.md` | Tarefa de implementação ou documentação ligada a um PRD/ADR (Definition of Ready embutida) |
| `ISSUE_TEMPLATE/decisao.md` | Decisão que precisa de ADR e/ou enquete (Tipo 1) ou registro de decisão leve (Tipo 2) |
| `PULL_REQUEST_TEMPLATE.md` | Checklist da Definition of Done (`00-guia-do-grupo/como-trabalhamos.md` §5) |
| `workflows/claude.yml` | Responde a `@claude` em issues e PRs; pode implementar e abrir PRs em branches `claude/` |
| `workflows/claude-code-review.yml` | Revisão automática de todo PR não-rascunho com o checklist de `prompts/09-revisao-de-pr.md` |

Como usar no dia a dia:

| Onde | Escreva | O que acontece |
|---|---|---|
| Comentário em issue ou PR | `@claude explique o que este PR muda em relação ao PRD-003` | Responde no mesmo lugar (comentário único, editável) |
| Issue | `@claude implemente esta issue` | Cria branch `claude/...` a partir de `develop`, commita e abre PR para `develop` (GitFlow) para revisão humana |
| PR aberto (automático) | — | Revisão com o checklist de `prompts/09-revisao-de-pr.md`: comentários inline + resumo com veredito |
| PR (manual) | `@claude revise de novo considerando a ADR-012` | Nova revisão focada |

Limites: `--max-turns` (em `claude_args`) e `timeout-minutes` de cada workflow — os valores vigentes são os dos arquivos
em `.github/workflows/`; não os repita aqui. Eles existem para não estourar a assinatura nem os minutos do GitHub Actions
(repositório privado: 2.000 min/mês no plano gratuito). Uma execução que estoura `--max-turns` termina com erro e sem
push (aconteceu na implementação da issue #1): quebre tarefas grandes em issues menores ou aumente o limite no workflow —
só uma pessoa pode editar `workflows/*`; o app do Claude não tem essa permissão. Rascunhos (*draft*) não são revisados
automaticamente — marque *Ready for review* quando quiser a revisão.

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

As regras que o Claude segue estão em [`CLAUDE.md`](../CLAUDE.md). A revisão automática **não substitui** a aprovação
humana obrigatória (`00-guia-do-grupo/como-trabalhamos.md` §4).
