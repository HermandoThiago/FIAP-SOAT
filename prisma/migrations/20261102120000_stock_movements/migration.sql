-- Movimentações manuais (entrada, saída, ajuste) não pertencem a nenhuma OS: o vínculo passa a ser opcional.
ALTER TABLE "MovimentacaoEstoque" ALTER COLUMN "ordem_servico_id" DROP NOT NULL;

-- Invariantes de estoque também no banco (ADR-012; CLAUDE.md, regra 6).
ALTER TABLE "MovimentacaoEstoque"
  ADD CONSTRAINT "MovimentacaoEstoque_quantidade_positiva_check" CHECK ("movimentacao_quantidade" > 0);

ALTER TABLE "ItemEstoque"
  ADD CONSTRAINT "ItemEstoque_estoque_check" CHECK (
    "item_estoque_quantidade" >= 0
    AND "item_estoque_reservada" >= 0
    AND "item_estoque_reservada" <= "item_estoque_quantidade"
  );

-- Histórico de um item, do mais recente para o mais antigo.
CREATE INDEX "MovimentacaoEstoque_item_criada_idx" ON "MovimentacaoEstoque"("item_estoque_id", "movimentacao_criada_em");
