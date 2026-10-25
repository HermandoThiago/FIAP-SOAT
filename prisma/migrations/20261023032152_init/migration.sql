-- CreateEnum
CREATE TYPE "TipoDocumentoUsuario" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "StatusOrdemServico" AS ENUM ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_EXECUCAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE', 'ORCAMENTO_RECUSADO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoItemEstoque" AS ENUM ('PECA', 'INSUMO');

-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('UN', 'L', 'ML', 'KG', 'G', 'M');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoEstoque" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'RESERVA', 'LIBERACAO_RESERVA');

-- CreateTable
CREATE TABLE "Perfil" (
    "perfil_id" UUID NOT NULL,
    "perfil_nome" VARCHAR(50) NOT NULL,
    "perfil_descricao" VARCHAR(255),
    "perfil_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("perfil_id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "usuario_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,
    "usuario_nome" VARCHAR(120) NOT NULL,
    "usuario_email" VARCHAR(255) NOT NULL,
    "usuario_documento" VARCHAR(14) NOT NULL,
    "usuario_tipo_documento" "TipoDocumentoUsuario" NOT NULL,
    "usuario_telefone" VARCHAR(11),
    "usuario_ultimo_acesso" TIMESTAMPTZ(6),
    "usuario_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "UsuarioSenha" (
    "usuario_id" UUID NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "senha_salt" INTEGER,
    "senha_alterada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senha_criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioSenha_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "Veiculo" (
    "veiculo_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "veiculo_placa" VARCHAR(7) NOT NULL,
    "veiculo_chassi" VARCHAR(17),
    "veiculo_marca" VARCHAR(40) NOT NULL,
    "veiculo_modelo" VARCHAR(40) NOT NULL,
    "veiculo_ano_fabricacao" SMALLINT NOT NULL,
    "veiculo_cor" VARCHAR(30) NOT NULL,
    "veiculo_km_atual" INTEGER,
    "veiculo_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "veiculo_atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("veiculo_id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "servico_id" UUID NOT NULL,
    "servico_nome" VARCHAR(120) NOT NULL,
    "servico_descricao" VARCHAR(500),
    "servico_preco_base" INTEGER NOT NULL,
    "servico_ativo" BOOLEAN NOT NULL DEFAULT true,
    "servico_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servico_atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("servico_id")
);

-- CreateTable
CREATE TABLE "ItemEstoque" (
    "item_estoque_id" UUID NOT NULL,
    "item_estoque_tipo" "TipoItemEstoque" NOT NULL,
    "item_estoque_codigo" VARCHAR(40) NOT NULL,
    "item_estoque_nome" VARCHAR(120) NOT NULL,
    "item_estoque_descricao" VARCHAR(500),
    "item_estoque_unidade" "UnidadeMedida" NOT NULL DEFAULT 'UN',
    "item_estoque_preco_venda" INTEGER NOT NULL,
    "item_estoque_quantidade" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "item_estoque_reservada" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "item_estoque_ativo" BOOLEAN NOT NULL DEFAULT true,
    "item_estoque_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item_estoque_atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemEstoque_pkey" PRIMARY KEY ("item_estoque_id")
);

-- CreateTable
CREATE TABLE "MovimentacaoEstoque" (
    "movimentacao_id" UUID NOT NULL,
    "item_estoque_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "movimentacao_tipo" "TipoMovimentacaoEstoque" NOT NULL,
    "movimentacao_quantidade" DECIMAL(12,3) NOT NULL,
    "movimentacao_motivo" VARCHAR(255),
    "movimentacao_criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("movimentacao_id")
);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "ordem_servico_id" UUID NOT NULL,
    "ordem_servico_numero" BIGINT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "veiculo_id" UUID NOT NULL,
    "atendente_id" UUID NOT NULL,
    "mecanico_id" UUID NOT NULL,
    "ordem_servico_status" "StatusOrdemServico" NOT NULL DEFAULT 'RECEBIDA',
    "ordem_servico_descricao_problema" VARCHAR(1000),
    "ordem_servico_diagnostico" VARCHAR(2000),
    "ordem_servico_km_entrada" INTEGER,
    "ordem_servico_motivo_cancelamento" VARCHAR(500),
    "ordem_servico_criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ordem_servico_atualizada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemServico_pkey" PRIMARY KEY ("ordem_servico_id")
);

