import { UnprocessableEntityException } from '@nestjs/common';
import { StatusOrdemServico } from '../../src/generated/prisma/enums';
import { MetricsService } from '../../src/modules/service-orders/services';
import { DatabaseService } from '../../src/shared/database/database.service';

describe('MetricsService', () => {
  const at = (iso: string) => new Date(iso);
  const db = {
    ordemServicoStatusHistorico: { findMany: jest.fn() },
    ordemServicoServico: { findMany: jest.fn() },
  };
  let service: MetricsService;

  // OS "a": 60 min (óleo + alinhamento); OS "b": 120 min (só óleo)
  const completions = [
    { ordemServicoId: 'a', historicoCriadoEm: at('2026-11-01T11:00:00Z') },
    { ordemServicoId: 'b', historicoCriadoEm: at('2026-11-01T12:00:00Z') },
  ];
  const starts = [
    { ordemServicoId: 'a', historicoCriadoEm: at('2026-11-01T10:00:00Z') },
    { ordemServicoId: 'b', historicoCriadoEm: at('2026-11-01T10:00:00Z') },
  ];
  const lines = [
    {
      ordemServicoId: 'a',
      servicoId: 's-oil',
      servico: { servicoNome: 'Troca de óleo' },
    },
    {
      ordemServicoId: 'a',
      servicoId: 's-align',
      servico: { servicoNome: 'Alinhamento' },
    },
    {
      ordemServicoId: 'b',
      servicoId: 's-oil',
      servico: { servicoNome: 'Troca de óleo' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    db.ordemServicoStatusHistorico.findMany
      .mockResolvedValueOnce(completions)
      .mockResolvedValueOnce(starts);
    db.ordemServicoServico.findMany.mockResolvedValue(lines);
    service = new MetricsService({ db } as unknown as DatabaseService);
  });

  it('should return the overall and per-service average in minutes', async () => {
    const from = at('2026-11-01T00:00:00Z');
    const to = at('2026-11-30T23:59:59Z');

    const result = await service.averageExecutionTime({ from, to });

    expect(result).toEqual({
      period: { from, to },
      averageMinutes: 90,
      serviceOrderCount: 2,
      byService: [
        {
          serviceId: 's-align',
          name: 'Alinhamento',
          averageMinutes: 60,
          serviceOrderCount: 1,
        },
        {
          serviceId: 's-oil',
          name: 'Troca de óleo',
          averageMinutes: 90,
          serviceOrderCount: 2,
        },
      ],
    });
  });

  it('should filter the completions by period on the finalization date', async () => {
    const from = at('2026-11-01T00:00:00Z');
    const to = at('2026-11-30T23:59:59Z');

    await service.averageExecutionTime({ from, to });

    expect(db.ordemServicoStatusHistorico.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        historicoStatusNovo: StatusOrdemServico.FINALIZADA,
        historicoCriadoEm: { gte: from, lte: to },
      },
      select: { ordemServicoId: true, historicoCriadoEm: true },
    });
    expect(db.ordemServicoStatusHistorico.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        ordemServicoId: { in: ['a', 'b'] },
        historicoStatusNovo: StatusOrdemServico.EM_EXECUCAO,
      },
      select: { ordemServicoId: true, historicoCriadoEm: true },
    });
  });

  it('should not filter by date and return null period when none is informed', async () => {
    const result = await service.averageExecutionTime({});

    expect(result.period).toEqual({ from: null, to: null });
    expect(db.ordemServicoStatusHistorico.findMany).toHaveBeenNthCalledWith(1, {
      where: { historicoStatusNovo: StatusOrdemServico.FINALIZADA },
      select: { ordemServicoId: true, historicoCriadoEm: true },
    });
  });

  it('should restrict to the orders that contain the service when serviceId is informed', async () => {
    db.ordemServicoServico.findMany.mockResolvedValue([lines[1]]);

    const result = await service.averageExecutionTime({ serviceId: 's-align' });

    expect(db.ordemServicoStatusHistorico.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        historicoStatusNovo: StatusOrdemServico.FINALIZADA,
        ordemServico: { servicos: { some: { servicoId: 's-align' } } },
      },
      select: { ordemServicoId: true, historicoCriadoEm: true },
    });
    expect(db.ordemServicoServico.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ordemServicoId: { in: ['a', 'b'] }, servicoId: 's-align' },
      }),
    );
    expect(result.byService).toHaveLength(1);
  });

  it('should return a null average and skip the other queries when no order finished', async () => {
    db.ordemServicoStatusHistorico.findMany.mockReset();
    db.ordemServicoStatusHistorico.findMany.mockResolvedValueOnce([]);

    const result = await service.averageExecutionTime({});

    expect(result).toEqual({
      period: { from: null, to: null },
      averageMinutes: null,
      serviceOrderCount: 0,
      byService: [],
    });
    expect(db.ordemServicoStatusHistorico.findMany).toHaveBeenCalledTimes(1);
    expect(db.ordemServicoServico.findMany).not.toHaveBeenCalled();
  });

  it('should throw UnprocessableEntityException when from is after to', async () => {
    await expect(
      service.averageExecutionTime({
        from: at('2026-12-01T00:00:00Z'),
        to: at('2026-11-01T00:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.ordemServicoStatusHistorico.findMany).not.toHaveBeenCalled();
  });
});
