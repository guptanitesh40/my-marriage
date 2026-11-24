import { OptionalTextBlockField } from '../../events/dto/fields.js';
import { OptionalChoiceField } from '../../tasks/dto/fields.js';
import { PAYMENT_METHODS, type PaymentMethod } from '../schemas/expense-entry.schema.js';
import { EXPENSE_LIMITS, RECEIPT_LIMITS } from '../expense-policy.js';
import { ChoiceField, DayField, IdField, MoneyPaiseField, ReceiptIdsField } from './fields.js';

/**
 * Money paid outside the app (PRD EXP-02). It can't be more than what is
 * still owed, nor dated in the future.
 */
export class RecordPaymentDto {
  @MoneyPaiseField()
  amountPaise: number;

  /** The day it was paid (`YYYY-MM-DD`, India time). */
  @DayField('2026-12-01')
  paidAt: string;

  @OptionalChoiceField(PAYMENT_METHODS, 'Choose cash, bank transfer, card, cheque or other.')
  method?: PaymentMethod;

  @OptionalTextBlockField({ maxLength: EXPENSE_LIMITS.note, example: 'Advance' })
  note?: string;

  /** The receipt, bank slip or screenshot of the payment (decision 0023). */
  @ReceiptIdsField(RECEIPT_LIMITS.perEntry)
  receiptAssetIds?: string[];
}

export const ADJUSTMENT_KINDS = ['discount', 'extra'] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];

/**
 * A change to what is owed, agreed after the deal (PRD EXP-03, decision
 * 0014): a `discount` the vendor accepted, or an `extra` such as a bonus
 * for great work. A discount can't be more than what is still to pay.
 */
export class RecordAdjustmentDto {
  @ChoiceField(ADJUSTMENT_KINDS, 'Choose a discount or an extra.')
  kind: AdjustmentKind;

  @MoneyPaiseField()
  amountPaise: number;

  /** The day it was agreed (`YYYY-MM-DD`, India time). */
  @DayField('2026-12-10')
  date: string;

  @OptionalTextBlockField({
    maxLength: EXPENSE_LIMITS.note,
    example: 'Agreed 5% off after the final quote.',
  })
  note?: string;

  /** The revised quote or agreement (decision 0023). */
  @ReceiptIdsField(RECEIPT_LIMITS.perEntry)
  receiptAssetIds?: string[];
}

/** Undoes one payment, discount or extra; both stay in the history. */
export class ReverseEntryDto {
  @IdField('Choose an entry from this expense’s history.')
  entryId: string;

  /** Why, for the history. */
  @OptionalTextBlockField({ maxLength: EXPENSE_LIMITS.note, example: 'Entered twice.' })
  note?: string;

  /** Proof of the refund or correction (decision 0023). */
  @ReceiptIdsField(RECEIPT_LIMITS.perEntry)
  receiptAssetIds?: string[];
}
