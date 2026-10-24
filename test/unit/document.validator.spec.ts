import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TipoDocumentoUsuario } from '../../src/generated/prisma/enums';
import {
  isValidCnpj,
  isValidCpf,
  isValidDocument,
} from '../../src/modules/identity/domain/validators/document.validator';
import {
  RegisterUserDto,
  UpdateUserDto,
} from '../../src/modules/identity/dtos';

// Documentos fictícios gerados só para teste.
const VALID_CPFS = ['21093991046', '01485261015', '30949166006', '52998224725'];
const VALID_CNPJS = ['11222333000181', '45723174000110', '04252011000110'];

describe('document validator', () => {
  describe('isValidCpf', () => {
    it.each(VALID_CPFS)(
      'should accept %s when the check digits match',
      (cpf) => {
        expect(isValidCpf(cpf)).toBe(true);
      },
    );

    it.each([
      ['wrong check digit', '52998224726'],
      ['too short', '5299822472'],
      ['too long', '529982247250'],
      ['formatted', '529.982.247-25'],
      ['letters', '5299822472a'],
      ['repeated digits', '11111111111'],
      ['empty', ''],
    ])('should reject a CPF when it is %s', (_label, cpf) => {
      expect(isValidCpf(cpf)).toBe(false);
    });
  });

  describe('isValidCnpj', () => {
    it.each(VALID_CNPJS)(
      'should accept %s when the check digits match',
      (cnpj) => {
        expect(isValidCnpj(cnpj)).toBe(true);
      },
    );

    it.each([
      ['wrong check digit', '11222333000182'],
      ['too short', '1122233300018'],
      ['too long', '112223330001811'],
      ['formatted', '11.222.333/0001-81'],
      ['letters', '1122233300018a'],
      ['repeated digits', '00000000000000'],
      ['empty', ''],
    ])('should reject a CNPJ when it is %s', (_label, cnpj) => {
      expect(isValidCnpj(cnpj)).toBe(false);
    });
  });

  describe('isValidDocument', () => {
    it('should not accept a CPF as CNPJ nor the opposite', () => {
      expect(isValidDocument('CNPJ', VALID_CPFS[0])).toBe(false);
      expect(isValidDocument('CPF', VALID_CNPJS[0])).toBe(false);
    });
  });
});

describe('IsValidDocument decorator', () => {
  const base = {
    usuarioNome: 'Fulano de Tal',
    usuarioEmail: 'fulano@oficina.local',
    usuarioTipoDocumento: TipoDocumentoUsuario.CPF,
    senha: 'senha-de-teste-123',
    perfilId: '6f1c1b0e-7c7e-4f0e-9b43-1f4b3d1c8a11',
  };
  const register = (extra: Record<string, unknown>) =>
    validate(plainToInstance(RegisterUserDto, { ...base, ...extra }));
  const documentErrors = (errors: Awaited<ReturnType<typeof register>>) =>
    errors.filter((e) => e.property === 'usuarioDocumento');

  it('should accept a valid CPF when the type is CPF', async () => {
    expect(
      documentErrors(await register({ usuarioDocumento: VALID_CPFS[0] })),
    ).toHaveLength(0);
  });

  it('should accept a valid CNPJ when the type is CNPJ', async () => {
    const errors = await register({
      usuarioTipoDocumento: TipoDocumentoUsuario.CNPJ,
      usuarioDocumento: VALID_CNPJS[0],
    });

    expect(documentErrors(errors)).toHaveLength(0);
  });

  it('should strip punctuation before validating', async () => {
    const dto = plainToInstance(RegisterUserDto, {
      ...base,
      usuarioDocumento: '529.982.247-25',
    });

    expect(dto.usuarioDocumento).toBe('52998224725');
    expect(documentErrors(await validate(dto))).toHaveLength(0);
  });

  it('should reject an invalid CPF when the type is CPF', async () => {
    const errors = await register({ usuarioDocumento: '52998224726' });

    expect(documentErrors(errors)).toHaveLength(1);
  });

  it('should reject a valid CNPJ when the declared type is CPF', async () => {
    const errors = await register({ usuarioDocumento: VALID_CNPJS[0] });

    expect(documentErrors(errors)).toHaveLength(1);
  });

  it('should infer the type from the length when the type is absent', async () => {
    const validate14 = await validate(
      plainToInstance(UpdateUserDto, { usuarioDocumento: VALID_CNPJS[0] }),
    );
    const invalid11 = await validate(
      plainToInstance(UpdateUserDto, { usuarioDocumento: '52998224726' }),
    );

    expect(documentErrors(validate14)).toHaveLength(0);
    expect(documentErrors(invalid11)).toHaveLength(1);
  });
});
