import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

// Valores monetários em CENTAVOS (15000 = R$ 150,00).
// Quantidades de estoque são Numeric(12, 3): sempre string decimal.

const perfis = [
  {
    nome: 'Admin',
    descricao:
      'Administrador do sistema - tem acesso total a todas as rotas e funcionalidades',
  },
  { nome: 'Atendente', descricao: 'Abre e acompanha ordens e serviços' },
  { nome: 'Mecanico', descricao: 'Executa os serviços deifinidos na os' },
  { nome: 'Cliente', descricao: 'Dono do veículo' },
];

const users = [
  {
    nome: 'Administrador',
    email: 'admin@oficina.local',
    documento: '21093991046',
    perfil: 'Admin',
  },
  {
    nome: 'Atendente Local',
    email: 'atendente@oficina.local',
    documento: '01485261015',
    perfil: 'Atendente',
  },
  {
    nome: 'Mecanico Local',
    email: 'mecanico@oficina.local',
    documento: '30949166006',
    perfil: 'Mecanico',
  },
  {
    nome: 'Cliente Local',
    email: 'cliente@oficina.local',
    documento: '78711395095',
    perfil: 'Cliente',
  },
];

const services = [
  { nome: 'Troca de óleo', precoCentavos: 15000 },
  { nome: 'Alinhamento', precoCentavos: 8000 },
  { nome: 'Balanceamento', precoCentavos: 6000 },
  { nome: 'Revisão completa', precoCentavos: 45000 },
];

const itens = [
  {
    tipo: 'PECA',
    codigo: 'PC-OLEO-001',
    nome: 'Filtro de óleo',
    unidade: 'UN',
    precoCentavos: 3500,
    quantidade: '20.000',
  },
  {
    tipo: 'PECA',
    codigo: 'PC-FREIO-001',
    nome: 'Pastilha de freio',
    unidade: 'UN',
    precoCentavos: 12000,
    quantidade: '12.000',
  },
  {
    tipo: 'INSUMO',
    codigo: 'INS-5W30-001',
    nome: 'Óleo 5W30',
    unidade: 'L',
    precoCentavos: 4500,
    quantidade: '80.000',
  },
  {
    tipo: 'INSUMO',
    codigo: 'INS-RAD-001',
    nome: 'Aditivo de radiador',
    unidade: 'L',
    precoCentavos: 2500,
    quantidade: '30.000',
  },
] as const;

async function main() {
  const standartPassword = process.env['SEED_PASSWORD'];

  if (!standartPassword) {
    throw new Error(
      'Defina SEED_PASSWORD para criar as senhas dos usuários do seed.',
    );
  }

  const perfilIds = new Map<string, string>();

  for (const p of perfis) {
    const exists = await db.perfil.findUnique({
      where: { perfilNome: p.nome },
    });

    const perfil =
      exists ??
      (await db.perfil.create({
        data: { perfilNome: p.nome, perfilDescricao: p.descricao },
      }));

    perfilIds.set(p.nome, perfil.perfilId);
  }

  const hash = await argon2.hash(standartPassword, { type: argon2.argon2id });
  const userIds = new Map<string, string>();

  for (const u of users) {
    const exists = await db.usuario.findUnique({
      where: { usuarioEmail: u.email },
    });

    if (exists) {
      userIds.set(u.email, exists.usuarioId);
      continue;
    }

    const userCreated = await db.usuario.create({
      data: {
        perfilId: perfilIds.get(u.perfil)!,
        usuarioNome: u.nome,
        usuarioEmail: u.email,
        usuarioDocumento: u.documento,
        usuarioTipoDocumento: 'CPF',
      },
    });

    await db.usuarioSenha.create({
      data: { usuarioId: userCreated.usuarioId, senhaHash: hash },
    });

    userIds.set(u.email, userCreated.usuarioId);
  }

  for (const s of services) {
    const exists = await db.servico.findUnique({
      where: { servicoNome: s.nome },
    });

    if (!exists) {
      await db.servico.create({
        data: { servicoNome: s.nome, servicoPrecoBase: s.precoCentavos },
      });
    }
  }

  for (const i of itens) {
    const exists = await db.itemEstoque.findUnique({
      where: { itemEstoqueCodigo: i.codigo },
    });

    if (!exists) {
      // Saldo inicial com a movimentação de ENTRADA que o explica (ADR-012).
      await db.$transaction(async (tx) => {
        const created = await tx.itemEstoque.create({
          data: {
            itemEstoqueTipo: i.tipo,
            itemEstoqueCodigo: i.codigo,
            itemEstoqueNome: i.nome,
            itemEstoqueUnidade: i.unidade,
            itemEstoquePrecoVenda: i.precoCentavos,
            itemEstoqueQuantidade: i.quantidade,
          },
        });
        await tx.movimentacaoEstoque.create({
          data: {
            itemEstoqueId: created.itemEstoqueId,
            usuarioId: userIds.get('admin@oficina.local')!,
            movimentacaoTipo: 'ENTRADA',
            movimentacaoQuantidade: i.quantidade,
            movimentacaoMotivo: 'Saldo inicial (seed)',
          },
        });
      });
    }
  }

  const vehicle = await db.veiculo.findFirst({
    where: { veiculoPlaca: 'ABC1D23', veiculoAtivo: true },
  });

  if (!vehicle) {
    await db.veiculo.create({
      data: {
        usuarioId: userIds.get('cliente@oficina.local')!,
        veiculoPlaca: 'ABC1D23',
        veiculoMarca: 'Fiat',
        veiculoModelo: 'Uno',
        veiculoAnoFabricacao: 2015,
        veiculoCor: 'Prata',
        veiculoKmAtual: 85000,
      },
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
