-- Módulo service_orders (PRD-003/004; ADR-009/010): OS, itens com snapshot, histórico de status e sequência anual.

-- Sequência anual do número da OS (OS-AAAA-NNNNNN — ADR-009). O reset anual é operacional:
--   ALTER SEQUENCE "service_orders"."service_order_number_seq" RESTART WITH 1;
CREATE SEQUENCE "service_orders"."service_order_number_seq"
    AS INTEGER
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 999999
    START WITH 1
    NO CYCLE;

-- CreateTable
CREATE TABLE "service_orders"."service_orders" (
    "id" UUID NOT NULL,
    "number" VARCHAR(14) NOT NULL,
    "customer_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "problem_description" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "quote_total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quote_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "quote_sent_at" TIMESTAMPTZ(6),
    "quote_responded_at" TIMESTAMPTZ(6),
    "rejection_or_cancellation_reason" VARCHAR(500),
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "diagnosis_started_at" TIMESTAMPTZ(6),
    "execution_started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders"."service_order_service_items" (
    "id" UUID NOT NULL,
    "service_order_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "name_snapshot" VARCHAR(200) NOT NULL,
    "price_snapshot" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "service_order_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders"."service_order_part_items" (
    "id" UUID NOT NULL,
    "service_order_id" UUID NOT NULL,
    "part_id" UUID NOT NULL,
    "name_snapshot" VARCHAR(200) NOT NULL,
    "unit_price_snapshot" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "service_order_part_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders"."service_order_status_history" (
    "id" UUID NOT NULL,
    "service_order_id" UUID NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30) NOT NULL,
    "actor" VARCHAR(36) NOT NULL,
    "reason" VARCHAR(500),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: número legível único (ADR-009); o formato é garantido pelo CHECK service_orders_number_format_check abaixo
CREATE UNIQUE INDEX "service_orders_number_key" ON "service_orders"."service_orders"("number");

-- CreateIndex: referências a outros módulos (sem FK)
CREATE INDEX "service_orders_customer_id_idx" ON "service_orders"."service_orders"("customer_id");

-- CreateIndex
CREATE INDEX "service_orders_vehicle_id_idx" ON "service_orders"."service_orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "service_orders_created_by_idx" ON "service_orders"."service_orders"("created_by");

-- CreateIndex: fila por status ordenada pelo recebimento (modelo-de-dados.md §4)
CREATE INDEX "service_orders_status_received_at_idx" ON "service_orders"."service_orders"("status", "received_at");

-- CreateIndex: no máximo 1 OS em aberto por veículo, i.e. status NOT IN ('DELIVERED','CANCELLED') (modelo-de-dados.md §3;
-- PRD-003 RN-039). Predicado escrito na forma que o PostgreSQL devolve ao deparsear, igual ao raw() do schema.prisma
CREATE UNIQUE INDEX "service_orders_vehicle_id_open_key" ON "service_orders"."service_orders"("vehicle_id") WHERE (((status)::text <> 'DELIVERED'::text) AND ((status)::text <> 'CANCELLED'::text));

-- CreateIndex
CREATE INDEX "service_order_service_items_service_order_id_idx" ON "service_orders"."service_order_service_items"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_service_items_service_id_idx" ON "service_orders"."service_order_service_items"("service_id");

-- CreateIndex
CREATE INDEX "service_order_part_items_service_order_id_idx" ON "service_orders"."service_order_part_items"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_part_items_part_id_idx" ON "service_orders"."service_order_part_items"("part_id");

-- CreateIndex: histórico em ordem cronológica por OS (modelo-de-dados.md §3)
CREATE INDEX "service_order_status_history_service_order_id_occurred_at_idx" ON "service_orders"."service_order_status_history"("service_order_id", "occurred_at");

-- AddForeignKey (mesmo schema; itens e histórico pertencem ao agregado)
ALTER TABLE "service_orders"."service_order_service_items" ADD CONSTRAINT "service_order_service_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"."service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders"."service_order_part_items" ADD CONSTRAINT "service_order_part_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"."service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders"."service_order_status_history" ADD CONSTRAINT "service_order_status_history_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"."service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints escritas à mão (modelo-de-dados.md §3; número OS-AAAA-NNNNNN / ADR-009 — defesa em profundidade do VO
-- ServiceOrderNumber; status da PRD-004 §2 / ADR-010; QuoteStatus do glossário §2)
ALTER TABLE "service_orders"."service_orders"
    ADD CONSTRAINT "service_orders_number_format_check" CHECK ("number" ~ '^OS-[0-9]{4}-[0-9]{6}$'),
    ADD CONSTRAINT "service_orders_status_check" CHECK ("status" IN ('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED')),
    ADD CONSTRAINT "service_orders_quote_status_check" CHECK ("quote_status" IN ('PENDING', 'SENT', 'APPROVED', 'REJECTED')),
    ADD CONSTRAINT "service_orders_quote_total_amount_check" CHECK ("quote_total_amount" >= 0),
    ADD CONSTRAINT "service_orders_version_check" CHECK ("version" >= 1);

ALTER TABLE "service_orders"."service_order_service_items"
    ADD CONSTRAINT "service_order_service_items_quantity_check" CHECK ("quantity" > 0),
    ADD CONSTRAINT "service_order_service_items_price_snapshot_check" CHECK ("price_snapshot" >= 0);

ALTER TABLE "service_orders"."service_order_part_items"
    ADD CONSTRAINT "service_order_part_items_quantity_check" CHECK ("quantity" > 0),
    ADD CONSTRAINT "service_order_part_items_unit_price_snapshot_check" CHECK ("unit_price_snapshot" >= 0);

-- from_status é nulo só na criação da OS (— → RECEIVED, PRD-004 §2)
ALTER TABLE "service_orders"."service_order_status_history"
    ADD CONSTRAINT "service_order_status_history_from_status_check" CHECK ("from_status" IS NULL OR "from_status" IN ('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED')),
    ADD CONSTRAINT "service_order_status_history_to_status_check" CHECK ("to_status" IN ('RECEIVED', 'IN_DIAGNOSIS', 'AWAITING_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'));
