-- CreateTable
CREATE TABLE "SessaoRefresh" (
    "sessao_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sessao_token_hash" VARCHAR(64) NOT NULL,
    "sessao_familia_id" UUID NOT NULL,
    "sessao_expira_em" TIMESTAMPTZ(6) NOT NULL,
    "sessao_revogada_em" TIMESTAMPTZ(6),
    "sessao_criada_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoRefresh_pkey" PRIMARY KEY ("sessao_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessaoRefresh_sessao_token_hash_key" ON "SessaoRefresh"("sessao_token_hash");

-- CreateIndex
CREATE INDEX "SessaoRefresh_usuario_id_idx" ON "SessaoRefresh"("usuario_id");

-- CreateIndex
CREATE INDEX "SessaoRefresh_sessao_familia_id_idx" ON "SessaoRefresh"("sessao_familia_id");

-- AddForeignKey
ALTER TABLE "SessaoRefresh" ADD CONSTRAINT "SessaoRefresh_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("usuario_id") ON DELETE CASCADE ON UPDATE NO ACTION;

