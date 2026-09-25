import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { type CustomerSummary } from '../domain/customer-summary';

// Mínimo para o walking skeleton (prompt 02, Etapa 3): o agregado Customer, o mapeamento registro ↔ agregado e os
// demais casos de uso chegam no prompt 05 (PRD-001).
@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CustomerSummary | null> {
    return this.prisma.customer.findUnique({ where: { id }, select: { id: true, name: true, active: true } });
  }
}
