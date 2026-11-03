# Domain Storytelling — histórias do domínio

Notação para Egon.io ou Miro: 👤 ator · 📄 objeto de trabalho · ➡️ atividade numerada.

Atores no sistema: **Admin**, **Atendente**, **Mecânico** e **Cliente** (mais o **Sistema**, para efeitos automáticos). Não existe papel de Gerente nem de Analista financeiro. Nas histórias, "Admin" faz o papel de gestão da oficina.

Os números de OS e valores abaixo são fictícios.

## História 1 — "Cliente traz o carro com barulho no freio" (fluxo feliz)

1. **Cliente** informa o **CPF** ao **Atendente** e descreve o problema ("barulho ao frear").
2. **Atendente** localiza o **Cliente** pelo documento e o **Veículo** pela placa. Quando não existem, ambos são cadastrados antes da OS.
3. **Atendente** cria a **Ordem de Serviço** informando cliente (`clientId` ou `customerDocument`), veículo, mecânico responsável e descrição → OS **Recebida**. O veículo não pode ter outra OS aberta.
4. **Mecânico** (ou Admin) inicia o **Diagnóstico** → **Em diagnóstico**.
5. **Mecânico** inclui o **Serviço** "Troca de pastilhas" e a **Peça** "Pastilha de freio × 2". O **Sistema** congela o preço unitário, **confere** a disponibilidade (sem reservar) e recalcula o **Orçamento**.
6. **Mecânico** envia o **Orçamento** → **Aguardando aprovação**. O **Sistema** gera o **Token de acompanhamento** e a "notificação" é apenas registrada em log (fora de produção o token volta na resposta).
7. **Cliente** consulta o **Acompanhamento** (token da OS ou login de Cliente) e **aprova** → **Aguardando execução**. Na mesma transação o **Sistema** **reserva** as 2 pastilhas no **Estoque**.
8. **Mecânico** (ou Admin) **inicia a execução** (comando explícito) → **Em execução**.
9. **Mecânico** **finaliza** → **Finalizada**; o **Sistema** **baixa** a reserva do estoque.
10. **Atendente** registra a **Entrega** → **Entregue** (terminal).
11. **Mecânico, Atendente ou Admin** consultam o **tempo médio de execução**, calculado do início da execução até a finalização, pelo histórico de status.

## História 2 — "Cliente novo, veículo novo" (cadastro)

1. **Cliente** informa o CNPJ (frota) ao **Atendente**.
2. **Atendente** não encontra o cadastro e registra o **Cliente** e o **Veículo** (placa, marca, modelo, ano) em chamadas separadas.
3. Segue a História 1 a partir do passo 3.

Não há criação de cliente/veículo dentro do comando de criar OS (RF-010 não implementado).

## História 3 — "Cliente recusa o orçamento"

1. Passos 1–6 da História 1.
2. **Cliente** **recusa** o **Orçamento** informando o motivo.
3. A OS vai para **Orçamento recusado** (terminal), com o orçamento **Rejeitado** e o motivo gravado. Nada muda no **Estoque**: ainda não havia reserva.
4. Não existe reabertura nem retorno ao diagnóstico; para renegociar, abre-se uma **nova OS**.

História vizinha: antes da aprovação, o **Admin** pode **cancelar** a OS (em Recebida, Em diagnóstico ou Aguardando aprovação), com motivo obrigatório → **Cancelada**. Depois da aprovação não há cancelamento.

## História 4 — "Peça em falta"

1. Passos 1–4 da História 1.
2. **Mecânico** tenta incluir "Amortecedor dianteiro × 2" e o **Sistema** verifica o **Estoque** (0 disponível).
3. O Sistema recusa com **422 (estoque insuficiente)**; nada é reservado.
4. **Atendente** (ou Admin) registra uma **Entrada de estoque** manual (4 amortecedores); o Mecânico inclui a peça e segue.

Se o saldo desaparece **depois** do envio (por exemplo, outra OS reservou antes), a **aprovação** falha com 422 e é revertida por inteiro; o cliente pode tentar novamente após a reposição. Não há pedido automático a fornecedor.

## História 5 — "Administração mantém catálogo e estoque"

1. **Admin** cadastra o **Serviço** "Alinhamento" com o preço base (em centavos). Não há tempo estimado persistido.
2. **Admin** ou **Atendente** cadastra o **Item de estoque** "Filtro de óleo" (código, unidade, preço) e registra a **Entrada** de 20 unidades (saldo inicial vira uma movimentação).
3. Contagens de inventário usam **Ajuste**, que define o novo saldo físico com motivo e nunca fica abaixo do reservado.
4. **Admin** inativa um serviço antigo (exclusão lógica); OS antigas mantêm o preço congelado.

Alerta de estoque mínimo e reposição automática **não existem**.

## Objetos de trabalho

Cliente · Documento (CPF/CNPJ) · Veículo · Placa · Ordem de Serviço · Descrição do problema · Diagnóstico · Serviço · Item de estoque (peça ou insumo) · Item de serviço da OS · Item de peça da OS · Orçamento · Token de acompanhamento · Saldo físico/reservado · Movimentação de estoque · Histórico da OS · Marcos · Tempo de execução

## Atores

Cliente (PF/PJ) · Atendente · Mecânico · Admin · Sistema (efeitos automáticos na mesma transação)

## Fora do escopo implementado

Reparo adicional e reabertura após aprovação, cancelamento pós-aprovação, notificação real ao cliente, solicitação de reposição a fornecedor e liberação de reserva. Aparecem no glossário apenas como termos de negócio, marcados como não implementados.
