import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
  });

  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
