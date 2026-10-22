import { Injectable, Logger } from '@nestjs/common';
import * as argon from 'argon2';
import { randomBytes } from 'crypto';
import { promisify } from 'node:util';
import { DatabaseService } from '../../../shared/database/database.service';
import { RegisterUserDto } from '../dtos';
import { UsersService } from './users.service';

const GENERATE_SALT = promisify(randomBytes);
const SALT_LENGTH = 16;

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly userService: UsersService,
  ) {}

  async register(payload: RegisterUserDto) {
    try {
      const { password, ...rest } = payload;

      const salt = await GENERATE_SALT(SALT_LENGTH);
      const hash = await argon.hash(password, { salt });

      const newUser = await this.userService.createUser(
        { ...rest, password: hash },
        salt,
      );

      return newUser;
    } catch (error) {
      this.logger.error(
        'Erro ao registrar usuário',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }
}
