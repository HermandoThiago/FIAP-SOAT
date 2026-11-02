import { StatusOrdemServico } from '../../src/generated/prisma/enums';
import {
  describeStatus,
  maskDocument,
  maskLicensePlate,
} from '../../src/modules/service-orders/domain/tracking-view';

describe('tracking view', () => {
  it.each([
    ['ABC1D23', 'ABC1***'],
    ['ABC1234', 'ABC1***'],
  ])('should mask the license plate %s as %s', (plate, masked) => {
    expect(maskLicensePlate(plate)).toBe(masked);
  });

  it('should mask a CPF keeping only the middle digits', () => {
    expect(maskDocument('52998224725')).toBe('***.982.247-**');
  });

  it('should mask a CNPJ keeping only the middle digits', () => {
    expect(maskDocument('11222333000181')).toBe('**.***.333/0001-**');
  });

  it.each(Object.values(StatusOrdemServico))(
    'should describe the status %s for the customer',
    (status) => {
      expect(describeStatus(status).statusDescription).toEqual(
        expect.any(String),
      );
    },
  );

  it('should ask for the quote answer only when awaiting approval', () => {
    const withAction = Object.values(StatusOrdemServico).filter(
      (status) =>
        describeStatus(status).nextAction === 'aprovar ou recusar o orçamento',
    );
    expect(withAction).toEqual([StatusOrdemServico.AGUARDANDO_APROVACAO]);
  });
});
