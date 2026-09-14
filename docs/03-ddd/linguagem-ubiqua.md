# Linguagem ubíqua — glossário do domínio da oficina

> Fonte da verdade para nomes no código, na API, nos testes, no Miro e no vídeo (ADR-013: domínio em português).
> Regra: **um termo, um significado, em todo lugar**. Sinônimos listados são para *evitar*.

## Contexto `atendimento` (core)

| Termo | Definição | Evitar | Identificador no código |
|---|---|---|---|
| **Ordem de Serviço (OS)** | Registro de um atendimento a um veículo de um cliente, do recebimento à entrega. Agrega itens de serviço, itens de peça, orçamento, status e histórico. | pedido, ticket, chamado, work order | `OrdemDeServico`, `ordens_servico`, `/ordens-servico` |
| **Número da OS** | Identificador legível para humanos (`OS-2026-000123`), único por oficina. | id, código | `numero` |
| **Descrição do problema** | Relato do cliente/atendente na abertura da OS. | queixa, reclamação | `descricaoProblema` |
| **Diagnóstico** | Etapa em que o mecânico avalia o veículo e define serviços e peças necessários. | análise, vistoria | `iniciarDiagnostico()` |
| **Item de serviço** | Serviço do catálogo incluído na OS com quantidade e **preço no momento da inclusão** (snapshot). | linha, task | `ItemServico` |
| **Item de peça** | Peça/insumo do catálogo incluído na OS com quantidade e preço unitário no momento da inclusão. | material, produto | `ItemPeca` |
| **Orçamento** | Valor total calculado automaticamente = Σ itens de serviço + Σ itens de peça, com status próprio (pendente → enviado → aprovado/recusado). | cotação, proposta, quote | `Orcamento`, `valorTotal`, `StatusOrcamento` |
| **Enviar orçamento** | Ação do mecânico/atendente que congela os itens, gera o token de acompanhamento e coloca a OS em *Aguardando aprovação*. | submeter, publicar | `enviarOrcamento()` |
| **Aprovação do orçamento** | Ação do cliente que autoriza a execução; inicia a execução automaticamente. | autorização, aceite | `aprovarOrcamento()` |
| **Recusa do orçamento** | Ação do cliente que não autoriza; efeitos conforme ADR-010. | rejeição | `recusarOrcamento()` |
| **Execução** | Realização dos serviços aprovados pelo mecânico. | reparo, conserto (usar só em texto livre) | `EM_EXECUCAO`, `execucaoIniciadaEm` |
| **Finalização** | Mecânico declara os serviços concluídos; marca o fim do tempo de execução. | conclusão, encerramento | `finalizar()`, `finalizadaEm` |
| **Entrega** | Atendente registra a devolução do veículo ao cliente; OS torna-se imutável. | retirada, baixa | `entregar()`, `entregueEm` |
| **Status da OS** | Um dos estados: Recebida, Em diagnóstico, Aguardando aprovação, Em execução, Finalizada, Entregue (+ Cancelada se ADR-010). | situação, fase, etapa | `StatusOS.RECEBIDA … ENTREGUE` |
| **Transição** | Mudança de status causada por um comando de negócio; nunca por edição direta. | update de status | `HistoricoStatus` |
| **Histórico da OS** | Lista append-only de transições (de, para, quando, quem, motivo). | log, auditoria | `historico` |
| **Cancelamento** | Encerramento da OS antes da execução, com motivo (ADR-010). | exclusão | `cancelar()`, `CANCELADA` |
| **Tempo de execução** | `finalizadaEm − execucaoIniciadaEm` (minutos). | lead time, SLA | `tempoExecucaoMin` |
| **Tempo médio de execução** | Média dos tempos de execução das OS finalizadas em um período (geral ou por serviço). | produtividade | `TempoMedioExecucao` |
| **Acompanhamento** | Consulta do cliente ao progresso da OS (status, orçamento, marcos), sem acesso administrativo. | tracking, portal | `/acompanhamento` |
| **Token de acompanhamento** | Credencial de escopo restrito a uma OS, gerada no envio do orçamento (ADR-011). | link mágico | `TokenAcompanhamento` |

## Contexto `cadastro`

