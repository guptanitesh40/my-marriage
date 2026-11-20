import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

/**
 * What an entry records (decision 0014):
 * - `payment`: money paid outside the app
 * - `discount`: the vendor agreed to take less than the agreed amount
 * - `extra`: more is owed than agreed, such as a bonus for great work
 * - `reversal`: undoes one earlier entry, which stays in the history
 */
export const ENTRY_TYPES = ['payment', 'discount', 'extra', 'reversal'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'cheque', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * One line of an expense's ledger (schema document §4.12): never changed
 * or deleted. A mistake is undone by a `reversal` entry pointing at it.
 */
@Schema({
  collection: 'expense_payments',
  timestamps: { createdAt: true, updatedAt: false },
})
export class ExpenseEntry {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  expenseId: Types.ObjectId;

  @Prop({ type: String, enum: ENTRY_TYPES, required: true })
  entryType: EntryType;

  /** Always positive; the type says which way it counts. */
  @Prop({ type: Number, required: true })
  amountPaise: number;

  /** The day it happened, in India time, stored as midnight UTC. */
  @Prop({ type: Date, required: true })
  paidAt: Date;

  /** For payments only. */
  @Prop({ type: String, enum: PAYMENT_METHODS })
  method?: PaymentMethod;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: Types.ObjectId, required: true })
  recordedBy: Types.ObjectId;

  /** For reversals: the entry undone. Unique, so nothing is undone twice. */
  @Prop({ type: Types.ObjectId })
  reversalOfId?: Types.ObjectId;

  createdAt: Date;
}

export type ExpenseEntryDocument = HydratedDocument<ExpenseEntry>;
export const ExpenseEntrySchema = SchemaFactory.createForClass(ExpenseEntry);

// Schema document §4.12: an expense's history, and the wedding's by day.
ExpenseEntrySchema.index({ weddingId: 1, expenseId: 1, paidAt: 1 });
ExpenseEntrySchema.index({ weddingId: 1, paidAt: 1 });
// An entry can be reversed once (decision 0014).
ExpenseEntrySchema.index(
  { reversalOfId: 1 },
  { unique: true, partialFilterExpression: { reversalOfId: { $exists: true } } },
);
