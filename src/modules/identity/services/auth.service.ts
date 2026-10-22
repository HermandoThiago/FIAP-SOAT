import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../shared/database/database.service';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(private readonly db: DatabaseService) {}
}
