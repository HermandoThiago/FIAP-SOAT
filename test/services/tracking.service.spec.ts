import { NotFoundException } from '@nestjs/common';
import { StatusOrdemServico } from '../../src/generated/prisma/enums';
import {
  ServiceOrdersService,
  TrackingService,
} from '../../src/modules/service-orders/services';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('TrackingService', () => {
  const orderId = '11111111-1111-4111-8111-111111111111';
  const otherOrderId = '22222222-2222-4222-8222-222222222222';
  const at = new Date('2026-10-05T14:30:00Z');
  const stored = {
    ordemServicoId: orderId,
    ordemServicoNumero: 42n,
    usuarioId: 'customer-id',
    ordemServicoStatus: StatusOrdemServico.AGUARDANDO_APROVACAO,
    veiculo: {
      veiculoPlaca: 'ABC1D23',
      veiculoMarca: 'Fiat',
      veiculoModelo: 'Argo',
    },
    cliente: { usuarioNome: 'Maria Silva', usuarioDocumento: '52998224725' },
    historicoStatus: [
      {
        historicoStatusNovo: StatusOrdemServico.RECEBIDA,
        historicoCriadoEm: at,
      },
    ],
    orcamentos: [
      {
        orcamentoVersao: 1,
        orcamentoStatus: 'ENVIADO',
        orcamentoEnviadoEm: at,
      },
    ],
    itens: [
      {
        osItemId: 'item-1',
        itemEstoqueId: 'part-1',
        osItemQuantidade: '2.000',
        osItemPrecoUnitario: 9000,
        itemEstoque: { itemEstoqueNome: 'Pastilha de freio' },
      },
    ],
  };

  const db = { ordemServico: { findFirst: jest.fn() } };
  const serviceOrdersService = {
    approveQuote: jest.fn(),
    rejectQuote: jest.fn(),
  };
  let service: TrackingService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.ordemServico.findFirst.mockResolvedValue(stored);
    service = new TrackingService(
      { db } as unknown as DatabaseService,
      serviceOrdersService as unknown as ServiceOrdersService,
    );
  });

  describe('findTracking', () => {
    it('should return the masked tracking view for the token actor', async () => {
      const result = await service.findTracking(
        { kind: 'token', serviceOrderId: orderId },
        orderId,
      );

      expect(result).toEqual({
        number: '42',
        status: StatusOrdemServico.AGUARDANDO_APROVACAO,
        statusDescription: 'Aguardando sua aprovação do orçamento',
        vehicle: { licensePlate: 'ABC1***', brand: 'Fiat', model: 'Argo' },
        customer: { name: 'Maria Silva', document: '***.982.247-**' },
        quote: {
          totalAmount: 18000,
          status: 'ENVIADO',
          items: [
            { description: 'Pastilha de freio', quantity: 2, subtotal: 18000 },
          ],
        },
        timeline: [{ status: StatusOrdemServico.RECEBIDA, at }],
        nextAction: 'aprovar ou recusar o orçamento',
      });
    });

    it('should filter by the owner when the actor is a logged customer', async () => {
      await service.findTracking(
        { kind: 'customer', customerId: 'customer-id' },
        orderId,
      );

      expect(db.ordemServico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ordemServicoId: orderId, usuarioId: 'customer-id' },
        }),
      );
    });

    it('should throw NotFoundException when the order belongs to another customer', async () => {
      db.ordemServico.findFirst.mockResolvedValue(null);

      await expect(
        service.findTracking(
          { kind: 'customer', customerId: 'someone-else' },
          orderId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should never query another order than the one in the token', async () => {
      db.ordemServico.findFirst.mockResolvedValue(null);

      await expect(
        service.findTracking(
          { kind: 'token', serviceOrderId: orderId },
          otherOrderId,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(db.ordemServico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ordemServicoId: '00000000-0000-0000-0000-000000000000' },
        }),
      );
    });
  });

  describe('approveQuote / rejectQuote', () => {
    const actor = { kind: 'token', serviceOrderId: orderId } as const;

    it('should approve as the order customer and return the tracking view', async () => {
      db.ordemServico.findFirst.mockResolvedValue({ ...stored });

      const result = await service.approveQuote(actor, orderId);

      expect(serviceOrdersService.approveQuote).toHaveBeenCalledWith(
        orderId,
        'customer-id',
      );
      expect(result.number).toBe('42');
    });

    it('should reject as the order customer passing the reason', async () => {
      await service.rejectQuote(actor, orderId, 'Muito caro');

      expect(serviceOrdersService.rejectQuote).toHaveBeenCalledWith(
        orderId,
        'customer-id',
        'Muito caro',
      );
    });

    it('should not touch the order when the actor has no access to it', async () => {
      db.ordemServico.findFirst.mockResolvedValue(null);

      await expect(service.approveQuote(actor, otherOrderId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.rejectQuote(actor, otherOrderId)).rejects.toThrow(
        NotFoundException,
      );
      expect(serviceOrdersService.approveQuote).not.toHaveBeenCalled();
      expect(serviceOrdersService.rejectQuote).not.toHaveBeenCalled();
    });
  });
});
