import { Module } from '@nestjs/common';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CustomersModule } from './modules/customers/customers.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    SharedModule,
    IdentityModule,
    CatalogModule,
    CustomersModule,
    ServiceOrdersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
