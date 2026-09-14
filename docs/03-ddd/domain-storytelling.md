# Domain Storytelling — histórias do domínio

> Técnica da disciplina de DDD (Fase 1): narrar, com atores, objetos de trabalho e atividades numeradas, como o domínio
> funciona. Use estas histórias para desenhar no **Egon.io** (gratuito) ou no Miro com a notação: 👤 ator · 📄 objeto de
> trabalho · ➡️ atividade numerada. Elas também servem de roteiro para o event storming.

## História 1 — "Cliente traz o carro com barulho no freio" (fluxo feliz, ponta a ponta)

Atores: 👤 Cliente · 👤 Atendente · 👤 Mecânico · 🖥️ Sistema

1. **Cliente** informa o **CPF** ao **Atendente** e descreve o problema ("barulho ao frear").
2. **Atendente** consulta o **Cliente** pelo documento no **Sistema** (encontra o cadastro e o **Veículo** placa ABC1D23).
3. **Atendente** cria a **Ordem de Serviço** para o veículo com a descrição do problema → OS **Recebida**, número `OS-2026-000042`.
4. **Mecânico** inicia o **Diagnóstico** da OS → OS **Em diagnóstico**.
5. **Mecânico** inclui o **Serviço** "Troca de pastilhas" e a **Peça** "Pastilha de freio × 2" na OS; o **Sistema** verifica o **Estoque** e recalcula o **Orçamento** (R$ 330,00).
6. **Mecânico** envia o **Orçamento** ao **Cliente** → OS **Aguardando aprovação**; o **Sistema** gera o **Token de acompanhamento** e "notifica" o cliente.
7. **Cliente** consulta o **Acompanhamento** da OS e **aprova o Orçamento** → o **Sistema** muda a OS para **Em execução** e dá **baixa no Estoque** (2 pastilhas).
8. **Mecânico** executa e **finaliza** a OS → **Finalizada**; o Sistema registra o **tempo de execução**.
9. **Atendente** registra a **Entrega** do veículo → **Entregue**.
10. **Gerente** consulta o **tempo médio de execução** do serviço "Troca de pastilhas".

## História 2 — "Cliente novo, veículo novo" (variação de cadastro)

1. **Cliente** informa **CNPJ** (frota da empresa) ao **Atendente**.
2. **Atendente** não encontra o cadastro → cadastra o **Cliente** (razão social, e-mail, telefone) e o **Veículo** (placa, marca, modelo, ano).
3. Segue a História 1 a partir do passo 3.

Hotspot: o atalho "criar cliente/veículo junto com a OS" (PRD-001 RF-010) vale a pena no MVP?

## História 3 — "Cliente recusa o orçamento" (variação de aprovação)

1. Passos 1–6 da História 1.
2. **Cliente** **recusa** o **Orçamento** informando o motivo ("muito caro").
3. Conforme ADR-010: (a) OS volta para **Em diagnóstico** e o **Mecânico** revisa os itens e reenvia; ou (b) OS vai para **Cancelada**.
4. O **Sistema** libera reservas de estoque, se houver.

## História 4 — "Peça em falta" (variação de estoque)

1. Passos 1–4 da História 1.
2. **Mecânico** tenta incluir a **Peça** "Amortecedor dianteiro × 2"; o **Sistema** verifica o **Estoque** (0 disponível).
3. Conforme ADR-012: o Sistema **bloqueia** a inclusão (mecânico pede reposição ao Gerente) ou **permite com sinalização**.
4. **Gerente** registra **Entrada de estoque** (compra de 4 amortecedores) → o Mecânico inclui a peça e segue.

## História 5 — "Gerente mantém o catálogo e o estoque" (fluxo de gestão)

1. **Gerente** cadastra o **Serviço** "Alinhamento" (R$ 120,00, 45 min).
2. **Gerente** cadastra a **Peça** "Filtro de óleo" (SKU FO-001, R$ 35,00, estoque mínimo 5).
3. **Gerente** registra **Entrada** de 20 filtros.
4. Após várias OS, o Sistema sinaliza **estoque abaixo do mínimo** (Could) → Gerente registra nova entrada.
5. **Gerente** inativa um serviço antigo; OS antigas mantêm o **snapshot** do item.

## Objetos de trabalho identificados

Cliente · Documento (CPF/CNPJ) · Veículo · Placa · Ordem de Serviço · Descrição do problema · Serviço · Peça/Insumo ·
Item de serviço · Item de peça · Orçamento · Token de acompanhamento · Estoque · Movimentação de estoque · Histórico da OS ·
Tempo de execução

## Atores identificados

Cliente (PF/PJ) · Atendente · Mecânico · Gerente · Sistema (políticas automáticas)
