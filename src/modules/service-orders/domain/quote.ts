import { StatusOrcamento } from '../../../generated/prisma/enums';

type NumberLike = number | { toString(): string };

export interface QuoteItem {
  osItemId: string;
  itemEstoqueId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number; // centavos, congelado na inclusão
  subtotal: number; // centavos
}

export interface Quote {
  ordemServicoId: string;
  orcamentoVersao: number;
  orcamentoStatus: StatusOrcamento;
  orcamentoValorTotal: number; // centavos
  orcamentoEnviadoEm: Date | null;
  itens: QuoteItem[];
}

export interface QuoteItemSource {
  osItemId: string;
  itemEstoqueId: string;
  osItemQuantidade: NumberLike;
  osItemPrecoUnitario: number;
  itemEstoque: { itemEstoqueNome: string };
}

/** Subtotal em centavos inteiros: preço unitário × quantidade (até 3 casas), arredondado. */
export function calculateSubtotal(
  unitPrice: number,
  quantity: NumberLike,
): number {
  return Math.round(unitPrice * Number(quantity));
}

export function calculateQuoteTotal(
  items: { osItemPrecoUnitario: number; osItemQuantidade: NumberLike }[],
): number {
  return items.reduce(
    (total, item) =>
      total +
      calculateSubtotal(item.osItemPrecoUnitario, item.osItemQuantidade),
    0,
  );
}

/** O orçamento é derivado dos itens: o total nunca é atribuído, só calculado (CLAUDE.md, regra 5). */
export function buildQuote(
  serviceOrderId: string,
  quote: {
    orcamentoVersao: number;
    orcamentoStatus: StatusOrcamento;
    orcamentoEnviadoEm: Date | null;
  } | null,
  items: QuoteItemSource[],
): Quote {
  return {
    ordemServicoId: serviceOrderId,
    orcamentoVersao: quote?.orcamentoVersao ?? 1,
    orcamentoStatus: quote?.orcamentoStatus ?? StatusOrcamento.RASCUNHO,
    orcamentoValorTotal: calculateQuoteTotal(items),
    orcamentoEnviadoEm: quote?.orcamentoEnviadoEm ?? null,
    itens: items.map((item) => ({
      osItemId: item.osItemId,
      itemEstoqueId: item.itemEstoqueId,
      nome: item.itemEstoque.itemEstoqueNome,
      quantidade: Number(item.osItemQuantidade),
      precoUnitario: item.osItemPrecoUnitario,
      subtotal: calculateSubtotal(
        item.osItemPrecoUnitario,
        item.osItemQuantidade,
      ),
    })),
  };
}
