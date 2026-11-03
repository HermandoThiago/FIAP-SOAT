import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { CustomersModule } from '../customers/customers.module';
import { IdentityModule } from '../identity/identity.module';
import {
  MetricsController,
  ServiceOrdersController,
  TrackingController,
} from './controllers';
import {
  MetricsService,
  ServiceOrderItemsService,
  ServiceOrdersService,
  TrackingService,
} from './services';

@Module({
  imports: [IdentityModule, CustomersModule, CatalogModule],
  controllers: [ServiceOrdersController, TrackingController, MetricsController],
  providers: [
    ServiceOrdersService,
    ServiceOrderItemsService,
    TrackingService,
    MetricsService,
  ],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
