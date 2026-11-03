# Linguagem ubíqua e relação com o código

Termos do domínio em português. A coluna **No código** traz o identificador real, que é misto: rotas em inglês (`/customers`) ou português (`/itens`); modelos Prisma, campos e DTOs em português (`OrdemServico`, `usuarioNome`). Ver `decisoes-leves.md` (31/10 e 02/11).

**Situação:** ✅ implementado · ⚠️ parcial · ⛔ conceito de negócio **não implementado**.

## 1. Atores e papéis

| Termo | Definição | No código | Situação |
|---|---|---|---|
| Admin | Gerencia cadastros e catálogo; único que cancela OS; pode executar os comandos de equipe | perfil/papel `Admin` (`Role.ADMIN`) | ✅ |
| Atendente | Recebe o cliente, cadastra, abre e entrega OS, mantém itens de estoque | `Atendente` (`Role.ATTENDANT`) | ✅ |
| Mecânico | Diagnostica, inclui itens, envia orçamento, inicia e finaliza a execução | `Mecanico` (`Role.MECHANIC`) | ✅ |
| Cliente | Dono do veículo; consulta, aprova ou recusa o orçamento (login ou token da OS) | `Cliente` (`Role.CUSTOMER`); entidade `Usuario` | ✅ |
| Sistema | Efeitos automáticos na mesma transação (recalcular orçamento, reservar e baixar estoque, gravar histórico) | serviços de aplicação | ✅ |
| Gerente, Analista financeiro | Papéis do desenho inicial | **inexistentes** como perfil | ⛔ |

## 2. Objetos do domínio

| Termo | Definição | No código | Situação |
|---|---|---|---|
| Ordem de serviço (OS) | Registro central do atendimento de um veículo, com número sequencial | `OrdemServico`; `/service-orders` | ✅ |
| Número da OS | Sequencial do banco, devolvido como texto (`"1"`); o formato `OS-AAAA-NNNNNN` não existe | `ordemServicoNumero` | ✅ / ⛔ formato |
| Cliente | Pessoa (CPF) ou empresa (CNPJ) atendida; é um usuário com perfil Cliente | `Usuario`; `/customers` | ✅ |
| Documento (CPF/CNPJ) | Identificador único do cliente, validado pelos dígitos verificadores | `usuarioDocumento`, `TipoDocumentoUsuario`; `isValidCpf`/`isValidCnpj` | ✅ |
| Veículo | Bem do cliente atendido; pertence a um usuário Cliente | `Veiculo`; `/vehicles` | ✅ |
| Placa | Placa antiga ou Mercosul, normalizada e mascarada nas respostas ao cliente | `veiculoPlaca`; `license-plate.validator` | ✅ |
| Serviço | Trabalho do catálogo, com preço base em centavos | `Servico`; `/services` | ✅ |
| Peça / insumo | Item de estoque do tipo PECA ou INSUMO | `ItemEstoque`, `TipoItemEstoque`; `/itens` | ✅ |
| Orçamento | Total derivado dos itens, com status RASCUNHO, ENVIADO, APROVADO ou REJEITADO | `Orcamento`, `StatusOrcamento`; `GET /service-orders/{id}/quote` | ✅ |
| Item da OS | Serviço ou peça incluído na OS, com preço unitário congelado | `OrdemServicoServico`, `OrdemServicoItem` | ✅ |
| Valor monetário | Inteiro em centavos | campos de preço e total | ✅ |
| Saldo de estoque | Físico e reservado; disponível = físico − reservado | `ItemEstoque`; `availableQuantity` | ✅ |
| Movimentação de estoque | Registro de ENTRADA, SAIDA, AJUSTE, RESERVA ou LIBERACAO_RESERVA | `MovimentacaoEstoque`, `TipoMovimentacaoEstoque` | ✅ (LIBERACAO_RESERVA sem fluxo) |
| Reserva de peça | Separação das peças da OS no momento da aprovação | movimentação `RESERVA` | ✅ |
| Histórico da OS | Registro cronológico das transições, com autor | `OrdemServicoStatusHistorico`; `/status-history` | ✅ |
| Marcos | Data de cada etapa derivada do histórico | `buildMilestones` | ✅ |
| Token de acompanhamento | Credencial de uma OS para o cliente (JWT `aud=tracking`) | `TrackingTokenService`; `/tracking` | ✅ |
| Notificação | Comunicação ao cliente sobre o orçamento | apenas **log**; sem e-mail | ⚠️ |
| Usuário inativo | Exclusão lógica; não autentica e preserva histórico | `usuarioAtivo`, `usuarioInativadoEm` | ✅ |
| Controle de acesso | Papéis por rota; cliente só vê a própria OS | `RolesGuard`, `@Roles` | ✅ |

