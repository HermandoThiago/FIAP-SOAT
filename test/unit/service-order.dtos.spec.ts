import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateServiceOrderDto } from '../../src/modules/service-orders/controllers/dtos';

const base = {
  veiculoId: '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11',
  mecanicoId: '7f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a12',
};
const clientId = '8f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a13';

const errorsOf = async (body: object) =>
  (await validate(plainToInstance(CreateServiceOrderDto, body))).map(
    (e) => e.property,
  );

describe('CreateServiceOrderDto (cliente por id ou por documento)', () => {
  it('should accept clientId alone', async () => {
    expect(await errorsOf({ ...base, clientId })).toEqual([]);
  });

  it('should accept a valid CPF alone and strip its punctuation', async () => {
    const dto = plainToInstance(CreateServiceOrderDto, {
      ...base,
      customerDocument: '529.982.247-25',
    });

    expect(dto.customerDocument).toBe('52998224725');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should accept a valid CNPJ', async () => {
    expect(
      await errorsOf({ ...base, customerDocument: '11.222.333/0001-81' }),
    ).toEqual([]);
  });

  it('should reject a document with invalid check digits', async () => {
    expect(
      await errorsOf({ ...base, customerDocument: '52998224724' }),
    ).toContain('customerDocument');
  });

  it('should still validate clientId when both are informed', async () => {
    expect(
      await errorsOf({
        ...base,
        clientId: 'not-a-uuid',
        customerDocument: '52998224725',
      }),
    ).toContain('clientId');
  });

  it('should reject an invalid vehicle id', async () => {
    expect(await errorsOf({ ...base, clientId, veiculoId: 'x' })).toContain(
      'veiculoId',
    );
  });
});
