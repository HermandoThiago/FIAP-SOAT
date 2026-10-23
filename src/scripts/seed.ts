import type { Numeric, Varchar } from '@prisma/orm-postgres/target/codec-types';
import * as argon2 from 'argon2';
import { db } from '../prisma/db';

// Os campos VarChar(n) e Numeric(p, s) do contrato são tipados como strings
// "marcadas" (Varchar<n>, Numeric<p, s>). Estes helpers fazem a conversão de tipo.
const vc = <N extends number>(s: string) => s as Varchar<N>;
const nm = <P extends number, S extends number | undefined>(s: string) =>
  s as Numeric<P, S>;

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
    const [exists] = await db.orm.public.Perfil.where({
      perfilNome: vc<50>(p.nome),
    }).all();

    const perfil =
      exists ??
      (await db.orm.public.Perfil.create({
        perfilNome: vc(p.nome),
        perfilDescricao: vc(p.descricao),
      }));

    perfilIds.set(p.nome, perfil.perfilId);
  }

  const hash = await argon2.hash(standartPassword, { type: argon2.argon2id });
  const userIds = new Map<string, string>();

  for (const u of users) {
    const [exists] = await db.orm.public.Usuario.where({
      usuarioEmail: vc<255>(u.email),
    }).all();

    if (exists) {
      userIds.set(u.email, exists.usuarioId);
      continue;
    }

    const userCreated = await db.orm.public.Usuario.create({
      perfilId: perfilIds.get(u.perfil),
      usuarioNome: vc(u.nome),
      usuarioEmail: vc(u.email),
      usuarioDocumento: vc(u.documento),
      usuarioTipoDocumento: 'CPF',
    });

    await db.orm.public.UsuarioSenha.create({
      usuarioId: userCreated.usuarioId,
      senhaHash: vc(hash),
    });

    userIds.set(u.email, userCreated.usuarioId);
  }

  for (const s of services) {
    const [exists] = await db.orm.public.Servico.where({
      servicoNome: vc<120>(s.nome),
    }).all();

    if (!exists) {
      await db.orm.public.Servico.create({
        servicoNome: vc(s.nome),
        servicoPrecoBase: s.precoCentavos,
      });
    }
  }

  for (const i of itens) {
    const [exists] = await db.orm.public.ItemEstoque.where({
      itemEstoqueCodigo: vc<40>(i.codigo),
    }).all();

    if (!exists) {
      await db.orm.public.ItemEstoque.create({
        itemEstoqueTipo: i.tipo,
        itemEstoqueCodigo: vc(i.codigo),
        itemEstoqueNome: vc(i.nome),
        itemEstoqueUnidade: i.unidade,
        itemEstoquePrecoVenda: i.precoCentavos,
        itemEstoqueQuantidade: nm(i.quantidade),
      });
    }
  }

  const [vehicle] = await db.orm.public.Veiculo.where({
    veiculoPlaca: vc<7>('ABC1D23'),
  }).all();

  if (!vehicle) {
    await db.orm.public.Veiculo.create({
      usuarioId: userIds.get('cliente@oficina.local'),
      veiculoPlaca: vc('ABC1D23'),
      veiculoMarca: vc('Fiat'),
      veiculoModelo: vc('Uno'),
      veiculoAnoFabricacao: 2015,
      veiculoCor: vc('Prata'),
      veiculoKmAtual: 85000,
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
