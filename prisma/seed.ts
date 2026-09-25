import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';

import { Prisma, PrismaClient } from '../src/generated/prisma/client';

// Seed de demonstração (modelo-de-dados.md §5; ADR-011): roda por `prisma db seed`, somente em APP_ENV=dev.
// Idempotente (upsert por chave natural: email, document, license_plate, name, sku, number; filhos por id fixo) e
// determinístico (UUID v4 fixos, datas UTC fixas). Dados fictícios com documentos/placas sintaticamente válidos (ADR-009).
// Senhas via ambiente: ADMIN_EMAIL/ADMIN_PASSWORD (MANAGER, PRD-005 RF-062) e SEED_PASSWORD (demais usuários) — gravadas
// só na criação do usuário: reexecutar o seed não sobrescreve password_hash (senha alterada pela API é preservada).

const BCRYPT_COST = 12; // ADR-004
const LAST_SEEDED_NUMBER = 4; // OS-2026-000001 … OS-2026-000004
const TRANSACTION_TIMEOUT_MS = 60_000;

const ids = {
  managerUser: '9319fa8f-7745-4e7c-8680-814a06ec20f0',
  mechanicUser: 'cce771c5-f55c-4c38-a8c4-43c462c98350',
  attendantUser: 'c1ab7423-b623-48a9-a429-adab900ddef7',
  customerUser: '8da5b2f9-4399-40bb-83d4-c888d4d4004e',
  customerAna: 'c719b4b1-df0d-4057-a9dd-5b8f9be2898b',
  customerCarlos: '0a059480-63df-4600-9301-854d24e52d8b',
  customerRotaNorte: '2c303a10-291d-4e7b-b3b0-4f4dc70ea20c',
  vehicleGol: '75cce5c1-31e6-4b1a-9946-26b56cb3f122',
  vehicleArgo: 'e70f6ffa-2a62-451c-b047-5e8cbc472ee5',
  vehicleOnix: 'ef14154a-a277-4cbc-aa0c-53ab493ffb56',
  vehicleHilux: '024232d7-112b-4917-8b9e-b6ddfcb622ba',
} as const;

// ───────────────────────────── documentos fictícios válidos (ADR-009 Parte 2) ─────────────────────────────

const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function mod11CheckDigit(digits: string, weightOf: (index: number) => number): string {
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * weightOf(index), 0);
  const remainder = sum % 11;
  return String(remainder < 2 ? 0 : 11 - remainder);
}

/** CPF completo a partir dos 9 primeiros dígitos (pesos 10..2 e 11..2). */
function cpf(base: string): string {
  const first = mod11CheckDigit(base, (index) => 10 - index);
  const second = mod11CheckDigit(base + first, (index) => 11 - index);
  return base + first + second;
}

/** CNPJ completo a partir dos 12 primeiros dígitos (pesos 5..2,9..2 e 6..2,9..2). */
function cnpj(base: string): string {
  const first = mod11CheckDigit(base, (index) => CNPJ_WEIGHTS[index + 1]);
  const second = mod11CheckDigit(base + first, (index) => CNPJ_WEIGHTS[index]);
  return base + first + second;
}

/** Confere tamanho, sequência repetida e dígitos verificadores antes de gravar. */
function assertValidDocument(document: string): string {
  const isCpf = document.length === 11;
  const recomputed = isCpf ? cpf(document.slice(0, 9)) : cnpj(document.slice(0, 12));
  if (!/^\d{11}$|^\d{14}$/.test(document) || /^(\d)\1+$/.test(document) || recomputed !== document) {
    throw new Error(`[seed] documento fictício inválido: ${document}`);
  }
  return document;
}

const CPF_ANA = assertValidDocument(cpf('529982247'));
const CPF_CARLOS = assertValidDocument(cpf('123456789'));
const CNPJ_ROTA_NORTE = assertValidDocument(cnpj('112223330001'));

// ───────────────────────────── dados de demonstração ─────────────────────────────

const at = (iso: string): Date => new Date(iso);
const money = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

const customers = [
  {
    id: ids.customerAna,
    customerType: 'INDIVIDUAL',
    document: CPF_ANA,
    name: 'Ana Beatriz Ferreira',
    email: 'ana.ferreira@example.com',
    phone: '11987654321',
  },
  {
    id: ids.customerCarlos,
    customerType: 'INDIVIDUAL',
    document: CPF_CARLOS,
    name: 'Carlos Eduardo Lima',
    email: 'carlos.lima@example.com',
    phone: '21998765432',
  },
  {
    id: ids.customerRotaNorte,
    customerType: 'COMPANY',
    document: CNPJ_ROTA_NORTE,
    name: 'Transportadora Rota Norte LTDA',
    email: 'frota@rotanorte.example.com',
    phone: '1133334444',
  },
];

