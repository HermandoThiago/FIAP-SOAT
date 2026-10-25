-- DropForeignKey
ALTER TABLE "Orcamento" DROP CONSTRAINT "Orcamento_ordem_servico_id_fkey";

-- DropForeignKey
ALTER TABLE "OrdemServicoItem" DROP CONSTRAINT "OrdemServicoItem_orcamento_id_fkey";

-- DropForeignKey
ALTER TABLE "OrdemServicoItem" DROP CONSTRAINT "OrdemServicoItem_ordem_servico_id_fkey";

-- DropForeignKey
ALTER TABLE "OrdemServicoServico" DROP CONSTRAINT "OrdemServicoServico_orcamento_id_fkey";

-- DropForeignKey
ALTER TABLE "OrdemServicoServico" DROP CONSTRAINT "OrdemServicoServico_ordem_servico_id_fkey";

-- DropForeignKey
ALTER TABLE "OrdemServicoStatusHistorico" DROP CONSTRAINT "OrdemServicoStatusHistorico_ordem_servico_id_fkey";

-- DropForeignKey
ALTER TABLE "UsuarioSenha" DROP CONSTRAINT "UsuarioSenha_usuario_id_fkey";

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "usuario_ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "usuario_inativado_em" TIMESTAMPTZ(6);

-- AddForeignKey
ALTER TABLE "UsuarioSenha" ADD CONSTRAINT "UsuarioSenha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("usuario_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoStatusHistorico" ADD CONSTRAINT "OrdemServicoStatusHistorico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoServico" ADD CONSTRAINT "OrdemServicoServico_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoServico" ADD CONSTRAINT "OrdemServicoServico_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Orcamento"("orcamento_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoItem" ADD CONSTRAINT "OrdemServicoItem_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "OrdemServico"("ordem_servico_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrdemServicoItem" ADD CONSTRAINT "OrdemServicoItem_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "Orcamento"("orcamento_id") ON DELETE CASCADE ON UPDATE NO ACTION;
