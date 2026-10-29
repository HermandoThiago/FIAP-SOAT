import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
} from '../../src/modules/customers/dtos';

const valid = {
  usuarioId: '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11',
  veiculoPlaca: 'abc-1d23',
  veiculoMarca: 'Fiat',
  veiculoModelo: 'Argo',
  veiculoAnoFabricacao: 2022,
  veiculoCor: 'Prata',
};

const errorsOf = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('CreateVehicleDto', () => {
  it('should normalize the plate and pass when the payload is valid', async () => {
    const dto = plainToInstance(CreateVehicleDto, valid);

    expect(dto.veiculoPlaca).toBe('ABC1D23');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should reject the plate when it is invalid', async () => {
    expect(
      await errorsOf(CreateVehicleDto, { ...valid, veiculoPlaca: 'AB12345' }),
    ).toEqual(['veiculoPlaca']);
  });

  it('should reject the year when it is after next year', async () => {
    expect(
      await errorsOf(CreateVehicleDto, {
        ...valid,
        veiculoAnoFabricacao: new Date().getUTCFullYear() + 2,
      }),
    ).toEqual(['veiculoAnoFabricacao']);
  });

  it('should reject the chassis when it does not have 17 characters', async () => {
    expect(
      await errorsOf(CreateVehicleDto, { ...valid, veiculoChassi: '123' }),
    ).toEqual(['veiculoChassi']);
  });

  it('should require the owner when usuarioId is missing', async () => {
    const { usuarioId: _, ...withoutOwner } = valid;
    expect(await errorsOf(CreateVehicleDto, withoutOwner)).toEqual([
      'usuarioId',
    ]);
  });
});

describe('UpdateVehicleDto', () => {
  it('should accept a partial payload when only some fields are sent', async () => {
    expect(await errorsOf(UpdateVehicleDto, { veiculoCor: 'Azul' })).toEqual(
      [],
    );
  });

  it('should still validate the plate when it is sent', async () => {
    expect(
      await errorsOf(UpdateVehicleDto, { veiculoPlaca: 'invalida' }),
    ).toEqual(['veiculoPlaca']);
  });
});
