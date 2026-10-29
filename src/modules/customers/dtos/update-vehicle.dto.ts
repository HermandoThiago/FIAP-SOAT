import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';

// O proprietário não muda por aqui. A placa só pode ser alterada pelo Admin (PRD-001 RF-008),
// regra aplicada no VehiclesService.
export class UpdateVehicleDto extends PartialType(
  OmitType(CreateVehicleDto, ['usuarioId'] as const),
) {}
