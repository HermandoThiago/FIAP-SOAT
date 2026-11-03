-- AlterTable
CREATE SEQUENCE ordemservico_ordem_servico_numero_seq;
ALTER TABLE "OrdemServico" ALTER COLUMN "ordem_servico_numero" SET DEFAULT nextval('ordemservico_ordem_servico_numero_seq');
ALTER SEQUENCE ordemservico_ordem_servico_numero_seq OWNED BY "OrdemServico"."ordem_servico_numero";