// 2 placas antigas (AAA9999) e 2 Mercosul (AAA9A99), normalizadas
const vehicles = [
  {
    id: ids.vehicleGol,
    customerId: ids.customerAna,
    licensePlate: 'ABC1234',
    brand: 'Volkswagen',
    model: 'Gol',
    year: 2018,
    color: 'Prata',
  },
  {
    id: ids.vehicleArgo,
    customerId: ids.customerAna,
    licensePlate: 'BRA2E19',
    brand: 'Fiat',
    model: 'Argo',
    year: 2021,
    color: 'Branco',
  },
  {
    id: ids.vehicleOnix,
    customerId: ids.customerCarlos,
    licensePlate: 'DEF5678',
    brand: 'Chevrolet',
    model: 'Onix',
    year: 2019,
    color: 'Preto',
  },
  {
    id: ids.vehicleHilux,
    customerId: ids.customerRotaNorte,
    licensePlate: 'XYZ9A87',
    brand: 'Toyota',
    model: 'Hilux',
    year: 2022,
    color: 'Cinza',
  },
];

interface SeedService {
  id: string;
  name: string;
  description: string;
  price: string;
  estimatedMinutes: number;
}

const services = {
  oilChange: {
    id: '0dfc7ad4-dc34-4906-b6cb-675a8fe13c37',
    name: 'Troca de óleo',
    description: 'Troca do óleo do motor e do filtro de óleo.',
    price: '120.00',
    estimatedMinutes: 30,
  },
  alignment: {
    id: 'd7f7d8e2-7b70-4277-9bad-ad33d3d46344',
    name: 'Alinhamento',
    description: 'Alinhamento da geometria da direção.',
    price: '90.00',
    estimatedMinutes: 40,
  },
  balancing: {
    id: '3ea37461-7d21-4525-8abe-7a2fcbe8ce1a',
    name: 'Balanceamento',
    description: 'Balanceamento das quatro rodas.',
    price: '80.00',
    estimatedMinutes: 30,
  },
  brakePads: {
    id: '713a271c-4399-4c74-a63c-91b61e5e3eee',
    name: 'Troca de pastilhas de freio',
    description: 'Substituição das pastilhas de freio dianteiras.',
    price: '150.00',
    estimatedMinutes: 60,
  },
  inspection: {
    id: '9ef0032d-89b8-4a39-b163-c6e638c516e0',
    name: 'Revisão',
    description: 'Revisão periódica com verificação de itens de segurança.',
    price: '350.00',
    estimatedMinutes: 180,
  },
  electronicDiagnosis: {
    id: '6441a76c-bfcd-49b2-a053-fb83471d725a',
    name: 'Diagnóstico eletrônico',
    description: 'Leitura de falhas com scanner automotivo.',
    price: '200.00',
    estimatedMinutes: 60,
  },
} satisfies Record<string, SeedService>;

interface SeedPart {
  id: string;
  sku: string;
  name: string;
  type: 'PART' | 'SUPPLY';
  unitOfMeasure: 'UN' | 'L';
  unitPrice: string;
  /** Estoque final após as OS de demonstração; a entrada inicial é calculada somando as baixas. */
  stockQuantity: string;
  minimumStock: string;
  inboundId: string;
}

