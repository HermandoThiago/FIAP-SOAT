import { randomUUID } from 'node:crypto';

import { type PrismaService } from '../../src/shared/prisma/prisma.service';
import { randomEmail, randomPhone, validCpf } from './generators';

// Clientes fictícios dos testes de integração/BDD, gravados direto no banco enquanto o módulo customers não tem
// cadastro (prompt 05). O nome sempre começa com o prefixo, e é por ele que deleteTestCustomers limpa a tabela.
export const TEST_CUSTOMER_NAME_PREFIX = 'Cliente fictício';

export interface TestCustomerOverrides {
  id?: string;
  active?: boolean;
}

/** Cria um cliente pessoa física ativo (CPF válido gerado) e devolve o id. */
export async function createCustomer(prisma: PrismaService, overrides: TestCustomerOverrides = {}): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await prisma.customer.create({
    data: {
      id,
      customerType: 'INDIVIDUAL',
      document: validCpf(),
      name: `${TEST_CUSTOMER_NAME_PREFIX} de teste`,
      email: randomEmail(),
      phone: randomPhone(),
      active: overrides.active ?? true,
    },
  });
  return id;
}

export async function deleteTestCustomers(prisma: PrismaService): Promise<void> {
  await prisma.customer.deleteMany({ where: { name: { startsWith: TEST_CUSTOMER_NAME_PREFIX } } });
}
