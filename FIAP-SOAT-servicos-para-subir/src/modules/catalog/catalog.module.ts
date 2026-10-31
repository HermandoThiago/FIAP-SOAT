import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ItemController } from './controllers';
import { ServicesController } from './controllers/services.controller';
import { ItemService } from './services';
import { CatalogService } from './services/catalog.service';

@Module({
  imports: [IdentityModule],
  controllers: [ItemController, ServicesController],
  exports: [ItemService, CatalogService],
  providers: [ItemService, CatalogService],
})
export class CatalogModule {}
