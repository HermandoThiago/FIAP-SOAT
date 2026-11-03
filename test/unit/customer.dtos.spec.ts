import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from '../../src/modules/customers/dtos';

const valid = {
  usuarioNome: '  Maria da Silva ',
  usuarioEmail: ' Maria@Example.com ',
  usuarioDocumento: '529.982.247-25',
  usuarioTipoDocumento: 'CPF',
  usuarioTelefone: '(85) 99999-0000',
};

const errorsOf = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('CreateCustomerDto', () => {
  it('should normalize name, e-mail, document and phone when the payload is valid', async () => {
    const dto = plainToInstance(CreateCustomerDto, valid);

    expect(dto.usuarioNome).toBe('Maria da Silva');
    expect(dto.usuarioEmail).toBe('maria@example.com');
    expect(dto.usuarioDocumento).toBe('52998224725');
    expect(dto.usuarioTelefone).toBe('85999990000');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should accept a valid CNPJ and no phone', async () => {
    const body = {
      ...valid,
      usuarioDocumento: '11.222.333/0001-81',
      usuarioTipoDocumento: 'CNPJ',
      usuarioTelefone: undefined,
    };

    expect(await errorsOf(CreateCustomerDto, body)).toEqual([]);
  });

  it('should reject a CPF with invalid check digits', async () => {
    expect(
      await errorsOf(CreateCustomerDto, {
        ...valid,
        usuarioDocumento: '52998224724',
      }),
    ).toContain('usuarioDocumento');
  });

  it('should reject a CNPJ declared as CPF', async () => {
    expect(
      await errorsOf(CreateCustomerDto, {
        ...valid,
        usuarioDocumento: '11222333000181',
      }),
    ).toContain('usuarioDocumento');
  });

  it('should reject an invalid e-mail, document type and phone', async () => {
    const errors = await errorsOf(CreateCustomerDto, {
      ...valid,
      usuarioEmail: 'not-an-email',
      usuarioTipoDocumento: 'RG',
      usuarioTelefone: '123',
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'usuarioEmail',
        'usuarioTipoDocumento',
        'usuarioTelefone',
      ]),
    );
  });

  it('should reject a blank name', async () => {
    expect(
      await errorsOf(CreateCustomerDto, { ...valid, usuarioNome: '   ' }),
    ).toContain('usuarioNome');
  });
});

describe('UpdateCustomerDto', () => {
  it('should accept a partial payload', async () => {
    expect(
      await errorsOf(UpdateCustomerDto, { usuarioTelefone: '85999990000' }),
    ).toEqual([]);
  });

  it('should drop the document, which is immutable, with the global whitelist pipe', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    const dto = (await pipe.transform(
      { usuarioNome: 'Maria', usuarioDocumento: '52998224725' },
      { type: 'body', metatype: UpdateCustomerDto },
    )) as UpdateCustomerDto;

    expect(dto).not.toHaveProperty('usuarioDocumento');
    expect(dto.usuarioNome).toBe('Maria');
  });
});

describe('ListCustomersQueryDto', () => {
  it('should apply the pagination defaults and strip the document punctuation', async () => {
    const dto = plainToInstance(ListCustomersQueryDto, {
      usuarioDocumento: '529.982.247-25',
    });

    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
    expect(dto.usuarioDocumento).toBe('52998224725');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should reject a page size above the limit', async () => {
    expect(
      await errorsOf(ListCustomersQueryDto, { pageSize: '101' }),
    ).toContain('pageSize');
  });
});
