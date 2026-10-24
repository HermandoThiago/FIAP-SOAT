# Linguagem Ubíqua

Este documento consolida os principais termos utilizados no domínio da oficina mecânica, buscando manter um vocabulário comum entre as pessoas envolvidas no processo.

## Glossário do domínio

| Termo | Definição no domínio | Exemplo | Tipo |
|---|---|---|---|
| Cliente | Pessoa que solicita e acompanha os serviços realizados pela oficina e aprova ou recusa orçamentos. | Cliente aprova o orçamento enviado para o reparo do veículo. | Atores |
| Sistema | Aplicação que registra, controla e automatiza etapas do atendimento e da execução dos serviços. | O sistema atualiza o status da ordem de serviço após a aprovação do orçamento. | Atores |
| Atendente | Pessoa responsável por receber o cliente, registrar dados e abrir ou acompanhar ordens de serviço. | O atendente abre a ordem de serviço quando o veículo chega à oficina. | Atores |
| Mecânico | Profissional responsável pelo diagnóstico e pela execução dos serviços de manutenção ou reparo. | O mecânico realiza o diagnóstico e registra os serviços necessários. | Atores |
| Administrador | Pessoa responsável por manter cadastros e acompanhar informações operacionais da oficina. | O administrador atualiza os cadastros e acompanha informações operacionais da oficina. | Atores |
| Ordem de serviço | Registro central do atendimento de um veículo, reunindo cliente, veículo, diagnóstico, serviços, peças, orçamento, status e histórico. | OS 1542 aberta para revisão e troca das pastilhas de freio. | Objetos de trabalho |
| Veículo | Bem do cliente submetido a diagnóstico, manutenção ou reparo e vinculado a uma ordem de serviço. | Honda Fit de placa ABC1D23 vinculado à OS 1542. | Objetos de trabalho |
| Serviço | Trabalho de manutenção ou reparo que pode ser incluído em uma ordem de serviço e em seu orçamento. | Troca das pastilhas de freio. | Objetos de trabalho |
| Peça | Item físico utilizado na execução de um serviço e controlado no estoque da oficina. | Jogo de pastilhas de freio dianteiras. | Objetos de trabalho |
| Orçamento | Composição de serviços, peças e valores apresentada ao cliente para aprovação antes da execução. | Orçamento de R$ 850,00 enviado ao cliente para aprovação. | Objetos de trabalho |
| Item de orçamento | Linha individual do orçamento que representa um serviço, uma peça ou outro valor cobrado. | Item: troca de óleo — R$ 120,00. | Objetos de trabalho |
| Reserva de peça | Separação temporária de uma quantidade de peças do estoque para uma ordem de serviço. | Duas pastilhas foram reservadas para a OS 1542. | Objetos de trabalho |
| Documento (CPF/CNPJ) | Identificador utilizado para registrar e localizar o cliente no sistema. | CPF informado no cadastro do cliente. | Objetos de trabalho |
| Placa | Identificador do veículo utilizado em seu cadastro e nas consultas da oficina. | Placa ABC1D23. | Objetos de trabalho |
| Status da ordem de serviço | Situação atual da ordem de serviço ao longo do processo, podendo assumir Recebida, Em diagnóstico, Aguardando aprovação, Aguardando execução, Em execução, Finalizada, Entregue, Orçamento recusado ou Cancelada. | Aguardando aprovação. | Objetos de trabalho |
| Valor monetário | Quantia associada a serviços, peças e ao total do orçamento. | R$ 350,00 referentes às peças do reparo. | Objetos de trabalho |
| Catálogo de serviços | Conjunto de serviços disponíveis para seleção e inclusão nas ordens de serviço, com seus preços vigentes. | Alinhamento, balanceamento e troca de óleo. | Objetos de trabalho |
| Catálogo de peças e insumos | Conjunto de peças e insumos cadastrados para controle de estoque e uso nos serviços, com seus preços vigentes. | Filtro de óleo, pastilha de freio e fluido de arrefecimento. | Objetos de trabalho |
| Histórico da ordem de serviço | Registro cronológico dos fatos e alterações ocorridos durante o atendimento. | Orçamento enviado às 14h32 e aprovado às 15h10. | Objetos de trabalho |
| Abrir ordem de serviço | Criar uma nova ordem de serviço para iniciar formalmente o atendimento de um veículo. | O atendente abre uma OS após receber o veículo. | Atividades |
| Cadastrar cliente | Registrar os dados necessários para identificar o cliente e vinculá-lo aos atendimentos. | Cadastrar nome, CPF e dados de contato. | Atividades |
| Cadastrar veículo | Registrar os dados do veículo que será atendido pela oficina. | Cadastrar placa, modelo e proprietário. | Atividades |
| Incluir serviços | Adicionar à ordem de serviço os serviços identificados como necessários. | Incluir troca de óleo e alinhamento na OS. | Atividades |
| Incluir peças | Adicionar à ordem de serviço ou ao orçamento as peças necessárias para a execução. | Incluir um filtro de óleo e quatro velas. | Atividades |
| Realizar diagnóstico | Avaliar o veículo para identificar problemas e necessidades de manutenção ou reparo. | O mecânico identifica desgaste nas pastilhas de freio. | Atividades |
| Gerar orçamento | Calcular e consolidar os itens e valores que serão apresentados ao cliente. | Gerar orçamento com mão de obra e peças. | Atividades |
| Enviar orçamento | Disponibilizar o orçamento ao cliente para que ele possa analisá-lo. | Enviar o orçamento pelo canal de atendimento. | Atividades |
| Aprovar orçamento | Registrar a autorização do cliente para execução do que foi orçado. | O cliente aprova o orçamento integralmente. | Atividades |
| Recusar orçamento | Registrar que o cliente não autorizou a execução do orçamento apresentado. | O cliente recusa o orçamento de reparo. | Atividades |
| Solicitar reparo adicional | Propor ao cliente um reparo que não fazia parte do orçamento inicialmente aprovado. | Após desmontagem, a oficina solicita autorização para trocar uma peça adicional. | Atividades |
| Iniciar execução | Registrar o início da realização dos serviços autorizados. | O mecânico inicia a execução após a liberação da OS. | Atividades |
| Concluir execução | Registrar que os serviços previstos e autorizados foram finalizados. | A troca das peças e os testes finais foram concluídos. | Atividades |
| Entregar veículo | Registrar a devolução do veículo ao cliente após a conclusão do atendimento. | O veículo é entregue após a finalização do serviço. | Atividades |
| Cancelar ordem de serviço | Encerrar uma ordem de serviço sem concluir o fluxo normal de execução e entrega. | A OS é cancelada porque o cliente desistiu do reparo. | Atividades |
| Consultar andamento | Verificar a situação atual e o histórico de uma ordem de serviço. | O cliente consulta se o veículo já está em execução. | Atividades |
| Cadastrar peça | Registrar uma nova peça ou insumo no catálogo e no controle de estoque. | Cadastrar filtro de ar código FA-203. | Atividades |
| Registrar entrada de estoque | Aumentar a quantidade disponível de uma peça após seu recebimento. | Registrar entrada de 20 filtros de óleo. | Atividades |
| Verificar disponibilidade | Consultar se há quantidade suficiente de uma peça para atender uma ordem de serviço. | Verificar se existem duas pastilhas disponíveis em estoque. | Atividades |
| Dar baixa no estoque | Reduzir o saldo de uma peça quando ela é efetivamente utilizada ou retirada do estoque. | Dar baixa em um filtro utilizado na OS. | Atividades |
| Reservar peças | Separar peças disponíveis para uso em uma ordem de serviço específica. | Reservar quatro velas para a OS 1542. | Atividades |
| Liberar reserva | Devolver ao saldo disponível as peças que estavam reservadas e não serão mais utilizadas. | Liberar as peças após a recusa do orçamento. | Atividades |
| Listar ordens de serviço | Consultar um conjunto de ordens de serviço para acompanhamento operacional. | Listar todas as OS que estão aguardando aprovação. | Atividades |
| Autenticar | Validar a identidade de um usuário antes do acesso ao sistema. | O atendente informa suas credenciais para que sua identidade seja validada. | Atividades |
| Transição automática de status | Determinadas ações do processo provocam a atualização automática do status da ordem de serviço. | Quando o orçamento é aprovado, a OS passa para a etapa seguinte. | Anotações |
| Registro de fatos no histórico | Alterações e acontecimentos relevantes devem permanecer registrados no histórico da ordem de serviço. | A aprovação do orçamento fica registrada com data e hora. | Anotações |

