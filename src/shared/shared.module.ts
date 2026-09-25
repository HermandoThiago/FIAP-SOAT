import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CLOCK, SystemClock } from './clock';
import { DomainEventPublisher } from './events/domain-event-publisher';
import { HealthController } from './http/health.controller';
import { ID_GENERATOR, UuidV4IdGenerator } from './id-generator';
import { PrismaService } from './prisma/prisma.service';

// Kernel compartilhado (estrutura-do-repositorio.md §2): PrismaService, relógio, gerador de ids e publicador de eventos,
// disponíveis para todos os módulos sem re-importação (@Global).
@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [HealthController],
  providers: [
    PrismaService,
    DomainEventPublisher,
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidV4IdGenerator },
  ],
  exports: [PrismaService, DomainEventPublisher, CLOCK, ID_GENERATOR],
})
export class SharedModule {}
