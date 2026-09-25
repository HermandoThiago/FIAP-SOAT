-- Módulo catalog (PRD-002; ADR-012): serviços, peças/insumos e movimentações de estoque.

-- CreateTable
CREATE TABLE "catalog"."services" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."parts" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "unit_of_measure" VARCHAR(10) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "stock_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."stock_movements" (
    "id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "service_order_id" UUID,
    "reason" VARCHAR(500),
    "user_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "catalog"."services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "parts_sku_key" ON "catalog"."parts"("sku");

-- CreateIndex
CREATE INDEX "stock_movements_part_id_occurred_at_idx" ON "catalog"."stock_movements"("part_id", "occurred_at");

-- CreateIndex: referências a outros módulos (sem FK)
CREATE INDEX "stock_movements_service_order_id_idx" ON "catalog"."stock_movements"("service_order_id");

-- CreateIndex
CREATE INDEX "stock_movements_user_id_idx" ON "catalog"."stock_movements"("user_id");

-- AddForeignKey (mesmo schema)
ALTER TABLE "catalog"."stock_movements" ADD CONSTRAINT "stock_movements_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "catalog"."parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints escritas à mão (modelo-de-dados.md §3; ADR-012: stock >= 0 e 0 <= reserved <= stock)
ALTER TABLE "catalog"."services"
    ADD CONSTRAINT "services_price_check" CHECK ("price" >= 0),
    ADD CONSTRAINT "services_estimated_minutes_check" CHECK ("estimated_minutes" > 0);

ALTER TABLE "catalog"."parts"
    ADD CONSTRAINT "parts_type_check" CHECK ("type" IN ('PART', 'SUPPLY')),
    ADD CONSTRAINT "parts_unit_price_check" CHECK ("unit_price" >= 0),
    ADD CONSTRAINT "parts_stock_quantity_check" CHECK ("stock_quantity" >= 0),
    ADD CONSTRAINT "parts_reserved_quantity_check" CHECK ("reserved_quantity" >= 0 AND "reserved_quantity" <= "stock_quantity"),
    ADD CONSTRAINT "parts_minimum_stock_check" CHECK ("minimum_stock" >= 0);

ALTER TABLE "catalog"."stock_movements"
    ADD CONSTRAINT "stock_movements_type_check" CHECK ("type" IN ('INBOUND', 'OUTBOUND', 'RESERVATION', 'RELEASE', 'ADJUSTMENT')),
    ADD CONSTRAINT "stock_movements_quantity_check" CHECK ("quantity" > 0);
