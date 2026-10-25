import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../shared/database/database.service';
import { RequestContext } from '../../identity/auth';

@Injectable()
export class ItemService {
  private logger = new Logger(ItemService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
  ) {
    this.orm = this.prisma.db;
  }
}
