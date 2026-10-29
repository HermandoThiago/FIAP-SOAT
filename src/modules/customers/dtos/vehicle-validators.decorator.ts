import { ValidationOptions, registerDecorator } from 'class-validator';
import {
  MIN_VEHICLE_YEAR,
  isValidLicensePlate,
  isValidVehicleYear,
  maxVehicleYear,
} from '../domain/validators';

/** Placa no padrão antigo (AAA9999) ou Mercosul (AAA9A99). Espera o valor já normalizado. */
export function IsValidLicensePlate(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidLicensePlate',
      target: target.constructor,
      propertyName,
      options: {
        message:
          'Placa inválida: use o padrão antigo (AAA9999) ou Mercosul (AAA9A99)',
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidLicensePlate(value),
      },
    });
  };
}

/** Ano entre 1900 e o ano atual + 1 (o teto é calculado a cada validação). */
export function IsValidVehicleYear(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidVehicleYear',
      target: target.constructor,
      propertyName,
      options: {
        message: () =>
          `O ano deve estar entre ${MIN_VEHICLE_YEAR} e ${maxVehicleYear()}`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'number' && isValidVehicleYear(value),
      },
    });
  };
}
