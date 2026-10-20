import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { db } from "../../prisma/db";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db = db

  async onModuleDestroy() {
    await this.db.close()
  }
}
