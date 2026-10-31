import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { CustomersModule } from '../customers/customers.module';
import { IdentityModule } from '../identity/identity.module';
import { ServiceOrdersController, TrackingController } from './controllers';
import {
  ServiceOrderItemsService,
  ServiceOrdersService,
  TrackingService,
} from './services';

@Module({
  imports: [IdentityModule, CustomersModule, CatalogModule],
  controllers: [ServiceOrdersController, TrackingController],
  providers: [ServiceOrdersService, ServiceOrderItemsService, TrackingService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