| Termo | Definição | Evitar | Identificador |
|---|---|---|---|
| **Cliente** | Pessoa física (CPF) ou jurídica (CNPJ) dona de veículos atendidos pela oficina. | consumidor, usuário | `Cliente`, `/clientes` |
| **Documento** | CPF (11 dígitos) ou CNPJ (14 dígitos), validado por dígitos verificadores; único entre clientes ativos. | identidade, registro | `Documento` (VO), `CPF`, `CNPJ` |
| **Veículo** | Automóvel do cliente identificado pela **placa**; tem marca, modelo e ano. | carro, automóvel (texto livre ok) | `Veiculo`, `/veiculos` |
| **Placa** | Identificador oficial do veículo, padrão antigo (`ABC1234`) ou Mercosul (`ABC1D23`); única entre veículos ativos. | chapa | `Placa` (VO) |
| **Inativar** | Remoção lógica de cliente/veículo (mantém histórico). | deletar, excluir | `ativo = false` |

## Contexto `catalogo-estoque`

| Termo | Definição | Evitar | Identificador |
|---|---|---|---|
| **Serviço** | Item do catálogo de mão de obra com preço e tempo estimado (ex.: troca de óleo, alinhamento). | tarefa, job | `Servico`, `/servicos` |
| **Tempo estimado** | Duração prevista do serviço em minutos (catálogo). | SLA | `tempoEstimadoMin` |
| **Peça** | Item físico contável usado em serviços (ex.: filtro de óleo). | produto, componente | `Peca` (`tipo = PECA`) |
| **Insumo** | Item consumível, possivelmente fracionário (ex.: óleo 5W30, litros). Compartilha o agregado `Peca`. | material, suprimento | `Peca` (`tipo = INSUMO`), `unidadeMedida` |
| **SKU** | Código único da peça/insumo no catálogo. | referência, código de barras | `sku` |
| **Estoque** | Quantidade disponível de uma peça/insumo. Só muda por movimentação. | saldo, inventário | `quantidadeEstoque` |
| **Estoque mínimo** | Quantidade abaixo da qual a peça precisa de reposição (alerta — Could). | ponto de pedido | `estoqueMinimo` |
| **Movimentação de estoque** | Registro imutável de ENTRADA, SAIDA, RESERVA, LIBERACAO ou AJUSTE, com quantidade, motivo e OS relacionada. | transação, lançamento | `MovimentacaoEstoque` |
| **Entrada** | Movimentação que aumenta o estoque (compra/abastecimento). | compra | `TipoMovimentacao.ENTRADA` |
| **Baixa** | Movimentação de saída vinculada a uma OS (momento conforme ADR-012). | consumo, débito | `TipoMovimentacao.SAIDA` |
| **Reserva / Liberação** | Compromisso/descompromisso de quantidade para uma OS (se ADR-012 = reserva). | bloqueio | `RESERVA`, `LIBERACAO` |
| **Disponibilidade** | `quantidadeEstoque − quantidadeReservada`. | saldo livre | `disponivel()` |

## Contexto `identidade`

| Termo | Definição | Evitar | Identificador |
|---|---|---|---|
| **Usuário administrativo** | Funcionário da oficina com acesso às APIs administrativas via JWT. | admin, operador | `Usuario`, `/usuarios` |
| **Papel** | Perfil de autorização: `ATENDENTE`, `MECANICO`, `GERENTE`. | role, perfil | `Papel` |
| **Atendente** | Recebe o cliente, abre OS, registra entrega. | recepcionista | `ATENDENTE` |
| **Mecânico** | Diagnostica, inclui itens, envia orçamento, executa e finaliza. | técnico | `MECANICO` |
| **Gerente** | Mantém catálogo, estoque, usuários; acompanha métricas. | dono, administrador | `GERENTE` |
| **Token de acesso** | JWT administrativo (curta duração) emitido no login. | sessão | `accessToken` |

## Convenções de escrita

- Status em texto: *Recebida*, *Em diagnóstico*, *Aguardando aprovação*, *Em execução*, *Finalizada*, *Entregue*. Em código: `RECEBIDA`, `EM_DIAGNOSTICO`, `AGUARDANDO_APROVACAO`, `EM_EXECUCAO`, `FINALIZADA`, `ENTREGUE` (+ `CANCELADA`).
- Identificadores sem acento/cedilha (`Orcamento`, `Peca`, `Veiculo`, `Servico`); mensagens e documentação com acentuação normal.
- Datas/horas em UTC no banco e ISO-8601 na API (`2026-10-05T14:30:00Z`); valores monetários em BRL com 2 casas, tipo decimal.