// Filtro de combustível e fluido de freio ficam abaixo do mínimo (alerta — PRD-002 RF-027)
const parts = {
  oilFilter: {
    id: '7eff979a-1699-4620-acee-ec37a0a17ab4',
    sku: 'FLT-OLEO-001',
    name: 'Filtro de óleo',
    type: 'PART',
    unitOfMeasure: 'UN',
    unitPrice: '35.00',
    stockQuantity: '20.000',
    minimumStock: '5.000',
    inboundId: '0a27afab-a68e-4564-b6cb-843bc6c193f5',
  },
  engineOil: {
    id: '91f9a034-d109-42a5-a370-483b23c7834c',
    sku: 'OLEO-5W30-1L',
    name: 'Óleo de motor 5W30',
    type: 'SUPPLY',
    unitOfMeasure: 'L',
    unitPrice: '45.00',
    stockQuantity: '40.000',
    minimumStock: '10.000',
    inboundId: '365e12d4-04b4-4238-b423-807bc7e98ef6',
  },
  brakePadSet: {
    id: 'c30f5dd1-c469-4995-bba5-f9f842516b11',
    sku: 'PAST-FREIO-D01',
    name: 'Jogo de pastilhas de freio dianteiras',
    type: 'PART',
    unitOfMeasure: 'UN',
    unitPrice: '180.00',
    stockQuantity: '6.000',
    minimumStock: '4.000',
    inboundId: 'd9ca13d6-87a3-4dc7-8df7-f6f35d830257',
  },
  airFilter: {
    id: 'e487e690-f359-4cb5-a1d5-ee9523226596',
    sku: 'FLT-AR-002',
    name: 'Filtro de ar',
    type: 'PART',
    unitOfMeasure: 'UN',
    unitPrice: '55.00',
    stockQuantity: '12.000',
    minimumStock: '5.000',
    inboundId: 'c1c31407-9378-41bf-b3f3-87390cd7adc4',
  },
  fuelFilter: {
    id: '8ac74cde-17ce-4211-8e4c-bd9566848f2c',
    sku: 'FLT-COMB-003',
    name: 'Filtro de combustível',
    type: 'PART',
    unitOfMeasure: 'UN',
    unitPrice: '60.00',
    stockQuantity: '3.000',
    minimumStock: '5.000',
    inboundId: 'e95a0d27-af3e-4d4f-8771-77352086dcfd',
  },
  brakeFluid: {
    id: '810cbef2-3b88-4750-970b-db3619e76db4',
    sku: 'FLUIDO-FREIO-DOT4',
    name: 'Fluido de freio DOT4',
    type: 'SUPPLY',
    unitOfMeasure: 'L',
    unitPrice: '70.00',
    stockQuantity: '2.500',
    minimumStock: '4.000',
    inboundId: '47b21cbc-6945-4107-9927-ac154658d86f',
  },
  sparkPlug: {
    id: '79856afe-3997-47e2-b3dd-b1a1bcfba951',
    sku: 'VELA-IGN-004',
    name: 'Vela de ignição',
    type: 'PART',
    unitOfMeasure: 'UN',
    unitPrice: '30.00',
    stockQuantity: '24.000',
    minimumStock: '8.000',
    inboundId: '6113d5c5-7ab3-444f-bd4b-d7d9a5752cb6',
  },
  coolant: {
    id: '3bc7063d-86a4-43f3-9be9-94d27f7b2fa3',
    sku: 'ADIT-RAD-1L',
    name: 'Aditivo de radiador',
    type: 'SUPPLY',
    unitOfMeasure: 'L',
    unitPrice: '38.00',
    stockQuantity: '15.000',
    minimumStock: '5.000',
    inboundId: 'a9d724ca-1c54-4ed7-9a0c-e46bbdb9aedc',
  },
} satisfies Record<string, SeedPart>;

interface SeedPartItem {
  id: string;
  part: SeedPart;
  quantity: string;
  /** Ids das movimentações RESERVATION (aprovação) e OUTBOUND (finalização) — só nas OS que passaram por elas (ADR-012). */
  reservationId?: string;
  outboundId?: string;
}

interface SeedServiceOrder {
  id: string;
  number: string;
  customerId: string;
  vehicleId: string;
  problemDescription: string;
  status: string;
  quoteStatus: string;
  quoteSentAt?: Date;
  quoteRespondedAt?: Date;
  receivedAt: Date;
  diagnosisStartedAt?: Date;
  executionStartedAt?: Date;
  completedAt?: Date;
  deliveredAt?: Date;
  serviceItems: { id: string; service: SeedService; quantity: number }[];
  partItems: SeedPartItem[];
  /** Histórico completo de transições (PRD-004 §2); actor = id do usuário, CUSTOMER ou SYSTEM. */
  history: { id: string; fromStatus: string | null; toStatus: string; actor: string; occurredAt: Date }[];
}

const CUSTOMER_ACTOR = 'CUSTOMER';

