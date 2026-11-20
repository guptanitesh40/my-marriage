import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Connection, type Model, type UpdateQuery } from 'mongoose';
import { parseObjectId } from '../../platform/mongo.js';
import { Traced } from '../../platform/tracing.js';
import { AccountsService } from '../auth/accounts.service.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { todayIn } from '../events/event-time.js';
import { EventsService } from '../events/events.service.js';
import { VendorsService } from '../vendors/vendors.service.js';
import { WeddingAccessService } from '../weddings/wedding-access.service.js';
import { weddingArchived } from '../weddings/wedding-errors.js';
import type { CreateExpenseDto } from './dto/create-expense.dto.js';
import type {
  ExpenseDetailDto,
  ExpenseDto,
  ExpenseEntryDto,
  ExpenseLedgerDto,
  ExpenseListDto,
  ExpenseStatus,
  ExpenseTotalsDto,
} from './dto/expense.dto.js';
import type {
  RecordAdjustmentDto,
  RecordPaymentDto,
  ReverseEntryDto,
} from './dto/ledger-input.dto.js';
import type { UpdateExpenseDto } from './dto/update-expense.dto.js';
import {
  alreadyReversed,
  amountBelowPaid,
  discountTooLarge,
  entryNotFound,
  expenseNotFound,
  futureDate,
  paymentTooLarge,
  reversalBelowPaid,
  reversalNotReversible,
  unknownEvent,
  unknownVendor,
} from './expense-errors.js';
import { EXPENSE_LIST_LIMIT, EXPENSE_TIME_ZONE } from './expense-policy.js';
import { ExpenseEntry, type EntryType } from './schemas/expense-entry.schema.js';
import { Expense } from './schemas/expense.schema.js';

type StoredExpense = Expense & { _id: Types.ObjectId };
type StoredEntry = ExpenseEntry & { _id: Types.ObjectId };

/** Names of the events and vendors a set of expenses links to. */
interface Labels {
  events: Map<string, { title: string; deleted: boolean }>;
  vendors: Map<string, { name: string; deleted: boolean }>;
  today: string;
}

/** Deleted expenses are kept, with their ledgers, but leave the list and totals. */
const NOT_DELETED = { deletedAt: null } as const;

/** The IDs once each, in the order given. */
function distinctIds(ids: readonly string[]): Types.ObjectId[] {
  return [...new Set(ids.map((id) => id.toLowerCase()))].map((id) => new Types.ObjectId(id));
}

/** What is owed in the end: agreed − discounts + extras. */
function finalOf(expense: Pick<Expense, 'amountPaise' | 'discountPaise' | 'extraPaise'>): number {
  return expense.amountPaise - expense.discountPaise + expense.extraPaise;
}

