-- Módulo identity (PRD-005; ADR-004/011): usuários da equipe e login do cliente (papel CUSTOMER + customer_id).

-- CreateTable
CREATE TABLE "identity"."users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "roles" VARCHAR(100) NOT NULL,
    "customer_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "identity"."users"("email");

-- CreateIndex: um login por cliente (modelo-de-dados.md §3; ADR-011) — também serve de índice da referência sem FK
CREATE UNIQUE INDEX "users_customer_id_key" ON "identity"."users"("customer_id") WHERE ("customer_id" IS NOT NULL);

-- Constraints escritas à mão (modelo-de-dados.md §3; agregados.md §3 User; glossário §5):
--   roles = papéis separados por vírgula, todos em {ATTENDANT, MECHANIC, MANAGER, CUSTOMER};
--   CUSTOMER é exclusivo e exige customer_id; equipe não tem customer_id.
ALTER TABLE "identity"."users"
    ADD CONSTRAINT "users_roles_check" CHECK ("roles" <> '' AND string_to_array("roles", ',') <@ ARRAY['ATTENDANT', 'MECHANIC', 'MANAGER', 'CUSTOMER']),
    ADD CONSTRAINT "users_customer_role_exclusive_check" CHECK ("roles" = 'CUSTOMER' OR NOT ('CUSTOMER' = ANY (string_to_array("roles", ',')))),
    ADD CONSTRAINT "users_customer_id_check" CHECK (("roles" = 'CUSTOMER') = ("customer_id" IS NOT NULL));
