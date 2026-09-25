import { Injectable } from '@nestjs/common';

import { type CustomerSummary } from '../domain/customer-summary';
import { CustomerRepository } from '../repositories/customer.repository';

// Serviço de aplicação exportado pelo módulo customers (glossário §9; ADR-003): é por ele que identity e
// service-orders enxergam um cliente. Mínimo para o walking skeleton — register/update/deactivate/findByDocument e o
// agregado Customer chegam no prompt 05 (PRD-001).
@Injectable()
export class CustomersService {
  constructor(private readonly customers: CustomerRepository) {}

  findById(id: string): Promise<CustomerSummary | null> {
    return this.customers.findById(id);
  }
}
