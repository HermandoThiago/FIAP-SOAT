import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { IdentityModule } from '../identity/identity.module';
import { ServiceOrdersController } from './controllers';
import { ServiceOrdersService } from './services';

@Module({
  imports: [IdentityModule, CustomersModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
