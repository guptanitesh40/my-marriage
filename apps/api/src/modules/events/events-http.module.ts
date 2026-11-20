import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsModule } from './events.module.js';

/** The events endpoints. API only: the worker imports EventsModule, never this. */
@Module({
  imports: [EventsModule],
  controllers: [EventsController],
})
export class EventsHttpModule {}
