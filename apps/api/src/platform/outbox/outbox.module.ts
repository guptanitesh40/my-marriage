import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxEvent, OutboxEventSchema } from './outbox-event.schema.js';
import { OutboxService } from './outbox.service.js';

/** Writing outbox events. Imported by any domain module whose changes have side effects. */
@Module({
  imports: [MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }])],
  providers: [OutboxService],
  exports: [OutboxService, MongooseModule],
})
export class OutboxModule {}
