import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../shared/database/database.service';
import { RequestContext } from '../../identity/auth';

@Injectable()
export class ServiceOrderService {
  private logger = new Logger(ServiceOrderService.name);
  private orm;

  constructor(
    private readonly prisma: DatabaseService,
    private readonly ctx: RequestContext,
  ) {
    this.orm = this.prisma.db;
  }
}