// Veículos distintos entre as OS em aberto (índice parcial "1 OS aberta por veículo"): Onix (RECEIVED), Gol
// (AWAITING_APPROVAL) e Hilux (COMPLETED); o Argo está em uma OS já entregue.
const serviceOrders: SeedServiceOrder[] = [
  {
    id: '54aa5851-e4a3-4e57-a897-6ac97ae13349',
    number: 'OS-2026-000001',
    customerId: ids.customerCarlos,
    vehicleId: ids.vehicleOnix,
    problemDescription: 'Barulho ao frear e luz de injeção acesa no painel.',
    status: 'RECEIVED',
    quoteStatus: 'PENDING',
    receivedAt: at('2026-09-21T12:00:00Z'),
    serviceItems: [],
    partItems: [],
    history: [
      {
        id: 'dc492fde-a926-4695-b216-5ef650820662',
        fromStatus: null,
        toStatus: 'RECEIVED',
        actor: ids.attendantUser,
        occurredAt: at('2026-09-21T12:00:00Z'),
      },
    ],
  },
  {
    id: '2f109cde-cc93-44a8-89bf-6554894ff689',
    number: 'OS-2026-000002',
    customerId: ids.customerAna,
    vehicleId: ids.vehicleGol,
    problemDescription: 'Revisão de freios e troca de óleo vencida.',
    status: 'AWAITING_APPROVAL',
    quoteStatus: 'SENT',
    quoteSentAt: at('2026-09-21T15:00:00Z'),
    receivedAt: at('2026-09-21T13:00:00Z'),
    diagnosisStartedAt: at('2026-09-21T13:30:00Z'),
    serviceItems: [
      { id: '2289beaf-2b4c-4f77-8a7e-af226049d38e', service: services.oilChange, quantity: 1 },
      { id: 'b5cbcd98-34d9-430c-9122-cc0d8e941507', service: services.brakePads, quantity: 1 },
    ],
    partItems: [
      { id: '056e3c06-cb0d-4a4e-807c-641c29668ffd', part: parts.oilFilter, quantity: '1.000' },
      { id: 'e39d1727-453f-48ed-a2d8-14e3c99e1b9d', part: parts.engineOil, quantity: '4.000' },
      { id: 'f47a16d2-9713-4e92-bb6b-8fdea3e64743', part: parts.brakePadSet, quantity: '1.000' },
    ],
    history: [
      {
        id: '20c3afae-3cb3-4f04-84ff-33e091bc674a',
        fromStatus: null,
        toStatus: 'RECEIVED',
        actor: ids.attendantUser,
        occurredAt: at('2026-09-21T13:00:00Z'),
      },
      {
        id: '9af158e9-5436-4870-8d15-63de6e6ec5e4',
        fromStatus: 'RECEIVED',
        toStatus: 'IN_DIAGNOSIS',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-21T13:30:00Z'),
      },
      {
        id: 'f572fd08-50fb-4ee5-a2a7-a608c7d5758e',
        fromStatus: 'IN_DIAGNOSIS',
        toStatus: 'AWAITING_APPROVAL',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-21T15:00:00Z'),
      },
    ],
  },
  {
    id: 'cc79e50d-f7b9-428e-b1a6-8636aa88a19b',
    number: 'OS-2026-000003',
    customerId: ids.customerRotaNorte,
    vehicleId: ids.vehicleHilux,
    problemDescription: 'Revisão periódica da frota e alinhamento.',
    status: 'COMPLETED',
    quoteStatus: 'APPROVED',
    quoteSentAt: at('2026-09-22T14:00:00Z'),
    quoteRespondedAt: at('2026-09-22T14:30:00Z'),
    receivedAt: at('2026-09-22T12:00:00Z'),
    diagnosisStartedAt: at('2026-09-22T12:20:00Z'),
    executionStartedAt: at('2026-09-22T14:30:00Z'),
    completedAt: at('2026-09-22T18:00:00Z'),
    serviceItems: [
      { id: '42be613c-6001-427e-8295-29d6e73a196f', service: services.inspection, quantity: 1 },
      { id: '230be228-5b19-409e-9c4f-74d139ccd8a8', service: services.alignment, quantity: 1 },
    ],
    partItems: [
      {
        id: 'c4f22b6c-899f-4c8e-a44b-92f210284ead',
        part: parts.airFilter,
        quantity: '1.000',
        reservationId: 'ebf1b332-6daa-4611-894c-d9825e412627',
        outboundId: '7df2bd56-5581-4baa-86d2-919b1783cfc0',
      },
      {
        id: 'f142e16d-12c4-4a87-8115-c0dd4f4d763b',
        part: parts.sparkPlug,
        quantity: '4.000',
        reservationId: '6a6bd970-372e-42fc-8b26-1d6d89f87509',
        outboundId: 'f8d13351-977e-44e8-a345-8bc0d02fb5b1',
      },
      {
        id: '03eb2f14-fa9d-4958-984b-21d570656618',
        part: parts.engineOil,
        quantity: '5.000',
        reservationId: 'c89f44a1-cf59-41fc-bfbd-69b244778ba7',
        outboundId: '1e114b9a-f4d1-4595-b767-238c0727b5c1',
      },
    ],
    history: [
      {
        id: 'fa6eeba1-33a4-4610-be4f-91dea6b7d632',
        fromStatus: null,
        toStatus: 'RECEIVED',
        actor: ids.attendantUser,
        occurredAt: at('2026-09-22T12:00:00Z'),
      },
      {
        id: '307942bd-cf35-41ce-8c9b-443dfe5adc63',
        fromStatus: 'RECEIVED',
        toStatus: 'IN_DIAGNOSIS',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-22T12:20:00Z'),
      },
      {
        id: '3fdcf9dd-1c1c-4250-8047-d747947308f4',
        fromStatus: 'IN_DIAGNOSIS',
        toStatus: 'AWAITING_APPROVAL',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-22T14:00:00Z'),
      },
      {
        id: '6991020a-5638-4d14-847a-8194094c02b4',
        fromStatus: 'AWAITING_APPROVAL',
        toStatus: 'IN_PROGRESS',
        actor: CUSTOMER_ACTOR,
        occurredAt: at('2026-09-22T14:30:00Z'),
      },
      {
        id: '0fc3b2ca-c7fb-430a-ba19-1ba74c05e27f',
        fromStatus: 'IN_PROGRESS',
        toStatus: 'COMPLETED',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-22T18:00:00Z'),
      },
    ],
  },
  {
    id: 'd944adeb-99ee-4362-a4c6-bcf0fd06ae19',
    number: 'OS-2026-000004',
    customerId: ids.customerAna,
    vehicleId: ids.vehicleArgo,
    problemDescription: 'Luz de falha do motor acesa e vibração no volante.',
    status: 'DELIVERED',
    quoteStatus: 'APPROVED',
    quoteSentAt: at('2026-09-22T15:00:00Z'),
    quoteRespondedAt: at('2026-09-22T16:00:00Z'),
    receivedAt: at('2026-09-22T13:00:00Z'),
    diagnosisStartedAt: at('2026-09-22T13:30:00Z'),
    executionStartedAt: at('2026-09-22T16:00:00Z'),
    completedAt: at('2026-09-22T18:30:00Z'),
    deliveredAt: at('2026-09-24T12:00:00Z'),
    serviceItems: [
      { id: 'cb1979f3-d383-4b0f-b40c-c7f1f0a08f97', service: services.electronicDiagnosis, quantity: 1 },
      { id: '142db3f7-3e0f-49bd-b1f6-56a68febab0f', service: services.balancing, quantity: 1 },
    ],
    partItems: [
      {
        id: '837413a3-5e23-453e-9dbb-6a7f65ff58a7',
        part: parts.brakeFluid,
        quantity: '0.500',
        reservationId: '30b762ce-4ee6-45e5-bb5d-807d68246d58',
        outboundId: 'de3ff581-da21-4da7-8431-9837904c1cfd',
      },
      {
        id: '252de5d9-9135-4c8f-9704-760fbdf71a92',
        part: parts.fuelFilter,
        quantity: '1.000',
        reservationId: 'd5cea2b0-eaed-4477-a6e4-e5cd52b338c9',
        outboundId: '2848181c-a38a-41e5-9aa6-2283593a728b',
      },
    ],
    history: [
      {
        id: 'b04ed67d-0b38-49c6-b36c-5d6f773da37d',
        fromStatus: null,
        toStatus: 'RECEIVED',
        actor: ids.attendantUser,
        occurredAt: at('2026-09-22T13:00:00Z'),
      },
      {
        id: 'ec00a545-041b-4543-8397-79ba7bc93892',
        fromStatus: 'RECEIVED',
        toStatus: 'IN_DIAGNOSIS',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-22T13:30:00Z'),
      },
      {
        id: 'adf02054-9a3f-4037-9018-b97176a59e6a',
        fromStatus: 'IN_DIAGNOSIS',
        toStatus: 'AWAITING_APPROVAL',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-22T15:00:00Z'),
      },
      {
        id: '0eb68afa-6b40-421c-8e64-bfb836df7ecd',
        fromStatus: 'AWAITING_APPROVAL',
        toStatus: 'IN_PROGRESS',
        actor: CUSTOMER_ACTOR,
        occurredAt: at('2026-09-22T16:00:00Z'),
      },
      {
        id: 'f55b6ab2-7253-4233-ab3a-71c8166698d1',
        fromStatus: 'IN_PROGRESS',
        toStatus: 'COMPLETED',
        actor: ids.mechanicUser,
        occurredAt: at('2026-09-22T18:30:00Z'),
      },
      {
        id: 'd1dac309-b5f8-4d57-bbf1-a5d62fcb6141',
        fromStatus: 'COMPLETED',
        toStatus: 'DELIVERED',
        actor: ids.attendantUser,
        occurredAt: at('2026-09-24T12:00:00Z'),
      },
    ],
  },
];