function outstandingOf(expense: Expense): number {
  return Math.max(0, finalOf(expense) - expense.paidPaise);
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function midnight(dayText: string): Date {
  return new Date(`${dayText}T00:00:00Z`);
}

/** The ledger total each entry type moves; reversals move their original's. */
const CACHE: Record<
  Exclude<EntryType, 'reversal'>,
  'paidPaise' | 'discountPaise' | 'extraPaise'
> = {
  payment: 'paidPaise',
  discount: 'discountPaise',
  extra: 'extraPaise',
};

/**
 * A wedding's expenses and their histories (PRD EXP-01 to EXP-05), for its
 * owners and managers. Money is integer paise. Every payment, discount,
 * extra and reversal is a new ledger entry, written in one transaction with
 * the expense's cached totals and the archive write fence, after checking
 * the rules against the expense as read in that transaction (decision 0014).
 */
@Traced()
@Injectable()
export class ExpensesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Expense.name) private readonly expenses: Model<Expense>,
    @InjectModel(ExpenseEntry.name) private readonly entries: Model<ExpenseEntry>,
    private readonly access: WeddingAccessService,
    private readonly events: EventsService,
    private readonly vendors: VendorsService,
    private readonly accounts: AccountsService,
  ) {}

  /**
   * The wedding's expenses, soonest due first (none last), at most
   * EXPENSE_LIST_LIMIT, with totals over all of them. Archived weddings
   * stay readable.
   */
  async list(user: AuthenticatedUser, weddingId: string): Promise<ExpenseListDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const [found, totals] = await Promise.all([
      this.expenses
        .find({ weddingId: wedding._id, ...NOT_DELETED })
        .sort({ createdAt: 1 })
        .limit(EXPENSE_LIST_LIMIT + 1)
        .lean(),
      this.totalsOf(wedding._id),
    ]);
    const shown = found.slice(0, EXPENSE_LIST_LIMIT);
    const labels = await this.labelsOf(wedding._id, shown);
    const expenses = shown.map((expense) => this.toDto(expense, labels));
    expenses.sort(
      (a, b) =>
        (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
        a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }),
    );
    return { expenses, truncated: found.length > EXPENSE_LIST_LIMIT, totals };
  }

  /** The totals alone (the API's `expenses-summary`). */
  async summary(user: AuthenticatedUser, weddingId: string): Promise<ExpenseTotalsDto> {
    const { wedding } = await this.access.require(user, weddingId);
    return this.totalsOf(wedding._id);
  }

  /** One expense with its whole history. */
  async get(
    user: AuthenticatedUser,
    weddingId: string,
    expenseId: string,
  ): Promise<ExpenseDetailDto> {
    const { wedding } = await this.access.require(user, weddingId);
    const id = parseObjectId(expenseId);
    if (!id) throw expenseNotFound();
    const expense = await this.expenses
      .findOne({ _id: id, weddingId: wedding._id, ...NOT_DELETED })
      .lean();
    if (!expense) throw expenseNotFound();
    return this.detailOf(expense);
  }

  /**
   * Adds an expense to an active wedding. Its event and vendor are checked,
   * and it is written, in one transaction with the write fence.
   */
  async create(
    user: AuthenticatedUser,
    weddingId: string,
    input: CreateExpenseDto,
  ): Promise<ExpenseDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const eventIds = distinctIds(input.eventIds ?? []);
    const vendorId = input.vendorId ? new Types.ObjectId(input.vendorId) : undefined;
    const record: Omit<Expense, 'createdAt' | 'updatedAt'> = {
      weddingId: wedding._id,
      title: input.title,
      category: input.category,
      amountPaise: input.amountPaise,
      paidPaise: 0,
      discountPaise: 0,
      extraPaise: 0,
      eventIds,
      ...(vendorId ? { vendorId } : {}),
      ...(input.dueDate ? { dueDate: midnight(input.dueDate) } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      createdBy: userId,
    };

    const created = await this.connection.transaction(async (session) => {
      await this.checkLinks(wedding._id, eventIds, vendorId, session);
      await this.access.raiseWriteFence(wedding._id, session);
      const [expense] = await this.expenses.create([record], { session });
      return expense;
    });
    if (!created) throw new Error('The expense was not created');
    const stored = created.toObject();
    return this.toDto(stored, await this.labelsOf(wedding._id, [stored]));
  }

  /**
   * Changes an expense's details. Its history is never changed here; the
   * agreed amount can't drop below what has been paid, given any discounts
   * and extras. An event or vendor deleted since stays linked unless changed.
   */
  async update(
    user: AuthenticatedUser,
    weddingId: string,
    expenseId: string,
    input: UpdateExpenseDto,
  ): Promise<ExpenseDto> {
    const { wedding } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(expenseId);
    if (!id) throw expenseNotFound();
    const filter = { _id: id, weddingId: wedding._id, ...NOT_DELETED };
    const eventIds = input.eventIds ? distinctIds(input.eventIds) : undefined;

    const updated = await this.connection.transaction(async (session) => {
      const expense = await this.expenses.findOne(filter).session(session).lean();
      if (!expense) throw expenseNotFound();
      // Only new links are checked: one kept as it was may point at a deleted record.
      const linked = new Set(expense.eventIds.map((eventId) => eventId.toHexString()));
      const newEvents = (eventIds ?? []).filter((eventId) => !linked.has(eventId.toHexString()));
      const vendorId =
        input.vendorId && input.vendorId.toLowerCase() !== expense.vendorId?.toHexString()
          ? new Types.ObjectId(input.vendorId)
          : undefined;
      await this.checkLinks(wedding._id, newEvents, vendorId, session);
      if (input.amountPaise !== undefined) {
        const changed = { ...expense, amountPaise: input.amountPaise };
        if (finalOf(changed) < expense.paidPaise) {
          throw amountBelowPaid(expense.paidPaise + expense.discountPaise - expense.extraPaise);
        }
      }
      await this.access.raiseWriteFence(wedding._id, session);
      return this.expenses
        .findOneAndUpdate(filter, this.changeOf(input, eventIds), {
          returnDocument: 'after',
          session,
        })
        .lean();
    });
    if (!updated) throw expenseNotFound();
    return this.toDto(updated, await this.labelsOf(wedding._id, [updated]));
  }

  /** Records money paid outside the app; never more than is still owed (PRD EXP-02, EXP-03). */
  async recordPayment(
    user: AuthenticatedUser,
    weddingId: string,
    expenseId: string,
    input: RecordPaymentDto,
  ): Promise<ExpenseDetailDto> {
    if (input.paidAt > todayIn(EXPENSE_TIME_ZONE)) throw futureDate('paidAt');
    return this.addEntry(user, weddingId, expenseId, (expense) => {
      if (input.amountPaise > outstandingOf(expense)) throw paymentTooLarge(outstandingOf(expense));
      return {
        entry: {
          entryType: 'payment',
          amountPaise: input.amountPaise,
          paidAt: midnight(input.paidAt),
          ...(input.method ? { method: input.method } : {}),
          ...(input.note ? { note: input.note } : {}),
        },
        change: { $inc: { paidPaise: input.amountPaise } },
      };
    });
  }

  /**
   * Records a discount the vendor accepted, or an extra such as a bonus
   * (decision 0014). A discount can't be more than is still to pay, so what
   * is owed never drops below what has been paid.
   */
  async recordAdjustment(
    user: AuthenticatedUser,
    weddingId: string,
    expenseId: string,
    input: RecordAdjustmentDto,
  ): Promise<ExpenseDetailDto> {
    if (input.date > todayIn(EXPENSE_TIME_ZONE)) throw futureDate('date');
    return this.addEntry(user, weddingId, expenseId, (expense) => {
      if (input.kind === 'discount' && input.amountPaise > outstandingOf(expense)) {
        throw discountTooLarge(outstandingOf(expense));
      }
      return {
        entry: {
          entryType: input.kind,
          amountPaise: input.amountPaise,
          paidAt: midnight(input.date),
          ...(input.note ? { note: input.note } : {}),
        },
        change: { $inc: { [CACHE[input.kind]]: input.amountPaise } },
      };
    });
  }

  /**
   * Undoes a payment, discount or extra with a reversal entry; both stay in
   * the history. Each entry can be reversed once, and undoing an extra can't
   * leave more paid than is owed.
   */
  async reverse(
    user: AuthenticatedUser,
    weddingId: string,
    expenseId: string,
    input: ReverseEntryDto,
  ): Promise<ExpenseDetailDto> {
    const entryId = new Types.ObjectId(input.entryId);
    return this.addEntry(user, weddingId, expenseId, async (expense, session) => {
      const original = await this.entries
        .findOne({ _id: entryId, weddingId: expense.weddingId, expenseId: expense._id })
        .session(session)
        .lean();
      if (!original) throw entryNotFound();
      if (original.entryType === 'reversal') throw reversalNotReversible();
      const undone = await this.entries.exists({ reversalOfId: entryId }).session(session);
      if (undone) throw alreadyReversed();
      if (
        original.entryType === 'extra' &&
        finalOf(expense) - original.amountPaise < expense.paidPaise
      ) {
        throw reversalBelowPaid();
      }
      return {
        entry: {
          entryType: 'reversal',
          amountPaise: original.amountPaise,
          paidAt: midnight(todayIn(EXPENSE_TIME_ZONE)),
          reversalOfId: entryId,
          ...(input.note ? { note: input.note } : {}),
        },
        change: { $inc: { [CACHE[original.entryType]]: -original.amountPaise } },
      };
    });
  }

  /**
   * Deletes an expense (owners only, as for events and vendors). It is kept,
   * with its whole ledger, marked with when and by whom; it leaves the list
   * and the totals, and can no longer be read or changed.
   */
  async remove(user: AuthenticatedUser, weddingId: string, expenseId: string): Promise<void> {
    const { wedding, userId } = await this.access.require(user, weddingId, ['owner']);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(expenseId);
    if (!id) throw expenseNotFound();

    await this.connection.transaction(async (session) => {
      await this.access.raiseWriteFence(wedding._id, session);
      const deleted = await this.expenses.updateOne(
        { _id: id, weddingId: wedding._id, ...NOT_DELETED },
        { $set: { deletedAt: new Date(), deletedBy: userId } },
        { session },
      );
      if (deleted.matchedCount === 0) throw expenseNotFound();
    });
  }

  /** The expense's ledger alone, newest first. */
  async ledger(
    user: AuthenticatedUser,
    weddingId: string,
    expenseId: string,
  ): Promise<ExpenseLedgerDto> {
    const detail = await this.get(user, weddingId, expenseId);
    return { entries: detail.entries };
  }

  /**
   * Reads the expense, lets `plan` check it and say which entry to add and
   * how its totals change, then writes both with the write fence, all in one
   * transaction. Two entries at once on one expense conflict, and the later
   * one is retried against the new totals.
   */
  private async addEntry(
    user: AuthenticatedUser,
    weddingId: string,
    expenseId: string,
    plan: (
      expense: StoredExpense,
      session: ClientSession,
    ) =>
      | {
          entry: Omit<ExpenseEntry, 'weddingId' | 'expenseId' | 'recordedBy' | 'createdAt'>;
          change: UpdateQuery<Expense>;
        }
      | Promise<{
          entry: Omit<ExpenseEntry, 'weddingId' | 'expenseId' | 'recordedBy' | 'createdAt'>;
          change: UpdateQuery<Expense>;
        }>,
  ): Promise<ExpenseDetailDto> {
    const { wedding, userId } = await this.access.require(user, weddingId);
    if (wedding.status !== 'active') throw weddingArchived();
    const id = parseObjectId(expenseId);
    if (!id) throw expenseNotFound();
    const filter = { _id: id, weddingId: wedding._id, ...NOT_DELETED };

    const updated = await this.connection.transaction(async (session) => {
      const expense = await this.expenses.findOne(filter).session(session).lean();
      if (!expense) throw expenseNotFound();
      const { entry, change } = await plan(expense, session);
      await this.access.raiseWriteFence(wedding._id, session);
      try {
        await this.entries.create(
          [{ ...entry, weddingId: wedding._id, expenseId: id, recordedBy: userId }],
          { session },
        );
      } catch (error) {
        // The unique reversal index: someone reversed it a moment ago.
        if ((error as { code?: number }).code === 11000) throw alreadyReversed();
        throw error;
      }
      return this.expenses
        .findOneAndUpdate(filter, change, { returnDocument: 'after', session })
        .lean();
    });
    if (!updated) throw expenseNotFound();
    return this.detailOf(updated);
  }

  /** New links must be the wedding's own, not deleted, read in the transaction. */
  private async checkLinks(
    weddingId: Types.ObjectId,
    eventIds: Types.ObjectId[],
    vendorId: Types.ObjectId | undefined,
    session: ClientSession,
  ): Promise<void> {
    if ((await this.events.countExisting(weddingId, eventIds, session)) !== eventIds.length) {
      throw unknownEvent();
    }
    if (vendorId && !(await this.vendors.exists(weddingId, vendorId, session))) {
      throw unknownVendor();
    }
  }

  /** The update for an expense's details: left out stays, null clears. */
  private changeOf(input: UpdateExpenseDto, eventIds?: Types.ObjectId[]): UpdateQuery<Expense> {
    const set: Partial<Expense> = {};
    const unset: Record<string, 1> = {};
    if (input.title !== undefined) set.title = input.title;
    if (input.category !== undefined) set.category = input.category;
    if (input.amountPaise !== undefined) set.amountPaise = input.amountPaise;
    if (eventIds) set.eventIds = eventIds;
    if (input.vendorId !== undefined) {
      if (input.vendorId) set.vendorId = new Types.ObjectId(input.vendorId);
      else unset.vendorId = 1;
    }
    if (input.dueDate !== undefined) {
      if (input.dueDate) set.dueDate = midnight(input.dueDate);
      else unset.dueDate = 1;
    }
    if (input.notes !== undefined) {
      if (input.notes) set.notes = input.notes;
      else unset.notes = 1;
    }
    return { $set: set, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) };
  }

  /** Totals over every expense of the wedding, from the cached ledger sums. */
  private async totalsOf(weddingId: Types.ObjectId): Promise<ExpenseTotalsDto> {
    const today = midnight(todayIn(EXPENSE_TIME_ZONE));
    const final = { $add: [{ $subtract: ['$amountPaise', '$discountPaise'] }, '$extraPaise'] };
    const outstanding = { $max: [0, { $subtract: [final, '$paidPaise'] }] };
    const [row] = await this.expenses.aggregate<{
      finalPaise: number;
      paidPaise: number;
      outstandingPaise: number;
      discountPaise: number;
      extraPaise: number;
      overdue: number;
      count: number;
    }>([
      { $match: { weddingId, ...NOT_DELETED } },
      {
        $group: {
          _id: null,
          finalPaise: { $sum: final },
          paidPaise: { $sum: '$paidPaise' },
          outstandingPaise: { $sum: outstanding },
          discountPaise: { $sum: '$discountPaise' },
          extraPaise: { $sum: '$extraPaise' },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: [outstanding, 0] },
                    { $ifNull: ['$dueDate', false] },
                    { $lt: ['$dueDate', today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0 } },
    ]);
    return (
      row ?? {
        finalPaise: 0,
        paidPaise: 0,
        outstandingPaise: 0,
        discountPaise: 0,
        extraPaise: 0,
        overdue: 0,
        count: 0,
      }
    );
  }

  private async labelsOf(weddingId: Types.ObjectId, expenses: StoredExpense[]): Promise<Labels> {
    const unique = (ids: Types.ObjectId[]) => [
      ...new Map(ids.map((id) => [id.toHexString(), id])).values(),
    ];
    const [events, vendors] = await Promise.all([
      this.events.labels(weddingId, unique(expenses.flatMap((expense) => expense.eventIds))),
      this.vendors.labels(
        weddingId,
        unique(expenses.flatMap((expense) => (expense.vendorId ? [expense.vendorId] : []))),
      ),
    ]);
    return { events, vendors, today: todayIn(EXPENSE_TIME_ZONE) };
  }

  private async detailOf(expense: StoredExpense): Promise<ExpenseDetailDto> {
    const [labels, entries] = await Promise.all([
      this.labelsOf(expense.weddingId, [expense]),
      this.entries
        .find({ weddingId: expense.weddingId, expenseId: expense._id })
        .sort({ createdAt: -1, _id: -1 })
        .lean(),
    ]);
    const names = await this.accounts.displayNames([
      ...new Map(
        entries.map((entry) => [entry.recordedBy.toHexString(), entry.recordedBy]),
      ).values(),
    ]);
    const reversed = new Set(
      entries.flatMap((entry) => (entry.reversalOfId ? [entry.reversalOfId.toHexString()] : [])),
    );
    return {
      expense: this.toDto(expense, labels),
      entries: entries.map((entry) => this.entryDto(entry, names, reversed)),
    };
  }

  private entryDto(
    entry: StoredEntry,
    names: Map<string, string>,
    reversed: Set<string>,
  ): ExpenseEntryDto {
    const id = entry._id.toHexString();
    const by = entry.recordedBy.toHexString();
    const name = names.get(by);
    return {
      id,
      type: entry.entryType,
      amountPaise: entry.amountPaise,
      date: day(entry.paidAt),
      ...(entry.method ? { method: entry.method } : {}),
      ...(entry.note ? { note: entry.note } : {}),
      recordedBy: { userId: by, ...(name ? { displayName: name } : {}) },
      ...(entry.reversalOfId ? { reversalOfId: entry.reversalOfId.toHexString() } : {}),
      reversed: reversed.has(id),
      createdAt: entry.createdAt,
    };
  }

  private toDto(expense: StoredExpense, labels: Labels): ExpenseDto {
    const finalPaise = finalOf(expense);
    const outstandingPaise = outstandingOf(expense);
    const status: ExpenseStatus =
      outstandingPaise === 0 ? 'paid' : expense.paidPaise > 0 ? 'partially_paid' : 'unpaid';
    const dueDate = expense.dueDate ? day(expense.dueDate) : undefined;
    // In the wedding's order, as the labels come.
    const linked = new Set(expense.eventIds.map((eventId) => eventId.toHexString()));
    const events = [...labels.events]
      .filter(([eventId]) => linked.has(eventId))
      .map(([eventId, event]) => ({ id: eventId, title: event.title, available: !event.deleted }));
    const vendorId = expense.vendorId?.toHexString();
    const vendor = vendorId ? labels.vendors.get(vendorId) : undefined;
    return {
      id: expense._id.toHexString(),
      title: expense.title,
      category: expense.category,
      events,
      ...(vendorId && vendor
        ? { vendor: { id: vendorId, name: vendor.name, available: !vendor.deleted } }
        : {}),
      amountPaise: expense.amountPaise,
      discountPaise: expense.discountPaise,
      extraPaise: expense.extraPaise,
      finalPaise,
      paidPaise: expense.paidPaise,
      outstandingPaise,
      status,
      overdue: outstandingPaise > 0 && dueDate !== undefined && dueDate < labels.today,
      ...(dueDate ? { dueDate } : {}),
      ...(expense.notes ? { notes: expense.notes } : {}),
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
