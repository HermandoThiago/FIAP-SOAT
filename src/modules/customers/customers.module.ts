import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CustomersController, VehiclesController } from './controllers';
import { CustomersService, VehiclesService } from './services';

@Module({
  imports: [IdentityModule],
  controllers: [CustomersController, VehiclesController],
  providers: [CustomersService, VehiclesService],
  exports: [CustomersService, VehiclesService],
})
export class CustomersModule {}
