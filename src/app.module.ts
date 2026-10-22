import { Module } from '@nestjs/common';
import { IdentityModule } from './modules/identity/identity.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [SharedModule, IdentityModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
