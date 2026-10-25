import { Module } from '@nestjs/common';
import { CatalogModule } from './modules/catalog/catalog.module';
import { IdentityModule } from './modules/identity/identity.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [SharedModule, IdentityModule, CatalogModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
