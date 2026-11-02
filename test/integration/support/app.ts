import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaClient } from '../../../src/generated/prisma/client';

export const PASSWORD = 'Integration#Pass123';

export const SEED_EMAILS = {
  admin: 'admin@oficina.local',
  attendant: 'atendente@oficina.local',
  mechanic: 'mecanico@oficina.local',
} as const;

/** Aplicação real (todos os módulos, guards e pipe global como no `main.ts`) sobre o banco de teste. */
export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication<App> = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

/** Acesso direto ao banco, só para preparar e conferir estado fora da API. */
export function createDb() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
  });
}

export async function login(
  app: INestApplication<App>,
  email: string,
  password = PASSWORD,
) {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, senha: password })
    .expect(200);
  return res.body as {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
  };
}

export const bearer = (token: string) => `Bearer ${token}`;

const digits = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10));

/** CPF válido (dígitos verificadores corretos) e fictício, único a cada chamada. */
export function randomCpf(): string {
  const base = digits(9);
  const check = (nums: number[]) => {
    const factor = nums.length + 1;
    const sum = nums.reduce((acc, n, i) => acc + n * (factor - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  // evita sequências repetidas (ex.: 11111111111), que o validador rejeita
  if (base.every((n) => n === base[0])) base[0] = (base[0] + 1) % 10;
  const d1 = check(base);
  const d2 = check([...base, d1]);
  return [...base, d1, d2].join('');
}

const PLATE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Placa Mercosul fictícia (AAA9A99), única o bastante para os testes. */
export function randomPlate(): string {
  const letter = () =>
    PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
  const num = () => Math.floor(Math.random() * 10);
  return `${letter()}${letter()}${letter()}${num()}${letter()}${num()}${num()}`;
}

export const uniqueEmail = (prefix = 'user') =>
  `${prefix}-${randomUUID()}@example.com`;
