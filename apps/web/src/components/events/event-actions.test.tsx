import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventActions } from './event-actions';
import { EventDrawer } from './event-drawer';

const del = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({
  api: { DELETE: del, POST: vi.fn(), PATCH: vi.fn(), GET: vi.fn() },
}));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const weddingId = '6740a1b2c3d4e5f601234567';
const event = {
  id: '6740a1b2c3d4e5f601234999',
  title: 'Mehendi',
  timeZone: 'Asia/Kolkata',
  state: 'scheduled' as const,
  createdAt: '2026-11-19T10:00:00.000Z',
};
const tasksHref = `/weddings/${weddingId}/tasks?eventId=${event.id}`;

// jsdom has no modal dialogs; these open and close one as a browser would.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

beforeEach(() => {
  del.mockReset();
  refresh.mockReset();
});
afterEach(cleanup);

function renderActions(canDelete: boolean) {
  return render(
    <EventDrawer weddingId={weddingId}>
      <EventActions
        weddingId={weddingId}
        event={event}
        tasksHref={tasksHref}
        canDelete={canDelete}
      />
    </EventDrawer>,
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'More for Mehendi' }));
}

async function confirmDelete() {
  openMenu();
  fireEvent.click(screen.getByRole('button', { name: 'Delete ceremony' }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await Promise.resolve();
  });
}

describe('EventActions', () => {
  it('opens the ceremony in the drawer from Manage', () => {
    renderActions(false);
    fireEvent.click(screen.getByRole('button', { name: 'Manage Mehendi' }));
    expect(screen.getByRole('heading', { name: 'Mehendi' })).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>(/^Name/).value).toBe('Mehendi');
  });

  it('offers the ceremony’s tasks and vendors to everyone and Delete to owners only, in the menu', () => {
    renderActions(false);
    const toggle = screen.getByRole('button', { name: 'More for Mehendi' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    openMenu();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('link', { name: 'View tasks' }).getAttribute('href')).toBe(tasksHref);
    expect(screen.getByRole('link', { name: 'View vendors' }).getAttribute('href')).toBe(
      `/weddings/${weddingId}/vendors?eventId=${event.id}`,
    );
    expect(screen.getByRole('link', { name: 'View expenses' }).getAttribute('href')).toBe(
      `/weddings/${weddingId}/expenses?eventId=${event.id}`,
    );
    expect(screen.queryByRole('button', { name: 'Delete ceremony' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    cleanup();

    renderActions(true);
    openMenu();
    expect(screen.getByRole('button', { name: 'Delete ceremony' })).toBeTruthy();
  });

  it('shows nothing on a read-only page, which has no drawer', () => {
    render(<EventActions weddingId={weddingId} event={event} tasksHref={tasksHref} canDelete />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('asks before deleting, then deletes, announces it and refreshes the list', async () => {
    del.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { status: 204, ok: true },
    });
    renderActions(true);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Delete ceremony' }));
    expect(screen.getByRole('heading', { name: 'Delete Mehendi?' })).toBeTruthy();
    expect(del).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      await Promise.resolve();
    });
    expect(del).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/events/{eventId}', {
      params: { path: { weddingId, eventId: event.id } },
    });
    expect(screen.getByRole('status').textContent).toBe('Mehendi was deleted.');
    expect(refresh).toHaveBeenCalled();
  });

  it('says why a delete failed and keeps the event', async () => {
    del.mockResolvedValue({
      data: undefined,
      error: { error: { code: 'OWNER_REQUIRED', message: 'Only the couple can do this.' } },
      response: { status: 403, ok: false },
    });
    renderActions(true);
    await confirmDelete();
    expect(screen.getByRole('alert').textContent).toContain('Only the couple can do this.');
    expect(refresh).not.toHaveBeenCalled();
  });
});
