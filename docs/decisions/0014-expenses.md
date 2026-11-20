# 0014 — Expenses, payments, discounts and extras

Date: 2026-11-20 · Status: accepted

## Why

Expense management is milestone M8: a wedding's private ledger of costs
and the payments made against them (PRD EXP-01 to EXP-05), from the Stitch
screens "Expenses Management — My Marriage" (desktop and mobile; exported
to `docs/design/expense-management/`). The owner added one requirement
while approving it: at a wedding the final amount often differs from the
deal. The family negotiates 5–10% off, or pays a vendor more because the
work was good. The PRD allows for this: EXP-03 refuses payments above what
remains "unless an authorized explicit adjustment is recorded".

## The money model

- **Integer paise everywhere** (₹80,000 is 8000000), up to ₹100 crore. The
  web turns typed rupees ("80,000.50") into paise by string arithmetic,
  never floating point.
- An expense keeps the **agreed amount** (`amountPaise`), the deal as made.
- Its **ledger** (`expense_payments`, never edited or deleted) holds four
  kinds of entry: `payment` (money paid outside the app), `discount` (the
  vendor agreed to take less), `extra` (more is owed, such as a bonus), and
  `reversal` (undoes one earlier entry, which stays in the history).
- **Final = agreed − discounts + extras; outstanding = final − paid.**
  Status is unpaid (nothing paid), partially paid, or paid (nothing left).
  Overdue: something is outstanding and the due day has passed (India).
- The expense caches `paidPaise`, `discountPaise` and `extraPaise`. They
  change only in the same transaction as the ledger entry that moves them,
  after the rules are checked against the expense as read in that
  transaction, with the archive write fence. Two entries at once on one
  expense conflict, and the later one is retried against the new totals
  (tested: two ₹30,000 payments against ₹50,000 outstanding, one succeeds).

## Rules

- A **payment** can't exceed what is outstanding, nor be dated after
  today (India). Method is optional (cash, bank transfer, card, cheque,
  other).
- A **discount** can't exceed what is outstanding: what is owed never
  drops below what has been paid. (A refund after overpaying is not
  modelled.)
- An **extra** has no upper limit beyond the money limit. It is how to pay
  more than the deal: record the extra, then the payment.
- A **reversal** undoes one payment, discount or extra, once (a unique
  index on `reversalOfId` backs the check). A reversal can't be reversed.
  Undoing an extra that has already been paid is refused (409
  `REVERSAL_BELOW_PAID`): reverse a payment first.
- **Editing** an expense never touches its ledger. The agreed amount can't
  drop below paid + discounts − extras.
- **Days, not instants.** As for tasks (decision 0012), the due date and
  each entry's date are days in India time (`YYYY-MM-DD`), stored as
  midnight UTC: the API document's `dueAt` is stored as `dueDate`, and
  `paidAt` takes a day.
- **Links.** An expense can cover **several events** (`eventIds`, at most
  50, once each; empty for a general expense), because one payment often
  covers several ceremonies; the owner asked for this. The schema and API
  documents had one `eventId`; migration `0009-expense-events` converts it.
  The events and the vendor must be the wedding's own and not deleted when
  chosen. If one is deleted later, the expense keeps it, shown as "no
  longer available" (PRD EXP-05); saving the expense with it still ticked
  keeps it. Filtering by an event finds every expense that covers it.
- Owners and managers have the same rights (PRD permission matrix).
  Archived weddings are read-only. Expenses never reach a public route.

## API

Added to the agreed routes: `POST .../expenses/{expenseId}/adjustments`
(`{ kind: discount | extra, amountPaise, date, note? }`). The reversal
route, `POST .../payments/reverse`, takes `{ entryId, note? }` and works for
discounts and extras as well as payments. Ledger writes answer with the
expense and its whole history, so the page can show the new totals at
once. `GET .../expenses` returns every expense (up to 500) with totals over
all of them; the page filters in the browser, as for vendors.

## Deleting an expense

Added at the owner's request, on the same terms as events and vendors
(decisions 0011 and 0013): `DELETE .../expenses/{expenseId}`, owners only
(403 `OWNER_REQUIRED` for managers), not on an archived wedding, through
the write fence. It is a **soft delete**: the expense and its whole ledger
are kept, with `deletedAt` and `deletedBy`, and it leaves the list, the
totals, and every read and write (404 afterwards). There is no restore in
the app. In the app: Delete in the expense's details, after a confirmation
that says how much paid money leaves the totals.

## Left out

- **Receipts.** The PRD's optional receipt file needs private S3 uploads,
  which are not built. No upload control is shown; `receiptAssetIds` is
  refused until then.
- **An audit trail of detail edits** (PRD EXP-03). Money changes are fully
  audited by the ledger; edits to the name, category, links or agreed
  amount are not yet recorded, as no audit module exists.
- From the design: Export, the grid view toggle, the "Quick action"
  button, and Stitch's invented mobile tab bar.
