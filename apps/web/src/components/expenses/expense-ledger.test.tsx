import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Expense, ExpenseDetail } from '@/lib/expenses/directory';
import { todayInIndia } from '@/lib/weddings/validation';
import { ExpenseDetails } from './expense-details';
import { ExpenseForm } from './expense-form';

const get = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
const del = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { GET: get, POST: post, PATCH: patch, DELETE: del } }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

// jsdom has no modal dialogs; these open and close one as a browser would.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return { data: ok ? body : undefined, error: ok ? undefined : body, response: { status, ok } };
}

const weddingId = '6740a1b2c3d4e5f601234567';
const expense: Expense = {
  id: '6740a1b2c3d4e5f601238888',
  title: 'Wedding photography package',
  category: 'Photography & Videography',
  vendor: { id: '6740a1b2c3d4e5f601239001', name: 'The Marigold Studio', available: true },
  events: [{ id: '6740a1b2c3d4e5f601230001', title: 'Haldi', available: false }],
  amountPaise: 8000000,
  discountPaise: 0,
  extraPaise: 0,
  finalPaise: 8000000,
  paidPaise: 3000000,
  outstandingPaise: 5000000,
  status: 'partially_paid',
  overdue: false,
  dueDate: '2027-02-10',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const person = { userId: '6740a1b2c3d4e5f601239999', displayName: 'Ananya Sharma' };
const detail: ExpenseDetail = {
  expense,
  entries: [
    {
      id: 'e2',
      type: 'payment',
      amountPaise: 2000000,
      date: '2026-12-05',
      method: 'cash',
      note: 'Second instalment',
      recordedBy: person,
      reversed: false,
      createdAt: '2026-12-05T00:00:00.000Z',
    },
    {
      id: 'e1',
      type: 'payment',
      amountPaise: 1000000,
      date: '2026-12-01',
      method: 'bank_transfer',
      recordedBy: person,
      reversed: false,
      createdAt: '2026-12-01T00:00:00.000Z',
    },
  ],
};

const onChanged = vi.fn();

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  refresh.mockReset();
  onChanged.mockReset();
  get.mockResolvedValue(reply(200, { data: detail }));
});
afterEach(cleanup);

async function renderDetails(writable = true, onDeleted?: () => void) {
  await act(async () => {
    render(
      <ExpenseDetails
        weddingId={weddingId}
        expense={expense}
        writable={writable}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onChanged={onChanged}
        onDeleted={onDeleted}
      />,
    );
    await Promise.resolve();
  });
}

async function submit(dialog: HTMLElement, name: RegExp) {
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name }));
    await Promise.resolve();
  });
}

const dialogNamed = (name: string) =>
  screen.getByRole('heading', { name }).closest('dialog') as HTMLElement;

