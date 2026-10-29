-- Exclusão lógica de veículos (PRD-001 RF-009) e constraints do modelo de dados (§3).

-- AlterTable
ALTER TABLE "Veiculo" ADD COLUMN     "veiculo_ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "veiculo_inativado_em" TIMESTAMPTZ(6);

-- DropIndex: placa e chassi deixam de ser únicos na tabela inteira...
DROP INDEX "Veiculo_veiculo_placa_key";
DROP INDEX "Veiculo_veiculo_chassi_key";

-- CreateIndex
CREATE INDEX "Veiculo_veiculo_placa_idx" ON "Veiculo"("veiculo_placa");

-- ...e passam a ser únicos só entre veículos ativos (RN-004). Escrito à mão: o Prisma não modela índice parcial.
CREATE UNIQUE INDEX "Veiculo_veiculo_placa_active_key" ON "Veiculo"("veiculo_placa") WHERE "veiculo_ativo";
CREATE UNIQUE INDEX "Veiculo_veiculo_chassi_active_key" ON "Veiculo"("veiculo_chassi") WHERE "veiculo_ativo" AND "veiculo_chassi" IS NOT NULL;

-- Defesa em profundidade (modelo-de-dados §3). O teto "ano atual + 1" (RN-005) é validado na aplicação.
ALTER TABLE "Veiculo" ADD CONSTRAINT "Veiculo_ano_fabricacao_check" CHECK ("veiculo_ano_fabricacao" BETWEEN 1900 AND 2100);
ALTER TABLE "Veiculo" ADD CONSTRAINT "Veiculo_placa_format_check" CHECK ("veiculo_placa" ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$');
