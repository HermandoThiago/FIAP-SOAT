import { StatusOrcamento } from '../../src/generated/prisma/enums';
import {
  buildQuote,
  calculateQuoteTotal,
  calculateSubtotal,
} from '../../src/modules/service-orders/domain/quote';

describe('quote', () => {
  describe('calculateSubtotal', () => {
    it.each([
      [3500, 2, 7000],
      [4500, 1.5, 6750],
      [333, 0.5, 167], // 166,5 arredonda para cima
      [100, 0.001, 0],
    ])('should return %s x %s = %s cents', (unitPrice, quantity, expected) => {
      expect(calculateSubtotal(unitPrice, quantity)).toBe(expected);
    });

    it('should accept decimal-like quantities from the database', () => {
      expect(calculateSubtotal(1000, { toString: () => '2.500' })).toBe(2500);
    });
  });

  describe('calculateQuoteTotal', () => {
    it('should sum the rounded subtotals of every item', () => {
      const total = calculateQuoteTotal([
        { osItemPrecoUnitario: 3500, osItemQuantidade: 2 },
        { osItemPrecoUnitario: 4500, osItemQuantidade: '1.5' },
      ]);

      expect(total).toBe(7000 + 6750);
    });

    it('should include the services in the total', () => {
      const total = calculateQuoteTotal(
        [{ osItemPrecoUnitario: 3500, osItemQuantidade: 2 }],
        [{ osServicoPrecoUnitario: 15000, osServicoQuantidade: 2 }],
      );

      expect(total).toBe(7000 + 30000);
    });

    it('should return zero when there are no items', () => {
      expect(calculateQuoteTotal([])).toBe(0);
    });
  });

  describe('buildQuote', () => {
    it('should list the services and add them to the total', () => {
      const quote = buildQuote(
        'order-id',
        null,
        [],
        [
          {
            osServicoId: 'os-service-1',
            servicoId: 'service-1',
            osServicoQuantidade: 2,
            osServicoPrecoUnitario: 15000,
            servico: { servicoNome: 'Alinhamento' },
          },
        ],
      );

      expect(quote.orcamentoValorTotal).toBe(30000);
      expect(quote.servicos).toEqual([
        {
          osServicoId: 'os-service-1',
          servicoId: 'service-1',
          nome: 'Alinhamento',
          quantidade: 2,
          precoUnitario: 15000,
          subtotal: 30000,
        },
      ]);
    });

    it('should return an empty draft when the order has no quote yet', () => {
      expect(buildQuote('order-id', null, [])).toEqual({
        ordemServicoId: 'order-id',
        orcamentoVersao: 1,
        orcamentoStatus: StatusOrcamento.RASCUNHO,
        orcamentoValorTotal: 0,
        orcamentoEnviadoEm: null,
        itens: [],
        servicos: [],
      });
    });

    it('should derive total and subtotals from the items, never from the stored total', () => {
      const sentAt = new Date();

      const quote = buildQuote(
        'order-id',
        {
          orcamentoVersao: 1,
          orcamentoStatus: StatusOrcamento.ENVIADO,
          orcamentoEnviadoEm: sentAt,
        },
        [
          {
            osItemId: 'item-1',
            itemEstoqueId: 'part-1',
            osItemQuantidade: '2.000',
            osItemPrecoUnitario: 3500,
            itemEstoque: { itemEstoqueNome: 'Filtro de óleo' },
          },
        ],
      );

      expect(quote.orcamentoStatus).toBe(StatusOrcamento.ENVIADO);
      expect(quote.orcamentoEnviadoEm).toBe(sentAt);
      expect(quote.orcamentoValorTotal).toBe(7000);
      expect(quote.itens).toEqual([
        {
          osItemId: 'item-1',
          itemEstoqueId: 'part-1',
          nome: 'Filtro de óleo',
          quantidade: 2,
          precoUnitario: 3500,
          subtotal: 7000,
        },
      ]);
    });
  });
});
