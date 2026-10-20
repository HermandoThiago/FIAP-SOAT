#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6aee47636293b275ce495da3bfcbc73ecd931ba90831d682c6a7c3cf994369a4/contract';
import endContract from '../../snapshots/6aee47636293b275ce495da3bfcbc73ecd931ba90831d682c6a7c3cf994369a4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a51b4833fdaffe730572670ccc27dd89af7e0726ab3de7f428d21702d687cc15/contract';
import startContract from '../../snapshots/a51b4833fdaffe730572670ccc27dd89af7e0726ab3de7f428d21702d687cc15/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Post' }),
      this.dropTable({ schema: 'public', table: 'User' }),
      this.createTable({
        schema: 'public',
        table: 'ItemEstoque',
        columns: [
          col('item_estoque_ativo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('item_estoque_atualizado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('item_estoque_codigo', 'character varying(40)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 40 } },
          }),
          col('item_estoque_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('item_estoque_descricao', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('item_estoque_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('item_estoque_nome', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('item_estoque_preco_venda', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('item_estoque_quantidade', 'numeric(12,3)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 3 } },
          }),
          col('item_estoque_reservada', 'numeric(12,3)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 3 } },
          }),
          col('item_estoque_tipo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('item_estoque_unidade', 'text', {
            notNull: true,
            default: lit('UN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['item_estoque_id']),
          checkExpression(
            'ItemEstoque_item_estoque_tipo_check_b24fdb8e',
            `"item_estoque_tipo" IN ('PECA', 'INSUMO')`,
          ),
          checkExpression(
            'ItemEstoque_item_estoque_unidade_check_65c10492',
            `"item_estoque_unidade" IN ('UN', 'L', 'ML', 'KG', 'G', 'M')`,
          ),
          checkExpression(
            'item_estoque_quantidade_nao_negativa_b8f51f10',
            'item_estoque_quantidade >= 0',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'MovimentacaoEstoque',
        columns: [
          col('item_estoque_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('movimentacao_criada_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('movimentacao_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('movimentacao_motivo', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('movimentacao_quantidade', 'numeric(12,3)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 3 } },
          }),
          col('movimentacao_tipo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ordem_servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('usuario_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['movimentacao_id']),
          checkExpression(
            'MovimentacaoEstoque_movimentacao_tipo_check_54fc0ba1',
            `"movimentacao_tipo" IN ('ENTRADA', 'SAIDA', 'AJUSTE', 'RESERVA', 'LIBERACAO_RESERVA')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Orcamento',
        columns: [
          col('orcamento_atualizado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('orcamento_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('orcamento_enviado_em', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('orcamento_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('orcamento_motivo_rejeicao', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('orcamento_respondido_em', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('orcamento_respondido_por', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('orcamento_status', 'text', {
            notNull: true,
            default: lit('RASCUNHO'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('orcamento_valor_total', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('orcamento_versao', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('ordem_servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['orcamento_id']),
          checkExpression(
            'Orcamento_orcamento_status_check_fd63cb52',
            `"orcamento_status" IN ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'OrdemServico',
        columns: [
          col('atendente_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('mecanico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ordem_servico_atualizada_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('ordem_servico_criada_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('ordem_servico_descricao_problema', 'character varying(1000)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 1000 } },
          }),
          col('ordem_servico_diagnostico', 'character varying(2000)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 2000 } },
          }),
          col('ordem_servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ordem_servico_km_entrada', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('ordem_servico_motivo_cancelamento', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('ordem_servico_numero', 'int8', {
            notNull: true,
            codecRef: { codecId: 'pg/int8number@1' },
          }),
          col('ordem_servico_status', 'text', {
            notNull: true,
            default: lit('RECEBIDA'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('usuario_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('veiculo_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['ordem_servico_id']),
          checkExpression(
            'OrdemServico_ordem_servico_status_check_5efc435f',
            `"ordem_servico_status" IN ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_EXECUCAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE', 'ORCAMENTO_RECUSADO', 'CANCELADA')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'OrdemServicoItem',
        columns: [
          col('item_estoque_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('orcamento_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('ordem_servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('os_item_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('os_item_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('os_item_preco_unitario', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('os_item_quantidade', 'numeric(12,3)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 3 } },
          }),
        ],
        constraints: [primaryKey(['os_item_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'OrdemServicoServico',
        columns: [
          col('orcamento_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('ordem_servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('os_servico_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('os_servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('os_servico_preco_unitario', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('os_servico_quantidade', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['os_servico_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'OrdemServicoStatusHistorico',
        columns: [
          col('historico_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('historico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('historico_observacao', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('historico_status_anterior', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('historico_status_novo', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ordem_servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('usuario_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['historico_id']),
          checkExpression(
            'OrdemServicoStatusHistorico_historico_status_anterior__e9135d66',
            `"historico_status_anterior" IN ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_EXECUCAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE', 'ORCAMENTO_RECUSADO', 'CANCELADA')`,
          ),
          checkExpression(
            'OrdemServicoStatusHistorico_historico_status_novo_chec_f676cc9a',
            `"historico_status_novo" IN ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_EXECUCAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE', 'ORCAMENTO_RECUSADO', 'CANCELADA')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Perfil',
        columns: [
          col('perfil_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('perfil_descricao', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('perfil_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('perfil_nome', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
        ],
        constraints: [primaryKey(['perfil_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Servico',
        columns: [
          col('servico_ativo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('servico_atualizado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('servico_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('servico_descricao', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('servico_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('servico_nome', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('servico_preco_base', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['servico_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Usuario',
        columns: [
          col('perfil_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('usuario_atualizado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('usuario_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('usuario_documento', 'character varying(14)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 14 } },
          }),
          col('usuario_email', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('usuario_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('usuario_nome', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('usuario_telefone', 'character varying(11)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 11 } },
          }),
          col('usuario_tipo_documento', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('usuario_ultimo_acesso', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
        ],
        constraints: [
          primaryKey(['usuario_id']),
          checkExpression(
            'Usuario_usuario_tipo_documento_check_ac0df0e9',
            `"usuario_tipo_documento" IN ('CPF', 'CNPJ')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'UsuarioSenha',
        columns: [
          col('senha_alterada_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('senha_criada_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('senha_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('senha_salt', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('usuario_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['usuario_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Veiculo',
        columns: [
          col('usuario_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('veiculo_ano_fabricacao', 'int2', {
            notNull: true,
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('veiculo_atualizado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('veiculo_chassi', 'character varying(17)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 17 } },
          }),
          col('veiculo_cor', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('veiculo_criado_em', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
          col('veiculo_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('veiculo_km_atual', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('veiculo_marca', 'character varying(40)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 40 } },
          }),
          col('veiculo_modelo', 'character varying(40)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 40 } },
          }),
          col('veiculo_placa', 'character varying(7)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 7 } },
          }),
        ],
        constraints: [primaryKey(['veiculo_id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ItemEstoque',
        constraint: 'ItemEstoque_item_estoque_codigo_key',
        columns: ['item_estoque_codigo'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Orcamento',
        constraint: 'Orcamento_ordem_servico_id_orcamento_versao_key',
        columns: ['ordem_servico_id', 'orcamento_versao'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'OrdemServico',
        constraint: 'OrdemServico_ordem_servico_numero_key',
        columns: ['ordem_servico_numero'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Perfil',
        constraint: 'Perfil_perfil_nome_key',
        columns: ['perfil_nome'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Servico',
        constraint: 'Servico_servico_nome_key',
        columns: ['servico_nome'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Usuario',
        constraint: 'Usuario_usuario_email_key',
        columns: ['usuario_email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Usuario',
        constraint: 'Usuario_usuario_documento_key',
        columns: ['usuario_documento'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Veiculo',
        constraint: 'Veiculo_veiculo_placa_key',
        columns: ['veiculo_placa'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Veiculo',
        constraint: 'Veiculo_veiculo_chassi_key',
        columns: ['veiculo_chassi'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ItemEstoque',
        index: 'ItemEstoque_item_estoque_tipo_idx_3cad250b',
        columns: ['item_estoque_tipo'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MovimentacaoEstoque',
        index: 'MovimentacaoEstoque_item_estoque_id_idx_67447c15',
        columns: ['item_estoque_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MovimentacaoEstoque',
        index: 'MovimentacaoEstoque_ordem_servico_id_idx_22fc9c3d',
        columns: ['ordem_servico_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MovimentacaoEstoque',
        index: 'MovimentacaoEstoque_usuario_id_idx_65b6616a',
        columns: ['usuario_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Orcamento',
        index: 'Orcamento_orcamento_respondido_por_idx_af278654',
        columns: ['orcamento_respondido_por'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Orcamento',
        index: 'Orcamento_orcamento_status_idx_da38468c',
        columns: ['orcamento_status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Orcamento',
        index: 'Orcamento_ordem_servico_id_idx_22fc9c3d',
        columns: ['ordem_servico_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServico',
        index: 'OrdemServico_atendente_id_idx_bc37ffcb',
        columns: ['atendente_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServico',
        index: 'OrdemServico_mecanico_id_idx_2a95f1b9',
        columns: ['mecanico_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServico',
        index: 'OrdemServico_ordem_servico_status_idx_580e6243',
        columns: ['ordem_servico_status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServico',
        index: 'OrdemServico_usuario_id_idx_65b6616a',
        columns: ['usuario_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServico',
        index: 'OrdemServico_veiculo_id_idx_b9d7a88f',
        columns: ['veiculo_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoItem',
        index: 'OrdemServicoItem_item_estoque_id_idx_67447c15',
        columns: ['item_estoque_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoItem',
        index: 'OrdemServicoItem_orcamento_id_idx_5a304956',
        columns: ['orcamento_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoItem',
        index: 'OrdemServicoItem_ordem_servico_id_idx_22fc9c3d',
        columns: ['ordem_servico_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoServico',
        index: 'OrdemServicoServico_orcamento_id_idx_5a304956',
        columns: ['orcamento_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoServico',
        index: 'OrdemServicoServico_ordem_servico_id_idx_22fc9c3d',
        columns: ['ordem_servico_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoServico',
        index: 'OrdemServicoServico_servico_id_idx_d1abf681',
        columns: ['servico_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoStatusHistorico',
        index: 'OrdemServicoStatusHistorico_ordem_servico_id_idx_22fc9c3d',
        columns: ['ordem_servico_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoStatusHistorico',
        index: 'OrdemServicoStatusHistorico_usuario_id_idx_65b6616a',
        columns: ['usuario_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrdemServicoStatusHistorico',
        index: 'os_historico_os_criado_idx_f503259f',
        columns: ['ordem_servico_id', 'historico_criado_em'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Usuario',
        index: 'Usuario_perfil_id_idx_0e75ecf5',
        columns: ['perfil_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Veiculo',
        index: 'Veiculo_usuario_id_idx_65b6616a',
        columns: ['usuario_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MovimentacaoEstoque',
        foreignKey: {
          name: 'MovimentacaoEstoque_item_estoque_id_fkey',
          columns: ['item_estoque_id'],
          references: { schema: 'public', table: 'ItemEstoque', columns: ['item_estoque_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MovimentacaoEstoque',
        foreignKey: {
          name: 'MovimentacaoEstoque_ordem_servico_id_fkey',
          columns: ['ordem_servico_id'],
          references: { schema: 'public', table: 'OrdemServico', columns: ['ordem_servico_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MovimentacaoEstoque',
        foreignKey: {
          name: 'MovimentacaoEstoque_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Orcamento',
        foreignKey: {
          name: 'Orcamento_ordem_servico_id_fkey',
          columns: ['ordem_servico_id'],
          references: { schema: 'public', table: 'OrdemServico', columns: ['ordem_servico_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Orcamento',
        foreignKey: {
          name: 'Orcamento_orcamento_respondido_por_fkey',
          columns: ['orcamento_respondido_por'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServico',
        foreignKey: {
          name: 'OrdemServico_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServico',
        foreignKey: {
          name: 'OrdemServico_veiculo_id_fkey',
          columns: ['veiculo_id'],
          references: { schema: 'public', table: 'Veiculo', columns: ['veiculo_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServico',
        foreignKey: {
          name: 'OrdemServico_atendente_id_fkey',
          columns: ['atendente_id'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServico',
        foreignKey: {
          name: 'OrdemServico_mecanico_id_fkey',
          columns: ['mecanico_id'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoItem',
        foreignKey: {
          name: 'OrdemServicoItem_ordem_servico_id_fkey',
          columns: ['ordem_servico_id'],
          references: { schema: 'public', table: 'OrdemServico', columns: ['ordem_servico_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoItem',
        foreignKey: {
          name: 'OrdemServicoItem_item_estoque_id_fkey',
          columns: ['item_estoque_id'],
          references: { schema: 'public', table: 'ItemEstoque', columns: ['item_estoque_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoItem',
        foreignKey: {
          name: 'OrdemServicoItem_orcamento_id_fkey',
          columns: ['orcamento_id'],
          references: { schema: 'public', table: 'Orcamento', columns: ['orcamento_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoServico',
        foreignKey: {
          name: 'OrdemServicoServico_ordem_servico_id_fkey',
          columns: ['ordem_servico_id'],
          references: { schema: 'public', table: 'OrdemServico', columns: ['ordem_servico_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoServico',
        foreignKey: {
          name: 'OrdemServicoServico_servico_id_fkey',
          columns: ['servico_id'],
          references: { schema: 'public', table: 'Servico', columns: ['servico_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoServico',
        foreignKey: {
          name: 'OrdemServicoServico_orcamento_id_fkey',
          columns: ['orcamento_id'],
          references: { schema: 'public', table: 'Orcamento', columns: ['orcamento_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoStatusHistorico',
        foreignKey: {
          name: 'OrdemServicoStatusHistorico_ordem_servico_id_fkey',
          columns: ['ordem_servico_id'],
          references: { schema: 'public', table: 'OrdemServico', columns: ['ordem_servico_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrdemServicoStatusHistorico',
        foreignKey: {
          name: 'OrdemServicoStatusHistorico_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Usuario',
        foreignKey: {
          name: 'Usuario_perfil_id_fkey',
          columns: ['perfil_id'],
          references: { schema: 'public', table: 'Perfil', columns: ['perfil_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UsuarioSenha',
        foreignKey: {
          name: 'UsuarioSenha_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Veiculo',
        foreignKey: {
          name: 'Veiculo_usuario_id_fkey',
          columns: ['usuario_id'],
          references: { schema: 'public', table: 'Usuario', columns: ['usuario_id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
