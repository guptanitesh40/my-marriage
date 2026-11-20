import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksModule } from './tasks.module.js';

/** The tasks endpoints. API only: the worker imports TasksModule, never this. */
@Module({
  imports: [TasksModule],
  controllers: [TasksController],
})
export class TasksHttpModule {}
