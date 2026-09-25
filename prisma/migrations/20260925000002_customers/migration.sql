-- Módulo customers (PRD-001): clientes e veículos. Ids UUID v4 gerados na aplicação (ADR-009) — sem DEFAULT.

-- CreateTable
CREATE TABLE "customers"."customers" (
    "id" UUID NOT NULL,
    "customer_type" VARCHAR(20) NOT NULL,
    "document" VARCHAR(14) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(11),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers"."vehicles" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "license_plate" VARCHAR(7) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "year" INTEGER NOT NULL,
    "color" VARCHAR(50),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: documento único entre clientes ativos (modelo-de-dados.md §3; PRD-001 RN-003)
CREATE UNIQUE INDEX "customers_document_active_key" ON "customers"."customers"("document") WHERE ("active" = true);

-- CreateIndex
CREATE INDEX "vehicles_customer_id_idx" ON "customers"."vehicles"("customer_id");

-- CreateIndex: placa única entre veículos ativos (modelo-de-dados.md §3)
CREATE UNIQUE INDEX "vehicles_license_plate_active_key" ON "customers"."vehicles"("license_plate") WHERE ("active" = true);

-- AddForeignKey (mesmo schema)
ALTER TABLE "customers"."vehicles" ADD CONSTRAINT "vehicles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints escritas à mão (modelo-de-dados.md §3 — defesa em profundidade; o Prisma não modela CHECK)
ALTER TABLE "customers"."customers"
    ADD CONSTRAINT "customers_customer_type_check" CHECK ("customer_type" IN ('INDIVIDUAL', 'COMPANY')),
    ADD CONSTRAINT "customers_document_length_check" CHECK (length("document") IN (11, 14));

ALTER TABLE "customers"."vehicles"
    ADD CONSTRAINT "vehicles_year_check" CHECK ("year" BETWEEN 1900 AND 2100);
