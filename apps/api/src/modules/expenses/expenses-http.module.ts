import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesModule } from './expenses.module.js';

/** The expense endpoints. API only: the worker imports ExpensesModule, never this. */
@Module({
  imports: [ExpensesModule],
  controllers: [ExpensesController],
})
export class ExpensesHttpModule {}