describe('ExpenseDetails', () => {
  it('shows what is owed, paid and outstanding, and the history', async () => {
    await renderDetails();
    expect(screen.getByText('₹80,000')).toBeTruthy();
    expect(screen.getAllByText('₹50,000').length).toBeGreaterThan(0);
    expect(screen.getByText('Payment · Cash')).toBeTruthy();
    expect(screen.getByText('Payment · Bank transfer')).toBeTruthy();
    expect(screen.getByText('“Second instalment”')).toBeTruthy();
    expect(screen.getByText(/Haldi/).textContent).toContain('no longer available');
  });

  it('records a payment, never more than is outstanding', async () => {
    await renderDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    const dialog = dialogNamed('Record payment');
    fireEvent.change(within(dialog).getByLabelText(/^Amount paid/), {
      target: { value: '50,001' },
    });
    await submit(dialog, /^Record payment$/);
    expect(
      within(dialog).getByText('Amount can’t be more than the outstanding ₹50,000.'),
    ).toBeTruthy();
    expect(post).not.toHaveBeenCalled();

    post.mockResolvedValue(reply(201, { data: detail }));
    fireEvent.change(within(dialog).getByLabelText(/^Amount paid/), {
      target: { value: '20,000' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Payment method/), {
      target: { value: 'cheque' },
    });
    await submit(dialog, /^Record payment$/);
    expect(post).toHaveBeenCalledWith(
      '/api/v1/weddings/{weddingId}/expenses/{expenseId}/payments',
      {
        params: { path: { weddingId, expenseId: expense.id } },
        body: { amountPaise: 2000000, paidAt: todayInIndia(), method: 'cheque' },
      },
    );
    expect(onChanged).toHaveBeenCalledWith('Payment of ₹20,000 recorded.');
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('records a negotiated discount, filling 10% of the agreed amount, and shows the effect', async () => {
    await renderDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Discount or extra' }));
    const dialog = dialogNamed('Discount or extra');
    fireEvent.click(within(dialog).getByRole('button', { name: '10%' }));
    expect(within(dialog).getByLabelText<HTMLInputElement>(/^Discount \(₹\)/).value).toBe('8000');
    expect(within(dialog).getByText(/What’s owed: ₹80,000 →/).textContent).toContain('₹72,000');

    post.mockResolvedValue(reply(201, { data: detail }));
    await submit(dialog, /^Record discount$/);
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      body: { kind: 'discount', amountPaise: 800000, date: todayInIndia() },
    });
    expect(onChanged).toHaveBeenCalledWith('Discount of ₹8,000 recorded.');
  });

  it('records an extra, such as a bonus, which may exceed what is outstanding', async () => {
    await renderDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Discount or extra' }));
    const dialog = dialogNamed('Discount or extra');
    fireEvent.click(within(dialog).getByLabelText(/^Extra/));
    fireEvent.change(within(dialog).getByLabelText(/^Extra \(₹\)/), {
      target: { value: '60000' },
    });
    expect(within(dialog).getByText(/What’s owed/).textContent).toContain('₹1,40,000');
    post.mockResolvedValue(reply(201, { data: detail }));
    await submit(dialog, /^Record extra$/);
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      body: { kind: 'extra', amountPaise: 6000000 },
    });
  });

  it('asks before reversing, showing the effect, and keeps the dialog on failure', async () => {
    await renderDetails();
    fireEvent.click(screen.getByRole('button', { name: /^Reverse\s*payment · bank transfer/ }));
    const dialog = dialogNamed('Reverse this entry?');
    expect(dialog.textContent).toContain(
      'Paid goes from ₹30,000 to ₹20,000; outstanding from ₹50,000 to ₹60,000.',
    );
    post.mockResolvedValue(
      reply(409, {
        error: { code: 'ENTRY_ALREADY_REVERSED', message: 'This entry has already been reversed.' },
      }),
    );
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: 'Twice' } });
    await submit(dialog, /^Reverse$/);
    expect(post.mock.calls[0]?.[1]).toMatchObject({ body: { entryId: 'e1', note: 'Twice' } });
    expect(within(dialog).getByRole('alert').textContent).toContain('already been reversed');
    expect(refresh).toHaveBeenCalled();
  });

  it('lets an owner delete it after confirming', async () => {
    const onDeleted = vi.fn();
    del.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { status: 204, ok: true },
    });
    await renderDetails(true, onDeleted);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = dialogNamed('Delete Wedding photography package?');
    expect(dialog.textContent).toContain('along with the ₹30,000 paid on it');
    expect(del).not.toHaveBeenCalled();
    await submit(dialog, /^Delete$/);
    expect(del).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/expenses/{expenseId}', {
      params: { path: { weddingId, expenseId: expense.id } },
    });
    expect(onDeleted).toHaveBeenCalled();
  });

  it('offers Delete to owners only', async () => {
    await renderDetails(true);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('offers nothing to change on an archived wedding', async () => {
    await renderDetails(false);
    expect(screen.queryByRole('button', { name: 'Record payment' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Reverse/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit expense' })).toBeNull();
  });
});

describe('ExpenseForm', () => {
  const choices = {
    events: [{ id: '6740a1b2c3d4e5f601230002', title: 'Sangeet' }],
    vendors: [{ id: '6740a1b2c3d4e5f601239001', name: 'The Marigold Studio' }],
  };

  it('sends the agreed amount in paise, with only what was given', async () => {
    post.mockResolvedValue(reply(201, { data: expense }));
    const onSaved = vi.fn();
    render(
      <ExpenseForm weddingId={weddingId} choices={choices} onCancel={vi.fn()} onSaved={onSaved} />,
    );
    fireEvent.change(screen.getByLabelText(/^Expense name/), {
      target: { value: 'Wedding catering' },
    });
    fireEvent.change(screen.getByLabelText(/^Category/), { target: { value: 'Catering' } });
    fireEvent.change(screen.getByLabelText(/^Agreed amount/), { target: { value: '1,50,000.50' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sangeet' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));
      await Promise.resolve();
    });
    expect(post).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/expenses', {
      params: { path: { weddingId } },
      body: {
        title: 'Wedding catering',
        category: 'Catering',
        amountPaise: 15000050,
        eventIds: ['6740a1b2c3d4e5f601230002'],
      },
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('keeps a deleted event when editing, and clears what was emptied', async () => {
    patch.mockResolvedValue(reply(200, { data: expense }));
    render(
      <ExpenseForm
        weddingId={weddingId}
        expense={expense}
        choices={choices}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: 'Haldi (no longer available)' })
        .checked,
    ).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sangeet' }));
    expect(screen.getByLabelText<HTMLInputElement>(/^Agreed amount/).value).toBe('80000');
    fireEvent.change(screen.getByLabelText(/^Payment due date/), { target: { value: '' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await Promise.resolve();
    });
    expect(patch.mock.calls[0]?.[1]).toMatchObject({
      body: {
        amountPaise: 8000000,
        eventIds: ['6740a1b2c3d4e5f601230001', '6740a1b2c3d4e5f601230002'],
        vendorId: expense.vendor?.id,
        dueDate: null,
        notes: null,
      },
    });
  });

  it('says what is missing before sending anything', async () => {
    render(
      <ExpenseForm weddingId={weddingId} choices={choices} onCancel={vi.fn()} onSaved={vi.fn()} />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));
      await Promise.resolve();
    });
    expect(screen.getByText('Enter an expense name.')).toBeTruthy();
    expect(screen.getByText('Choose a category.')).toBeTruthy();
    expect(screen.getByText('Enter an amount greater than ₹0.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});
