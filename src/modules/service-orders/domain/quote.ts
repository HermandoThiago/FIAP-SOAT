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

export interface QuoteService {
  osServicoId: string;
  servicoId: string;
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
  servicos: QuoteService[];
}

export interface QuoteServiceSource {
  osServicoId: string;
  servicoId: string;
  osServicoQuantidade: number;
  osServicoPrecoUnitario: number;
  servico: { servicoNome: string };
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
  services: {
    osServicoPrecoUnitario: number;
    osServicoQuantidade: number;
  }[] = [],
): number {
  const partsTotal = items.reduce(
    (total, item) =>
      total +
      calculateSubtotal(item.osItemPrecoUnitario, item.osItemQuantidade),
    0,
  );
  const servicesTotal = services.reduce(
    (total, service) =>
      total +
      calculateSubtotal(
        service.osServicoPrecoUnitario,
        service.osServicoQuantidade,
      ),
    0,
  );
  return partsTotal + servicesTotal;
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
  services: QuoteServiceSource[] = [],
): Quote {
  return {
    ordemServicoId: serviceOrderId,
    orcamentoVersao: quote?.orcamentoVersao ?? 1,
    orcamentoStatus: quote?.orcamentoStatus ?? StatusOrcamento.RASCUNHO,
    orcamentoValorTotal: calculateQuoteTotal(items, services),
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
    servicos: services.map((service) => ({
      osServicoId: service.osServicoId,
      servicoId: service.servicoId,
      nome: service.servico.servicoNome,
      quantidade: service.osServicoQuantidade,
      precoUnitario: service.osServicoPrecoUnitario,
      subtotal: calculateSubtotal(
        service.osServicoPrecoUnitario,
        service.osServicoQuantidade,
      ),
    })),
  };
}
