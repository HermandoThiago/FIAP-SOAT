import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateServiceDto } from '../../src/modules/catalog/controllers/dtos/create-service.dto';
import { ListServicesQueryDto } from '../../src/modules/catalog/controllers/dtos/list-services-query.dto';
import { UpdateServiceDto } from '../../src/modules/catalog/controllers/dtos/update-service.dto';

const valid = { servicoNome: '  Troca de óleo  ', servicoPrecoBase: 15000 };

const errorsOf = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('CreateServiceDto', () => {
  it('should trim the name and pass when the payload is valid', async () => {
    const dto = plainToInstance(CreateServiceDto, valid);

    expect(dto.servicoNome).toBe('Troca de óleo');
    expect(await validate(dto)).toHaveLength(0);
  });

  it.each([-1, 150.5, '15000'])(
    'should reject the price %p when it is not a non-negative integer in cents',
    async (price) => {
      expect(
        await errorsOf(CreateServiceDto, { ...valid, servicoPrecoBase: price }),
      ).toEqual(['servicoPrecoBase']);
    },
  );

  it('should reject the name when it is blank', async () => {
    expect(
      await errorsOf(CreateServiceDto, { ...valid, servicoNome: '   ' }),
    ).toEqual(['servicoNome']);
  });

  it('should reject the name when it is longer than 120 characters', async () => {
    expect(
      await errorsOf(CreateServiceDto, {
        ...valid,
        servicoNome: 'a'.repeat(121),
      }),
    ).toEqual(['servicoNome']);
  });
});

describe('UpdateServiceDto', () => {
  it('should accept a partial payload when only the price is sent', async () => {
    expect(
      await errorsOf(UpdateServiceDto, { servicoPrecoBase: 9000 }),
    ).toEqual([]);
  });
});

describe('ListServicesQueryDto', () => {
  it('should default to active services and convert query strings', async () => {
    const dto = plainToInstance(ListServicesQueryDto, {
      page: '2',
      servicoAtivo: 'false',
    });

    expect(dto).toMatchObject({ page: 2, pageSize: 20, servicoAtivo: false });
    expect(await validate(dto)).toHaveLength(0);
    expect(plainToInstance(ListServicesQueryDto, {}).servicoAtivo).toBe(true);
  });

  it('should reject servicoAtivo when it is not a boolean', async () => {
    expect(
      await errorsOf(ListServicesQueryDto, { servicoAtivo: 'talvez' }),
    ).toEqual(['servicoAtivo']);
  });
});
