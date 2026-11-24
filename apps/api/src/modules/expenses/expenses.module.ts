import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { EventsModule } from '../events/events.module.js';
import { VendorsModule } from '../vendors/vendors.module.js';
import { WeddingsModule } from '../weddings/weddings.module.js';
import { ExpenseEntry, ExpenseEntrySchema } from './schemas/expense-entry.schema.js';
import { Expense, ExpenseSchema } from './schemas/expense.schema.js';
import { ExpensesService } from './expenses.service.js';
import { ExpenseFilesService } from './expense-files.service.js';
import { FileAsset, FileAssetSchema } from '../../platform/storage/file-asset.schema.js';

/** Wedding expenses and their payment ledger. No controllers (see ExpensesHttpModule). */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: ExpenseEntry.name, schema: ExpenseEntrySchema },
      { name: FileAsset.name, schema: FileAssetSchema },
    ]),
    AuthModule,
    WeddingsModule,
    EventsModule,
    VendorsModule,
  ],
  providers: [ExpensesService, ExpenseFilesService],
  exports: [ExpensesService, ExpenseFilesService],
})
export class ExpensesModule {}
