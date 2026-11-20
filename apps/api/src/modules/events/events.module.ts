import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { EventsService } from './events.service.js';
import { WeddingEvent, WeddingEventSchema } from './schemas/event.schema.js';

/**
 * Wedding ceremonies. Holds no controllers (see EventsHttpModule), so the
 * worker can import it when reminders need events.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeddingEvent.name, schema: WeddingEventSchema }]),
    WeddingsModule,
  ],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
