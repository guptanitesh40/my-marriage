import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * A wedding expense (schema document §4.11, PRD EXP-01 to EXP-05). Money is
 * integer paise. `amountPaise` is the amount agreed; the ledger
 * (`expense_payments`) records what was paid and any discount or extra
 * agreed later (decision 0014). The three `*Paise` totals below are caches
 * of that ledger, changed only in the same transaction as a ledger entry.
 *
 *   final       = amountPaise − discountPaise + extraPaise
 *   outstanding = final − paidPaise   (never negative)
 */
@Schema({ collection: 'expenses', timestamps: true })
export class Expense {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  /** Free text, usually one of the suggested categories. */
  @Prop({ type: String, required: true })
  category: string;

  /**
   * The wedding's events it is for, once each: one payment can cover
   * several ceremonies (decision 0014). Kept if an event is deleted later
   * (PRD EXP-05). Empty for a general expense.
   */
  @Prop({ type: [Types.ObjectId], default: [] })
  eventIds: Types.ObjectId[];

  /** One of the wedding's vendors; kept if the vendor is deleted later (PRD EXP-05). */
  @Prop({ type: Types.ObjectId })
  vendorId?: Types.ObjectId;

  /** The amount agreed, in paise. */
  @Prop({ type: Number, required: true })
  amountPaise: number;

  /** Payments less reversed payments. */
  @Prop({ type: Number, required: true, default: 0 })
  paidPaise: number;

  /** Discounts agreed later, less reversed ones. */
  @Prop({ type: Number, required: true, default: 0 })
  discountPaise: number;

  /** Extras agreed later (a bonus, added work), less reversed ones. */
  @Prop({ type: Number, required: true, default: 0 })
  extraPaise: number;

  /** The day payment is due, in India time, stored as midnight UTC (decision 0014). */
  @Prop({ type: Date })
  dueDate?: Date;

  /**
   * Receipts and documents kept with the expense (`file_assets`, decision
   * 0023), in the order added. Missing on expenses saved before they existed.
   */
  @Prop({ type: [Types.ObjectId], default: [] })
  receiptAssetIds?: Types.ObjectId[];

  /** Private organiser notes. */
  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  /**
   * Set when an owner deletes the expense (decision 0014). The expense and
   * its ledger are kept; it leaves the list and the totals.
   */
  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId })
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type ExpenseDocument = HydratedDocument<Expense>;
export const ExpenseSchema = SchemaFactory.createForClass(Expense);

// Schema document §4.11: by events, by vendor, and by due day (decision 0014).
ExpenseSchema.index({ weddingId: 1, eventIds: 1 });
ExpenseSchema.index({ weddingId: 1, vendorId: 1 });
ExpenseSchema.index({ weddingId: 1, dueDate: 1 });
