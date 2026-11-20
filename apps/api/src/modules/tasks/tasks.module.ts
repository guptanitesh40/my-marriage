import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { EventsModule } from '../events/events.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { WeddingTask, WeddingTaskSchema } from './schemas/task.schema.js';
import { TasksService } from './tasks.service.js';

/**
 * Wedding tasks. Holds no controllers (see TasksHttpModule), so the worker
 * can import it when reminders need tasks.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeddingTask.name, schema: WeddingTaskSchema }]),
    AuthModule,
    WeddingsModule,
    EventsModule,
  ],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