-- CreateTable
CREATE TABLE "OrdemServicoStatusHistorico" (
    "historico_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "historico_status_anterior" "StatusOrdemServico",
    "historico_status_novo" "StatusOrdemServico" NOT NULL,
    "usuario_id" UUID,
    "historico_observacao" VARCHAR(500),
    "historico_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemServicoStatusHistorico_pkey" PRIMARY KEY ("historico_id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "orcamento_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "orcamento_versao" INTEGER NOT NULL DEFAULT 1,
    "orcamento_status" "StatusOrcamento" NOT NULL DEFAULT 'RASCUNHO',
    "orcamento_valor_total" INTEGER NOT NULL DEFAULT 0,
    "orcamento_enviado_em" TIMESTAMPTZ(6),
    "orcamento_respondido_em" TIMESTAMPTZ(6),
    "orcamento_respondido_por" UUID,
    "orcamento_motivo_rejeicao" VARCHAR(500),
    "orcamento_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orcamento_atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("orcamento_id")
);

-- CreateTable
CREATE TABLE "OrdemServicoServico" (
    "os_servico_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "servico_id" UUID NOT NULL,
    "orcamento_id" UUID,
    "os_servico_quantidade" INTEGER NOT NULL DEFAULT 1,
    "os_servico_preco_unitario" INTEGER NOT NULL,
    "os_servico_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemServicoServico_pkey" PRIMARY KEY ("os_servico_id")
);

-- CreateTable
CREATE TABLE "OrdemServicoItem" (
    "os_item_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "item_estoque_id" UUID NOT NULL,
    "orcamento_id" UUID,
    "os_item_quantidade" DECIMAL(12,3) NOT NULL,
    "os_item_preco_unitario" INTEGER NOT NULL,
    "os_item_criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemServicoItem_pkey" PRIMARY KEY ("os_item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_perfil_nome_key" ON "Perfil"("perfil_nome");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_email_key" ON "Usuario"("usuario_email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_documento_key" ON "Usuario"("usuario_documento");

-- CreateIndex
CREATE INDEX "Usuario_perfil_id_idx_0e75ecf5" ON "Usuario"("perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_veiculo_placa_key" ON "Veiculo"("veiculo_placa");

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_veiculo_chassi_key" ON "Veiculo"("veiculo_chassi");

-- CreateIndex
CREATE INDEX "Veiculo_usuario_id_idx_65b6616a" ON "Veiculo"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_servico_nome_key" ON "Servico"("servico_nome");

-- CreateIndex
CREATE UNIQUE INDEX "ItemEstoque_item_estoque_codigo_key" ON "ItemEstoque"("item_estoque_codigo");

-- CreateIndex
CREATE INDEX "ItemEstoque_item_estoque_tipo_idx_3cad250b" ON "ItemEstoque"("item_estoque_tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_item_estoque_id_idx_67447c15" ON "MovimentacaoEstoque"("item_estoque_id");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_ordem_servico_id_idx_22fc9c3d" ON "MovimentacaoEstoque"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "MovimentacaoEstoque_usuario_id_idx_65b6616a" ON "MovimentacaoEstoque"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_ordem_servico_numero_key" ON "OrdemServico"("ordem_servico_numero");

-- CreateIndex
CREATE INDEX "OrdemServico_usuario_id_idx_65b6616a" ON "OrdemServico"("usuario_id");

-- CreateIndex
CREATE INDEX "OrdemServico_veiculo_id_idx_b9d7a88f" ON "OrdemServico"("veiculo_id");

-- CreateIndex
CREATE INDEX "OrdemServico_mecanico_id_idx_2a95f1b9" ON "OrdemServico"("mecanico_id");

-- CreateIndex
CREATE INDEX "OrdemServico_ordem_servico_status_idx_580e6243" ON "OrdemServico"("ordem_servico_status");

-- CreateIndex
CREATE INDEX "OrdemServico_atendente_id_idx_bc37ffcb" ON "OrdemServico"("atendente_id");

-- CreateIndex
CREATE INDEX "os_historico_os_criado_idx_f503259f" ON "OrdemServicoStatusHistorico"("ordem_servico_id", "historico_criado_em");

-- CreateIndex
CREATE INDEX "OrdemServicoStatusHistorico_ordem_servico_id_idx_22fc9c3d" ON "OrdemServicoStatusHistorico"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "OrdemServicoStatusHistorico_usuario_id_idx_65b6616a" ON "OrdemServicoStatusHistorico"("usuario_id");

-- CreateIndex
CREATE INDEX "Orcamento_orcamento_status_idx_da38468c" ON "Orcamento"("orcamento_status");

-- CreateIndex
CREATE INDEX "Orcamento_orcamento_respondido_por_idx_af278654" ON "Orcamento"("orcamento_respondido_por");

-- CreateIndex
CREATE INDEX "Orcamento_ordem_servico_id_idx_22fc9c3d" ON "Orcamento"("ordem_servico_id");

-- CreateIndex
CREATE UNIQUE INDEX "Orcamento_ordem_servico_id_orcamento_versao_key" ON "Orcamento"("ordem_servico_id", "orcamento_versao");

-- CreateIndex
CREATE INDEX "OrdemServicoServico_ordem_servico_id_idx_22fc9c3d" ON "OrdemServicoServico"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "OrdemServicoServico_servico_id_idx_d1abf681" ON "OrdemServicoServico"("servico_id");

-- CreateIndex
CREATE INDEX "OrdemServicoServico_orcamento_id_idx_5a304956" ON "OrdemServicoServico"("orcamento_id");

-- CreateIndex
CREATE INDEX "OrdemServicoItem_ordem_servico_id_idx_22fc9c3d" ON "OrdemServicoItem"("ordem_servico_id");

-- CreateIndex
CREATE INDEX "OrdemServicoItem_item_estoque_id_idx_67447c15" ON "OrdemServicoItem"("item_estoque_id");

-- CreateIndex
CREATE INDEX "OrdemServicoItem_orcamento_id_idx_5a304956" ON "OrdemServicoItem"("orcamento_id");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "Perfil"("perfil_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UsuarioSenha" ADD CONSTRAINT "UsuarioSenha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Veiculo" ADD CONSTRAINT "Veiculo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_item_estoque_id_fkey" FOREIGN KEY ("item_estoque_id") REFERENCES "ItemEstoque"("item_estoque_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "Veiculo"("veiculo_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_atendente_id_fkey" FOREIGN KEY ("atendente_id") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_mecanico_id_fkey" FOREIGN KEY ("mecanico_id") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoStatusHistorico" ADD CONSTRAINT "OrdemServicoStatusHistorico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoStatusHistorico" ADD CONSTRAINT "OrdemServicoStatusHistorico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_orcamento_respondido_por_fkey" FOREIGN KEY ("orcamento_respondido_por") REFERENCES "Usuario"("usuario_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoServico" ADD CONSTRAINT "OrdemServicoServico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoServico" ADD CONSTRAINT "OrdemServicoServico_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "Servico"("servico_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoServico" ADD CONSTRAINT "OrdemServicoServico_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Orcamento"("orcamento_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoItem" ADD CONSTRAINT "OrdemServicoItem_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoItem" ADD CONSTRAINT "OrdemServicoItem_item_estoque_id_fkey" FOREIGN KEY ("item_estoque_id") REFERENCES "ItemEstoque"("item_estoque_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoItem" ADD CONSTRAINT "OrdemServicoItem_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Orcamento"("orcamento_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Regra que o schema Prisma não expressa (preservada do modelo anterior).
ALTER TABLE "ItemEstoque" ADD CONSTRAINT "item_estoque_quantidade_nao_negativa_b8f51f10" CHECK (item_estoque_quantidade >= 0);