| Analista financeiro | Pessoa responsável pela elaboração e pelo envio do orçamento ao cliente após a conclusão do diagnóstico. | O analista financeiro prepara o orçamento com os serviços e peças necessários. | Atores |
| Estoque | Conjunto de peças e insumos disponíveis ou reservados para utilização nos serviços da oficina. | O sistema consulta o estoque antes de reservar uma peça para uma ordem de serviço. | Objetos de trabalho |

| Saldo de estoque | Quantidade de uma peça ou insumo disponível no estoque, considerando entradas, baixas e reservas. | O saldo de estoque indica quantos filtros de óleo ainda estão disponíveis. | Objetos de trabalho |
| Notificação | Comunicação enviada ao cliente sobre acontecimentos relevantes da ordem de serviço, como envio de orçamento ou atualização do atendimento. | O cliente recebe uma notificação quando o orçamento é enviado. | Objetos de trabalho |
| Controle de acesso | Conjunto de regras que determina quais funcionalidades e informações cada usuário pode acessar após a autenticação. | O controle de acesso permite que apenas usuários autorizados executem determinadas ações. | Objetos de trabalho |
| Usuário inativo | Usuário desligado do sistema por exclusão lógica (`usuarioAtivo = false`, com `usuarioInativadoEm`). Não autentica nem aparece nas consultas, mas continua vinculado às ordens de serviço, veículos e históricos que gerou. E-mail e documento permanecem reservados a ele. | O atendente que deixou a oficina é inativado, e as ordens de serviço que abriu continuam consultáveis para análises. | Objetos de trabalho |
| Avaliar orçamento | Analisar o orçamento recebido antes de aprová-lo ou recusá-lo. | O cliente avalia os serviços e valores apresentados no orçamento. | Atividades |
| Concluir diagnóstico | Encerrar o diagnóstico após identificar os serviços e peças necessários para o atendimento. | O mecânico conclui o diagnóstico e libera a preparação do orçamento. | Atividades |
| Executar serviços | Realizar os serviços previamente diagnosticados e autorizados para a ordem de serviço. | O mecânico executa os serviços aprovados pelo cliente. | Atividades |
| Solicitar reposição | Solicitar ao fornecedor a reposição de uma peça ou insumo indisponível para atendimento da ordem de serviço. | O atendente solicita reposição quando a peça necessária não está disponível em estoque. | Atividades |
| Inativar usuário | Desligar um usuário do sistema sem apagar seus dados: ele deixa de acessar o sistema, suas sessões são revogadas e o histórico de atendimento é preservado. É o que a rota de exclusão de usuário faz. | O administrador inativa um mecânico desligado, e as ordens de serviço dele permanecem no histórico. | Atividades |
## Tipos utilizados

- **Atores:** quem executa uma tarefa.
- **Objetos de trabalho:** elementos utilizados ou produzidos durante o processo.
- **Atividades:** ações realizadas.
- **Anotações:** informações complementares.
- **Números de sequência:** indicam ordem.
- **Grupos:** organizam elementos relacionados.
- **Cores:** podem destacar caminho crítico, exceções ou outros significados.
