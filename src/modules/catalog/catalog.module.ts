import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ItemController } from './controllers';
import { ServicesController } from './controllers/services.controller';
import { CatalogService, ItemService, StockService } from './services';

@Module({
  imports: [IdentityModule],
  controllers: [ItemController, ServicesController],
  exports: [ItemService, CatalogService, StockService],
  providers: [ItemService, CatalogService, StockService],
})
export class CatalogModule {}
