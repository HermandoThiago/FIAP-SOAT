import { Module } from '@nestjs/common';

import { CustomerRepository } from './repositories/customer.repository';
import { CustomersService } from './services/customers.service';

// Módulo `customers` (contextos-delimitados.md §4). Camadas: controllers/ + dto/ → services/ → repositories/, sobre domain/
// (ADR-003). Por ora só o CustomersService mínimo exportado (walking skeleton); controllers, domínio e VehiclesService
// chegam no prompt 05.
@Module({
  providers: [CustomersService, CustomerRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
