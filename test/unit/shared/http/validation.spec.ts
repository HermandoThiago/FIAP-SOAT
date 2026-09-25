import { type ArgumentMetadata, type ValidationError as ClassValidatorError } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, MinLength, ValidateNested } from 'class-validator';

import {
  createValidationPipe,
  flattenValidationErrors,
  RequestValidationException,
} from '../../../../src/shared/http/validation';

// DTO de exemplo (validação sintática — contrato-api.md §4/§5); não representa nenhum módulo real.
class SampleAddressDto {
  @IsString()
  street!: string;

  @IsInt()
  @Type(() => Number)
  number!: number;
}

class SampleDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @ValidateNested()
  @Type(() => SampleAddressDto)
  address!: SampleAddressDto;
}

const BODY: ArgumentMetadata = { type: 'body', metatype: SampleDto };

const VALID_PAYLOAD = {
  name: 'Oficina Teste',
  email: 'contato@test.oficina.local',
  address: { street: 'Rua das Oficinas', number: '10' },
};

async function rejectionOf(promise: Promise<unknown>): Promise<RequestValidationException> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RequestValidationException) {
      return error;
    }
    throw error;
  }
  throw new Error('expected the validation pipe to reject');
}

describe('flattenValidationErrors', () => {
  it('should produce one entry per constraint when an error has several constraints', () => {
    const errors: ClassValidatorError[] = [
      { property: 'name', constraints: { isString: 'name must be a string', minLength: 'name is too short' } },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'name', message: 'name must be a string' },
      { field: 'name', message: 'name is too short' },
    ]);
  });

  it('should join the parent and child property with a dot when the error is nested', () => {
    const errors: ClassValidatorError[] = [
      {
        property: 'address',
        children: [{ property: 'street', constraints: { isString: 'street must be a string' } }],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([{ field: 'address.street', message: 'street must be a string' }]);
  });

  it('should build the full path when the nesting has several levels', () => {
    const errors: ClassValidatorError[] = [
      {
        property: 'customer',
        children: [
          {
            property: 'address',
            children: [{ property: 'number', constraints: { isInt: 'number must be an integer' } }],
          },
        ],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'customer.address.number', message: 'number must be an integer' },
    ]);
  });

  it('should list the own constraints before the children when both are present', () => {
    const errors: ClassValidatorError[] = [
      {
        property: 'address',
        constraints: { isDefined: 'address is required' },
        children: [{ property: 'street', constraints: { isString: 'street must be a string' } }],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'address', message: 'address is required' },
      { field: 'address.street', message: 'street must be a string' },
    ]);
  });

  it('should return an empty list when the errors have neither constraints nor children', () => {
    expect(flattenValidationErrors([{ property: 'address', children: [] }])).toEqual([]);
  });
});

describe('RequestValidationException', () => {
  it('should answer 422 with the Portuguese message and the errors when created', () => {
    const errors = [{ field: 'document', message: 'CPF inválido' }];

    const exception = new RequestValidationException(errors);

    expect(exception.getStatus()).toBe(422);
    expect(exception.getResponse()).toEqual({ message: 'Dados inválidos', errors });
    expect(exception.errors).toBe(errors);
  });
});

describe('createValidationPipe', () => {
  it('should reject with RequestValidationException when the payload is invalid', async () => {
    const pipe = createValidationPipe();

    const exception = await rejectionOf(pipe.transform({ name: 42, email: 'invalid', address: {} }, BODY));

    expect(exception.getStatus()).toBe(422);
    expect(exception.getResponse()).toEqual({ message: 'Dados inválidos', errors: exception.errors });
    expect(new Set(exception.errors.map((error) => error.field))).toEqual(
      new Set(['name', 'email', 'address.street', 'address.number']),
    );
    expect(exception.errors.every((error) => error.message.length > 0)).toBe(true);
  });

  it('should report every failed constraint when a field violates several rules', async () => {
    const pipe = createValidationPipe();

    const exception = await rejectionOf(pipe.transform({ ...VALID_PAYLOAD, name: 42 }, BODY));

    const nameErrors = exception.errors.filter((error) => error.field === 'name');
    expect(nameErrors).toHaveLength(2);
  });

  it('should report the nested field with a dotted path when the nested object is invalid', async () => {
    const pipe = createValidationPipe();

    const exception = await rejectionOf(
      pipe.transform({ ...VALID_PAYLOAD, address: { street: 7, number: 'x' } }, BODY),
    );

    expect(exception.errors.map((error) => error.field)).toEqual(['address.street', 'address.number']);
  });

  it('should strip undeclared properties when the payload has extra fields', async () => {
    const pipe = createValidationPipe();

    const result = (await pipe.transform(
      { ...VALID_PAYLOAD, extra: 'x', address: { ...VALID_PAYLOAD.address, extra: 'y' } },
      BODY,
    )) as SampleDto;

    expect(result).not.toHaveProperty('extra');
    expect(result.address).not.toHaveProperty('extra');
  });

  it('should transform the payload into DTO instances when it is valid', async () => {
    const pipe = createValidationPipe();

    const result = (await pipe.transform(VALID_PAYLOAD, BODY)) as SampleDto;

    expect(result).toBeInstanceOf(SampleDto);
    expect(result.address).toBeInstanceOf(SampleAddressDto);
  });

  it('should convert the declared types when the payload carries strings', async () => {
    const pipe = createValidationPipe();

    const result = (await pipe.transform(VALID_PAYLOAD, BODY)) as SampleDto;

    expect(result.address.number).toBe(10);
  });

  it('should keep the valid values when the payload passes', async () => {
    const pipe = createValidationPipe();

    const result = (await pipe.transform(VALID_PAYLOAD, BODY)) as SampleDto;

    expect(result).toMatchObject({ name: 'Oficina Teste', email: 'contato@test.oficina.local' });
    expect(result.address.street).toBe('Rua das Oficinas');
  });
});
