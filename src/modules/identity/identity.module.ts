import { Module } from '@nestjs/common';
import { AuthController } from './controllers';
import { UserController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  controllers: [AuthController, UserController],
  exports: [UsersService],
  providers: [UsersService],
})
export class IdentityModule {}
