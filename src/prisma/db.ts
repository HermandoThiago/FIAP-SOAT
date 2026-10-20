import postgres from '@prisma/orm-postgres/runtime';
import 'dotenv/config';
import type { Contract } from './contract.d';
import contractJson from './contract.json';

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
