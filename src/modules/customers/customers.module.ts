import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { VehiclesController } from './controllers';
import { VehiclesService } from './services';

@Module({
  imports: [IdentityModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class CustomersModule {}
