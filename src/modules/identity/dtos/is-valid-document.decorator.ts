import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import {
  DocumentType,
  isValidDocument,
} from '../domain/validators/document.validator';

// Valida o documento conforme `usuarioTipoDocumento`. Sem o tipo no payload (ex.: PATCH parcial),
// o tipo é inferido pelo tamanho: 11 dígitos = CPF, 14 = CNPJ.
export function IsValidDocument(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidDocument',
      target: target.constructor,
      propertyName,
      options: {
        message: ({ object }: ValidationArguments) =>
          `Documento inválido para ${resolveType(object as Record<string, unknown>, undefined) ?? 'CPF/CNPJ'}`,
        ...options,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          const type = resolveType(
            args.object as Record<string, unknown>,
            value,
          );
          return type !== undefined && isValidDocument(type, value);
        },
      },
    });
  };
}

function resolveType(
  object: Record<string, unknown>,
  value: string | undefined,
): DocumentType | undefined {
  const declared = object['usuarioTipoDocumento'];
  if (declared === 'CPF' || declared === 'CNPJ') return declared;

  if (value?.length === 11) return 'CPF';
  if (value?.length === 14) return 'CNPJ';
  return undefined;
}
