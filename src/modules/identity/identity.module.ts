import { Module } from '@nestjs/common';
import { AuthController } from './controllers';
import { UserController } from './controllers/users.controller';
import { AuthService } from './services';
import { UsersService } from './services/users.service';

@Module({
  controllers: [AuthController, UserController],
  exports: [UsersService, AuthService],
  providers: [UsersService, AuthService],
})
export class IdentityModule {}
