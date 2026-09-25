import { type ArgumentMetadata } from '@nestjs/common';

import { RegisterUserDto } from '../../../../src/modules/identity/dto/register-user.dto';
import { Role } from '../../../../src/shared/domain/role';
import { type FieldError } from '../../../../src/shared/http/problem-details';
import { createValidationPipe, RequestValidationException } from '../../../../src/shared/http/validation';

// Validação sintática de POST /users pelo mesmo ValidationPipe da aplicação (contrato-api.md §3.1/§5; PRD-005 RN-060):
// nome com trim e uma única mensagem quando falta; senha limitada a 72 BYTES (bcrypt), não a 72 caracteres.
const METADATA: ArgumentMetadata = { type: 'body', metatype: RegisterUserDto };
const NAME_REQUIRED: FieldError = { field: 'name', message: 'nome obrigatório' };
const pipe = createValidationPipe();

function validBody(): Record<string, unknown> {
  return {
    name: 'Mecânico da oficina',
    email: 'mechanic@test.oficina.local',
    password: 'mechanic-password',
    roles: [Role.MECHANIC],
  };
}

function bodyWithoutName(): Record<string, unknown> {
  const { name: _name, ...rest } = validBody();
  return rest;
}

async function errorsOf(body: unknown): Promise<FieldError[]> {
  try {
    await pipe.transform(body, METADATA);
  } catch (error) {
    if (error instanceof RequestValidationException) {
      return error.errors;
    }
    throw error;
  }
  throw new Error('expected a RequestValidationException');
}

async function transform(body: unknown): Promise<RegisterUserDto> {
  return (await pipe.transform(body, METADATA)) as RegisterUserDto;
}

describe('RegisterUserDto', () => {
  describe('name', () => {
    it('should accept the payload when all fields are valid', async () => {
      const dto = await transform(validBody());

      expect(dto).toBeInstanceOf(RegisterUserDto);
      expect(dto.name).toBe('Mecânico da oficina');
    });

    it('should reject with a single "nome obrigatório" error when the name is missing', async () => {
      await expect(errorsOf(bodyWithoutName())).resolves.toEqual([NAME_REQUIRED]);
    });

    it('should reject with a single "nome obrigatório" error when the name is null', async () => {
      await expect(errorsOf({ ...validBody(), name: null })).resolves.toEqual([NAME_REQUIRED]);
    });

    it('should reject with a single "nome obrigatório" error when the name is blank', async () => {
      await expect(errorsOf({ ...validBody(), name: '   ' })).resolves.toEqual([NAME_REQUIRED]);
    });

    it('should reject with "nome obrigatório" when the name is not a string', async () => {
      await expect(errorsOf({ ...validBody(), name: 123 })).resolves.toEqual([NAME_REQUIRED]);
    });

    it('should trim the name when it has surrounding spaces', async () => {
      const dto = await transform({ ...validBody(), name: '  Mecânico da oficina  ' });

      expect(dto.name).toBe('Mecânico da oficina');
    });

    it('should reject the name when it is longer than 120 characters', async () => {
      await expect(errorsOf({ ...validBody(), name: 'a'.repeat(121) })).resolves.toEqual([
        { field: 'name', message: 'nome deve ter no máximo 120 caracteres' },
      ]);
    });

    it('should accept the name when it has exactly 120 characters after trimming', async () => {
      const dto = await transform({ ...validBody(), name: ` ${'a'.repeat(120)} ` });

      expect(dto.name).toHaveLength(120);
    });
  });

  describe('password', () => {
    it('should reject the password when it exceeds 72 bytes even with fewer characters', async () => {
      // 40 × "é" = 40 caracteres, 80 bytes em UTF-8: passa em MaxLength(72) mas o bcrypt trunca em 72 bytes.
      await expect(errorsOf({ ...validBody(), password: 'é'.repeat(40) })).resolves.toEqual([
        { field: 'password', message: 'senha deve ter no máximo 72 bytes' },
      ]);
    });

    it('should accept the password when it has exactly 72 bytes', async () => {
      await expect(transform({ ...validBody(), password: 'a'.repeat(72) })).resolves.toMatchObject({
        password: 'a'.repeat(72),
      });
    });

    it('should reject the password when it has 73 bytes', async () => {
      await expect(errorsOf({ ...validBody(), password: 'a'.repeat(73) })).resolves.toEqual([
        { field: 'password', message: 'senha deve ter no máximo 72 bytes' },
      ]);
    });

    it('should reject the password when it is shorter than 8 characters', async () => {
      await expect(errorsOf({ ...validBody(), password: 'short' })).resolves.toEqual([
        { field: 'password', message: 'senha deve ter ao menos 8 caracteres' },
      ]);
    });
  });
});
