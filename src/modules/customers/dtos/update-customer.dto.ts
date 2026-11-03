import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';

/** O documento (e o tipo) é imutável: só nome, e-mail e telefone mudam. */
export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, [
    'usuarioDocumento',
    'usuarioTipoDocumento',
  ] as const),
) {}