## 3. Status da OS

Nove valores no enum `StatusOrdemServico`. Alterados somente por comando, nunca por edição livre.

| Status | Significado | Terminal |
|---|---|---|
| RECEBIDA | OS criada | não |
| EM_DIAGNOSTICO | diagnóstico iniciado | não |
| AGUARDANDO_APROVACAO | orçamento enviado | não |
| AGUARDANDO_EXECUCAO | orçamento aprovado e estoque reservado | não |
| EM_EXECUCAO | execução iniciada | não |
| FINALIZADA | execução concluída e estoque baixado | não |
| ENTREGUE | veículo devolvido | sim |
| ORCAMENTO_RECUSADO | cliente recusou | sim |
| CANCELADA | cancelamento do Admin antes da aprovação | sim |

## 4. Atividades e comandos

| Atividade | Quem | No código | Situação |
|---|---|---|---|
| Cadastrar cliente / veículo / serviço / item | ver [contrato](../04-arquitetura/contrato-api.md) | `POST /customers`, `/vehicles`, `/services`, `/itens` | ✅ |
| Abrir OS | Admin, Atendente | `POST /service-orders` | ✅ |
| Realizar diagnóstico | Admin, Mecânico | `POST …/diagnosis` | ✅ |
| Incluir serviços / peças | Admin, Mecânico | `POST …/items/services`, `…/items/parts` | ✅ |
| Gerar orçamento | automático | `buildQuote`, recalculado a cada mudança | ✅ |
| Enviar orçamento | Admin, Mecânico | `POST …/quote/send` | ✅ |
| Avaliar, aprovar ou recusar orçamento | Cliente | `POST /tracking/service-orders/{id}/quote/approve` e `…/reject` | ✅ |
| Iniciar execução | Admin, Mecânico | `POST …/start-execution` | ✅ |
| Concluir execução | Admin, Mecânico | `POST …/complete` | ✅ |
| Entregar veículo | Admin, Atendente | `POST …/deliver` | ✅ |
| Cancelar OS | Admin | `POST …/cancel` (motivo obrigatório) | ✅ |
| Consultar andamento | Cliente | `GET /tracking/service-orders/{id}` | ✅ |
| Listar OS | equipe | `GET /service-orders` | ✅ |
| Calcular tempo médio de execução | equipe | `GET /metrics/average-execution-time` | ✅ |
| Registrar entrada, saída e ajuste de estoque | Admin, Atendente | `POST /itens/{id}/stock-movements` | ✅ |
| Verificar disponibilidade | Sistema | ao incluir peça (não reserva) | ✅ |
| Reservar peças / dar baixa | Sistema | na aprovação / na finalização | ✅ |
| Autenticar | todos | `POST /auth/login`, `/auth/refresh`, `/auth/logout` | ✅ |
| Inativar usuário | Admin | `DELETE /users/{id}` | ✅ |

## 5. Conceitos de negócio não implementados

| Termo do glossário antigo | Situação |
|---|---|
| Solicitar reparo adicional | ⛔ sem comando ou fluxo; `orcamentoVersao` no schema não o comprova |
| Liberar reserva | ⛔ tipo e função existem, mas nenhum fluxo os aciona |
| Solicitar reposição (a fornecedor) | ⛔ sem fornecedor nem alerta de estoque mínimo |
| Reserva que expira sem aprovação no prazo | ⛔ não existe prazo de reserva |
| Estoque mínimo e alerta de saldo baixo | ⛔ não existe campo de estoque mínimo |
| Cancelamento após a aprovação | ⛔ não permitido |
| Notificação real ao cliente | ⛔ só log |

## 6. Convenções

- Dinheiro em centavos; quantidades de estoque com até três casas decimais.
- Datas em ISO-8601 UTC.
- Código dos DTOs e rotas conforme o Swagger em `/docs`; em caso de dúvida, o código e o schema Prisma prevalecem sobre este glossário.

## Tipos de elementos (Domain Storytelling)

Atores · objetos de trabalho · atividades · anotações (regras como "toda transição gera histórico") · números de sequência · grupos · cores.
