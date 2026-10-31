import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { CustomersModule } from '../customers/customers.module';
import { IdentityModule } from '../identity/identity.module';
import { ServiceOrdersController } from './controllers';
import { ServiceOrderItemsService, ServiceOrdersService } from './services';

@Module({
  imports: [IdentityModule, CustomersModule, CatalogModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService, ServiceOrderItemsService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
