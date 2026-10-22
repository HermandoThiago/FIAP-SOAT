import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../shared/database/database.service';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);

  constructor(private readonly db: DatabaseService) {}
}
