import { ConflictException, NotFoundException } from '@nestjs/common';
import { fieldError } from '../weddings/wedding-errors.js';
import { inr } from './expense-policy.js';

/** Also for an expense of another wedding: isolation never says which. */
export function expenseNotFound(): NotFoundException {
  return new NotFoundException({ code: 'EXPENSE_NOT_FOUND', message: 'Expense not found.' });
}

export function entryNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'EXPENSE_ENTRY_NOT_FOUND',
    message: 'That payment is not in this expense’s history.',
  });
}

/** One of the events is not the wedding's own, or was deleted. */
export function unknownEvent() {
  return fieldError('eventIds', 'Choose from this wedding’s events.');
}

export function unknownVendor() {
  return fieldError('vendorId', 'Choose one of this wedding’s vendors, or No vendor.');
}

export function paymentTooLarge(outstandingPaise: number) {
  return fieldError(
    'amountPaise',
    outstandingPaise === 0
      ? 'Nothing is left to pay on this expense.'
      : `Amount can’t be more than the outstanding ${inr(outstandingPaise)}.`,
  );
}

export function discountTooLarge(outstandingPaise: number) {
  return fieldError(
    'amountPaise',
    outstandingPaise === 0
      ? 'Everything has been paid, so there is nothing left to discount.'
      : `A discount can’t be more than the ${inr(outstandingPaise)} still to pay.`,
  );
}

export function amountBelowPaid(minimumPaise: number) {
  return fieldError(
    'amountPaise',
    `The agreed amount can’t be less than ${inr(minimumPaise)}, given what has been paid and any discounts or extras.`,
  );
}

/** Money already paid, or a change already agreed, happened today or before. */
export function futureDate(field: 'paidAt' | 'date') {
  return fieldError(field, 'Choose today or an earlier date.');
}

export function alreadyReversed(): ConflictException {
  return new ConflictException({
    code: 'ENTRY_ALREADY_REVERSED',
    message: 'This entry has already been reversed.',
  });
}

export function reversalNotReversible(): ConflictException {
  return new ConflictException({
    code: 'ENTRY_NOT_REVERSIBLE',
    message: 'A reversal can’t itself be reversed. Record a new entry instead.',
  });
}

/** Undoing an extra would leave more paid than is owed. */
export function reversalBelowPaid(): ConflictException {
  return new ConflictException({
    code: 'REVERSAL_BELOW_PAID',
    message:
      'Reversing this extra would make the amount owed less than what has been paid. Reverse a payment first.',
  });
}