/** Quote derivado dos itens (PRD-003; agregados.md §3 ServiceOrder 2): Σ preço × quantidade, sem float. */
function quoteTotal(order: SeedServiceOrder): Prisma.Decimal {
  const servicesTotal = order.serviceItems.reduce(
    (total, item) => total.plus(money(item.service.price).times(item.quantity)),
    money('0'),
  );
  return order.partItems.reduce(
    (total, item) => total.plus(money(item.part.unitPrice).times(item.quantity)),
    servicesTotal,
  );
}

/** Entrada inicial = estoque final + tudo o que as OS finalizadas baixaram (OUTBOUND), para o saldo fechar. */
function initialInbound(part: SeedPart): Prisma.Decimal {
  return serviceOrders
    .flatMap((order) => order.partItems)
    .filter((item) => item.part.id === part.id && item.outboundId !== undefined)
    .reduce((total, item) => total.plus(item.quantity), money(part.stockQuantity));
}

// ───────────────────────────── execução ─────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[seed] variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

async function seed(tx: Prisma.TransactionClient, passwordHashes: { admin: string; demo: string }): Promise<void> {
  // document e license_plate são únicos só entre ativos (índices parciais); com `active: true` no where o Prisma
  // faz select + update/insert em vez de INSERT … ON CONFLICT, que não casa com índice parcial.
  for (const customer of customers) {
    const { id, ...data } = customer;
    await tx.customer.upsert({
      where: { document: customer.document, active: true },
      update: data,
      create: { id, ...data },
    });
  }

  for (const vehicle of vehicles) {
    const { id, ...data } = vehicle;
    await tx.vehicle.upsert({
      where: { licensePlate: vehicle.licensePlate, active: true },
      update: data,
      create: { id, ...data },
    });
  }

  for (const service of Object.values(services)) {
    const { id, ...data } = service;
    await tx.service.upsert({ where: { name: service.name }, update: data, create: { id, ...data } });
  }

  for (const part of Object.values(parts)) {
    const { id, inboundId, ...data } = part;
    await tx.part.upsert({
      where: { sku: part.sku },
      update: { ...data, reservedQuantity: '0' },
      create: { id, ...data },
    });
    const inbound = {
      partId: id,
      type: 'INBOUND',
      quantity: initialInbound(part),
      reason: 'Estoque inicial (seed de demonstração)',
      userId: ids.managerUser,
      occurredAt: at('2026-09-01T12:00:00Z'),
    };
    await tx.stockMovement.upsert({ where: { id: inboundId }, update: inbound, create: { id: inboundId, ...inbound } });
  }

  const users = [
    {
      id: ids.managerUser,
      name: 'Gerente da oficina',
      email: requireEnv('ADMIN_EMAIL'),
      passwordHash: passwordHashes.admin,
      roles: 'MANAGER',
      customerId: null,
    },
    {
      id: ids.mechanicUser,
      name: 'Mecânico da oficina',
      email: 'mechanic@oficina.local',
      passwordHash: passwordHashes.demo,
      roles: 'MECHANIC',
      customerId: null,
    },
    {
      id: ids.attendantUser,
      name: 'Atendente da oficina',
      email: 'attendant@oficina.local',
      passwordHash: passwordHashes.demo,
      roles: 'ATTENDANT',
      customerId: null,
    },
    // Login do cliente da OS aguardando aprovação (ADR-011): demonstra aprovação pelos dois caminhos no vídeo
    {
      id: ids.customerUser,
      name: customers[0].name,
      email: 'customer@oficina.local',
      passwordHash: passwordHashes.demo,
      roles: 'CUSTOMER',
      customerId: ids.customerAna,
    },
  ];
  // password_hash só entra no create: uma senha alterada pela API sobrevive a novas execuções (prisma/README.md).
  for (const user of users) {
    const { id, passwordHash, ...data } = user;
    await tx.user.upsert({ where: { email: user.email }, update: data, create: { id, passwordHash, ...data } });
  }

  for (const order of serviceOrders) {
    const { id, serviceItems, partItems, history, ...fields } = order;
    const data = { ...fields, quoteTotalAmount: quoteTotal(order), createdBy: ids.attendantUser };
    await tx.serviceOrder.upsert({ where: { number: order.number }, update: data, create: { id, ...data } });

    for (const item of serviceItems) {
      const row = {
        serviceOrderId: id,
        serviceId: item.service.id,
        nameSnapshot: item.service.name,
        priceSnapshot: item.service.price,
        quantity: item.quantity,
      };
      await tx.serviceOrderServiceItem.upsert({ where: { id: item.id }, update: row, create: { id: item.id, ...row } });
    }

    for (const item of partItems) {
      const row = {
        serviceOrderId: id,
        partId: item.part.id,
        nameSnapshot: item.part.name,
        unitPriceSnapshot: item.part.unitPrice,
        quantity: item.quantity,
      };
      await tx.serviceOrderPartItem.upsert({ where: { id: item.id }, update: row, create: { id: item.id, ...row } });

      // ADR-012: RESERVATION na aprovação (ação do cliente, sem usuário) e OUTBOUND na finalização (mecânico)
      if (item.reservationId && item.outboundId && order.executionStartedAt && order.completedAt) {
        const reservation = {
          partId: item.part.id,
          type: 'RESERVATION',
          quantity: item.quantity,
          serviceOrderId: id,
          userId: null,
          occurredAt: order.executionStartedAt,
        };
        await tx.stockMovement.upsert({
          where: { id: item.reservationId },
          update: reservation,
          create: { id: item.reservationId, ...reservation },
        });
        const outbound = {
          partId: item.part.id,
          type: 'OUTBOUND',
          quantity: item.quantity,
          serviceOrderId: id,
          userId: ids.mechanicUser,
          occurredAt: order.completedAt,
        };
        await tx.stockMovement.upsert({
          where: { id: item.outboundId },
          update: outbound,
          create: { id: item.outboundId, ...outbound },
        });
      }
    }

    for (const entry of history) {
      const row = {
        serviceOrderId: id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        actor: entry.actor,
        occurredAt: entry.occurredAt,
      };
      await tx.serviceOrderStatusHistory.upsert({
        where: { id: entry.id },
        update: row,
        create: { id: entry.id, ...row },
      });
    }
  }

  // Sequência anual (ADR-009) segue após as OS do seed, sem retroceder se a API já emitiu números maiores.
  await tx.$queryRaw`SELECT setval('service_orders.service_order_number_seq', GREATEST(${LAST_SEEDED_NUMBER}, (SELECT last_value FROM service_orders.service_order_number_seq)), true)`;
}

async function main(): Promise<void> {
  const appEnv = process.env.APP_ENV ?? '(não definido)';
  if (appEnv !== 'dev') {
    console.warn(`[seed] APP_ENV=${appEnv}: o seed de demonstração só roda em APP_ENV=dev. Nada foi gravado.`);
    return;
  }

  const databaseUrl = requireEnv('DATABASE_URL');
  const adminPassword = requireEnv('ADMIN_PASSWORD');
  const seedPassword = requireEnv('SEED_PASSWORD');
  requireEnv('ADMIN_EMAIL');

  const [admin, demo] = await Promise.all([hash(adminPassword, BCRYPT_COST), hash(seedPassword, BCRYPT_COST)]);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    await prisma.$transaction((tx) => seed(tx, { admin, demo }), { timeout: TRANSACTION_TIMEOUT_MS });
    console.log(
      `[seed] concluído: ${customers.length} clientes, ${vehicles.length} veículos, ${Object.keys(services).length} serviços, ` +
        `${Object.keys(parts).length} peças/insumos, ${serviceOrders.length} OS (${serviceOrders.map((order) => `${order.number} ${order.status}`).join(', ')}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] falhou:', error);
  process.exitCode = 1;
});
