import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_FILTERS, type Vendor, type VendorFilters } from '@/lib/vendors/directory';
import { VendorDirectory } from './vendor-directory';
import { VendorDrawer } from './vendor-drawer';

const del = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({
  api: { POST: vi.fn(), PATCH: vi.fn(), GET: vi.fn(), DELETE: del },
}));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

// jsdom has no modal dialogs; these open and close one as a browser would.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

const weddingId = '6740a1b2c3d4e5f601234567';
const haldi = '6740a1b2c3d4e5f601230001';
const sangeet = '6740a1b2c3d4e5f601230002';
const events = [
  { id: haldi, title: 'Haldi', when: 'Thu, 18 Feb 2027 · 10:00 am' },
  { id: sangeet, title: 'Sangeet' },
];

function vendor(fields: Partial<Vendor> & Pick<Vendor, 'id' | 'name' | 'category'>): Vendor {
  return {
    events: [],
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
    ...fields,
  };
}

const vendors = [
  vendor({
    id: 'v1',
    name: 'The Marigold Studio',
    category: 'Photography & Videography',
    contactName: 'Rohan Shah',
    phone: '+91 98201 44521',
    email: 'rohan@marigoldstudio.in',
    events: [
      { id: haldi, title: 'Haldi' },
      { id: sangeet, title: 'Sangeet' },
      { id: 'e3', title: 'Wedding' },
      { id: 'e4', title: 'Reception' },
    ],
  }),
  vendor({ id: 'v2', name: 'Cityline Guest Travel', category: 'Transportation' }),
];

const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
beforeEach(() => {
  replaceState.mockClear();
  del.mockReset();
  refresh.mockReset();
});
afterEach(cleanup);

function renderDirectory(
  writable: boolean,
  initialFilters: VendorFilters = NO_FILTERS,
  canDelete = writable,
) {
  render(
    <VendorDrawer
      weddingId={weddingId}
      vendors={vendors}
      events={events}
      writable={writable}
      canDelete={canDelete}
    >
      <VendorDirectory
        weddingId={weddingId}
        vendors={vendors}
        truncated={false}
        events={events}
        initialFilters={initialFilters}
      />
    </VendorDrawer>,
  );
}

const rows = () =>
  screen.queryAllByRole('article').map((row) => row.getAttribute('aria-labelledby'));

describe('VendorDirectory', () => {
  it('shows each vendor’s contact and ceremonies, and says what is missing', () => {
    renderDirectory(true);
    const marigold = screen.getByRole('article', { name: 'The Marigold Studio' });
    expect(
      within(marigold).getByRole('link', { name: '+91 98201 44521' }).getAttribute('href'),
    ).toBe('tel:+919820144521');
    expect(marigold.textContent).toContain('+1 more');
    expect(marigold.textContent).toContain('(4 events)');
    const cityline = screen.getByRole('article', { name: 'Cityline Guest Travel' });
    expect(cityline.textContent).toContain('Not added');
    expect(cityline.textContent).toContain('No events linked');
    expect(screen.getByText('Showing 2 vendors')).toBeTruthy();
  });

  it('filters by words, category and ceremony, keeping them in the address', () => {
    renderDirectory(true);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search vendors' }), {
      target: { value: 'rohan' },
    });
    expect(rows()).toHaveLength(1);
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      `/weddings/${weddingId}/vendors?q=rohan`,
    );
    expect(screen.getByText('Showing 1 of 2 vendors')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    fireEvent.change(screen.getByLabelText('Ceremony'), { target: { value: 'none' } });
    expect(screen.getByRole('article', { name: 'Cityline Guest Travel' })).toBeTruthy();
    expect(rows()).toHaveLength(1);
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      `/weddings/${weddingId}/vendors?eventId=none`,
    );
  });

  it('shows a no-results state that clears the filters', () => {
    renderDirectory(true, { q: 'fireworks', category: '', eventId: '' });
    expect(screen.getByRole('heading', { name: 'No matching vendors found' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(rows()).toHaveLength(2);
  });

  it('opens a vendor’s details, then the edit form', () => {
    renderDirectory(true);
    fireEvent.click(
      screen.getByRole('button', { name: /View details\s*for Cityline Guest Travel/ }),
    );
    const drawer = screen.getByRole('dialog', { name: 'Cityline Guest Travel' });
    expect(drawer.textContent).toContain('No contact person added');
    expect(drawer.textContent).toContain('Not linked to any ceremony yet.');
    expect(drawer.textContent).toContain('No address added');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Edit vendor' }));
    expect(screen.getByLabelText<HTMLInputElement>(/^Vendor \/ business name/).value).toBe(
      'Cityline Guest Travel',
    );
  });

  it('shows ceremony dates in the details', () => {
    renderDirectory(true);
    fireEvent.click(screen.getByRole('button', { name: /View details\s*for The Marigold Studio/ }));
    const drawer = screen.getByRole('dialog', { name: 'The Marigold Studio' });
    expect(drawer.textContent).toContain('Thu, 18 Feb 2027 · 10:00 am');
    expect(drawer.textContent).toContain('Date to be decided');
  });

  it('can only be read when the wedding is archived', () => {
    renderDirectory(false);
    expect(screen.queryByRole('button', { name: /^Edit / })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /View details\s*for The Marigold Studio/ }));
    expect(screen.queryByRole('button', { name: 'Edit vendor' })).toBeNull();
  });

  it('lets an owner delete a vendor after confirming', async () => {
    del.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { status: 204, ok: true },
    });
    renderDirectory(true);
    fireEvent.click(
      screen.getByRole('button', { name: /View details\s*for Cityline Guest Travel/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('heading', { name: 'Delete Cityline Guest Travel?' })).toBeTruthy();
    expect(del).not.toHaveBeenCalled();
    const confirm = screen.getByRole('heading', { name: 'Delete Cityline Guest Travel?' })
      .parentElement as HTMLElement;
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
      await Promise.resolve();
    });
    expect(del).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/vendors/{vendorId}', {
      params: { path: { weddingId, vendorId: 'v2' } },
    });
    expect(screen.getByText('Cityline Guest Travel was deleted.')).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it('says why a delete failed and keeps the vendor', async () => {
    del.mockResolvedValue({
      data: undefined,
      error: { error: { code: 'OWNER_REQUIRED', message: 'Only the couple can do this.' } },
      response: { status: 403, ok: false },
    });
    renderDirectory(true);
    fireEvent.click(
      screen.getByRole('button', { name: /View details\s*for Cityline Guest Travel/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = screen.getByRole('heading', { name: 'Delete Cityline Guest Travel?' })
      .parentElement as HTMLElement;
    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
      await Promise.resolve();
    });
    expect(within(confirm).getByRole('alert').textContent).toContain(
      'Only the couple can do this.',
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('offers Delete to owners only', () => {
    renderDirectory(true, NO_FILTERS, false);
    fireEvent.click(
      screen.getByRole('button', { name: /View details\s*for Cityline Guest Travel/ }),
    );
    expect(screen.getByRole('button', { name: 'Edit vendor' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });
});
