import { ApiProperty } from '@nestjs/swagger';
import { ExpenseFileDto } from './expense-file.dto.js';
import {
  ENTRY_TYPES,
  PAYMENT_METHODS,
  type EntryType,
  type PaymentMethod,
} from '../schemas/expense-entry.schema.js';

export const EXPENSE_STATUSES = ['unpaid', 'partially_paid', 'paid'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** A linked event; `available` is false once it was deleted (PRD EXP-05). */
export class ExpenseEventDto {
  id: string;

  title: string;

  available: boolean;
}

/** A linked vendor; `available` is false once it was deleted (PRD EXP-05). */
export class ExpenseVendorDto {
  id: string;

  name: string;

  available: boolean;
}

/** Amounts in paise. */
export class ExpenseDto {
  /** Expense ID. */
  id: string;

  title: string;

  category: string;

  /** The ceremonies it is for, in the wedding's order; empty for a general expense. */
  events: ExpenseEventDto[];

  vendor?: ExpenseVendorDto;

  /** The amount agreed. */
  amountPaise: number;

  /** Discounts agreed later, less reversed ones. */
  discountPaise: number;

  /** Extras agreed later, less reversed ones. */
  extraPaise: number;

  /** What is owed in the end: agreed − discounts + extras. */
  finalPaise: number;

  /** Payments, less reversed ones. */
  paidPaise: number;

  /** What is still to pay: final − paid. */
  outstandingPaise: number;

  /** Unpaid (nothing paid), partially paid, or paid (nothing left). */
  @ApiProperty({ enum: EXPENSE_STATUSES })
  status: ExpenseStatus;

  /** Something is still to pay and the due day has passed (India time). */
  overdue: boolean;

  /** The day payment is due (`YYYY-MM-DD`, India time). */
  @ApiProperty({ required: false, format: 'date', example: '2027-02-10' })
  dueDate?: string;

  notes?: string;

  /** How many receipts or documents it keeps (decision 0023). */
  receiptCount: number;

  createdAt: Date;

  updatedAt: Date;
}

export class ExpenseTotalsDto {
  /** What is owed across all expenses: agreed − discounts + extras. */
  finalPaise: number;

  paidPaise: number;

  outstandingPaise: number;

  /** Saved by negotiation: discounts across all expenses. */
  discountPaise: number;

  /** Extras across all expenses. */
  extraPaise: number;

  /** How many expenses are overdue. */
  overdue: number;

  count: number;
}

export class ExpenseListDto {
  /** By due day (soonest first, none last), then name. */
  expenses: ExpenseDto[];

  truncated: boolean;

  /** Over the whole wedding, whatever the list shows. */
  totals: ExpenseTotalsDto;
}

export class EntryPersonDto {
  userId: string;

  /** Missing if the account no longer exists. */
  displayName?: string;
}

/** One line of an expense's history. Amounts are positive; the type says which way they count. */
export class ExpenseEntryDto {
  id: string;

  @ApiProperty({ enum: ENTRY_TYPES })
  type: EntryType;

  amountPaise: number;

  /** The day it happened (`YYYY-MM-DD`, India time). */
  @ApiProperty({ format: 'date', example: '2026-12-01' })
  date: string;

  @ApiProperty({ required: false, enum: PAYMENT_METHODS })
  method?: PaymentMethod;

  note?: string;

  recordedBy: EntryPersonDto;

  /** For a reversal: the entry it undid. */
  reversalOfId?: string;

  /** For a payment, discount or extra: whether it has been reversed. */
  reversed: boolean;

  /** Receipts kept with this entry. */
  receipts: ExpenseFileDto[];

  createdAt: Date;
}

/** An expense with its whole history, newest first. */
export class ExpenseDetailDto {
  expense: ExpenseDto;

  /** The expense's own receipts and documents, in the order added. */
  receipts: ExpenseFileDto[];

  entries: ExpenseEntryDto[];
}

export class ExpenseLedgerDto {
  /** Newest first. */
  entries: ExpenseEntryDto[];
}
