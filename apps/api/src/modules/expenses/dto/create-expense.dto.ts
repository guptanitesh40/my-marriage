import { OptionalTextBlockField } from '../../events/dto/fields.js';
import { OptionalIdField } from '../../tasks/dto/fields.js';
import { EventIdsField } from '../../vendors/dto/fields.js';
import { OptionalDateField, TextLineField } from '../../weddings/dto/fields.js';
import { EXPENSE_LIMITS, RECEIPT_LIMITS } from '../expense-policy.js';
import { MoneyPaiseField, ReceiptIdsField } from './fields.js';

export const TITLE_EMPTY = 'Enter an expense name.';
export const CATEGORY_EMPTY = 'Choose a category.';
export const VENDOR_MESSAGE = 'Choose one of this wedding’s vendors, or No vendor.';

/**
 * A new expense (PRD EXP-01). The name, category and agreed amount are
 * required; it may be for no event or for several, with no vendor or due
 * day. Payments, discounts
 * and extras are recorded afterwards, in its history.
 */
export class CreateExpenseDto {
  @TextLineField({
    maxLength: EXPENSE_LIMITS.title,
    empty: TITLE_EMPTY,
    example: 'Wedding photography package',
  })
  title: string;

  /** Any text; the app suggests common ones, such as Catering. */
  @TextLineField({
    maxLength: EXPENSE_LIMITS.category,
    empty: CATEGORY_EMPTY,
    example: 'Photography & Videography',
  })
  category: string;

  /** The amount agreed, in paise. */
  @MoneyPaiseField()
  amountPaise: number;

  /** This wedding's events it is for, if any; repeats ignored. */
  @EventIdsField()
  eventIds?: string[];

  /** One of this wedding's vendors. */
  @OptionalIdField({ message: VENDOR_MESSAGE })
  vendorId?: string;

  /** The day payment is due (`YYYY-MM-DD`, India time). */
  @OptionalDateField()
  dueDate?: string;

  /** Private notes for the wedding's owners and managers. */
  @OptionalTextBlockField({
    maxLength: EXPENSE_LIMITS.notes,
    example: 'Covers 3 drone cinematographers and 4 candid shooters.',
  })
  notes?: string;

  /** Receipts or documents uploaded for it (decision 0023). */
  @ReceiptIdsField(RECEIPT_LIMITS.perExpense)
  receiptAssetIds?: string[];
}
