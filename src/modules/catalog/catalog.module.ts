import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ItemController } from './controllers';
import { ItemService } from './services';

@Module({
  imports: [IdentityModule],
  controllers: [ItemController],
  exports: [ItemService],
  providers: [ItemService],
})
export class CatalogModule {}
