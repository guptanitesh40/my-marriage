import { OptionalTextBlockField } from '../../events/dto/fields.js';
import { OptionalIdField } from '../../tasks/dto/fields.js';
import { EventIdsField } from '../../vendors/dto/fields.js';
import { OptionalDateField, TextLineField } from '../../weddings/dto/fields.js';
import { EXPENSE_LIMITS, RECEIPT_LIMITS } from '../expense-policy.js';
import { CATEGORY_EMPTY, TITLE_EMPTY, VENDOR_MESSAGE } from './create-expense.dto.js';
import { MoneyPaiseField, ReceiptIdsField } from './fields.js';

/**
 * Changes to an expense's details (PRD EXP-01). Fields left out stay as
 * they are; `null` clears an optional one; `eventIds` replaces the events. The agreed amount can change,
 * but never to less than what has been paid, given any discounts and
 * extras. The history itself is never changed here.
 */
export class UpdateExpenseDto {
  @TextLineField({
    maxLength: EXPENSE_LIMITS.title,
    empty: TITLE_EMPTY,
    example: 'Wedding photography package',
    optional: true,
  })
  title?: string;

  @TextLineField({
    maxLength: EXPENSE_LIMITS.category,
    empty: CATEGORY_EMPTY,
    example: 'Photography & Videography',
    optional: true,
  })
  category?: string;

  @MoneyPaiseField({ optional: true })
  amountPaise?: number;

  /** Replaces its events; `[]` makes it a general expense. */
  @EventIdsField()
  eventIds?: string[];

  /** `null` removes the vendor. */
  @OptionalIdField({ message: VENDOR_MESSAGE, nullable: true })
  vendorId?: string | null;

  @OptionalDateField({ nullable: true })
  dueDate?: string | null;

  @OptionalTextBlockField({
    maxLength: EXPENSE_LIMITS.notes,
    example: 'Covers 3 drone cinematographers and 4 candid shooters.',
    nullable: true,
  })
  notes?: string | null;

  /**
   * The expense's files after this change, in order: new uploads are
   * added, files left out are deleted. Left out entirely: unchanged.
   */
  @ReceiptIdsField(RECEIPT_LIMITS.perExpense)
  receiptAssetIds?: string[];
}
