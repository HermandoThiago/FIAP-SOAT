-- Um schema PostgreSQL por módulo (ADR-002; modelo-de-dados.md §2). Sem FK entre schemas: só colunas de referência.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "customers";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "service_orders";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";
