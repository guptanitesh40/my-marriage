import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditTaskButton, QuickComplete } from './task-actions';
import { TaskDrawer } from './task-drawer';

const patch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { PATCH: patch, POST: vi.fn(), GET: vi.fn() } }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => '/weddings/w1',
  useSearchParams: () => new URLSearchParams(),
}));

// jsdom has no modal dialogs; these open and close one as a browser would.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

const weddingId = '6740a1b2c3d4e5f601234567';
const task = {
  id: '6740a1b2c3d4e5f601238888',
  title: 'Book band',
  overdue: false,
  priority: 'normal' as const,
  state: 'todo' as const,
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T10:00:00.000Z',
};

beforeEach(() => {
  patch.mockReset();
  refresh.mockReset();
});
afterEach(cleanup);

function renderActions(t = task) {
  return render(
    <TaskDrawer weddingId={weddingId} choices={{ events: [], members: [] }}>
      <QuickComplete weddingId={weddingId} task={t} />
      <EditTaskButton task={t} />
    </TaskDrawer>,
  );
}

async function toggle() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Completed: Book band' }));
    await Promise.resolve();
  });
}

describe('QuickComplete', () => {
  it('completes an open task at once, then refreshes the list', async () => {
    patch.mockResolvedValue({
      data: { data: { ...task, state: 'completed' } },
      error: undefined,
      response: { status: 200, ok: true },
    });
    renderActions();
    const button = screen.getByRole('button', { name: 'Completed: Book band' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await toggle();
    expect(patch).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/tasks/{taskId}', {
      params: { path: { weddingId, taskId: task.id } },
      body: { state: 'completed' },
    });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe('Book band is completed.');
    expect(refresh).toHaveBeenCalled();
  });

  it('reopens a completed task as To Do', async () => {
    patch.mockResolvedValue({
      data: { data: { ...task } },
      error: undefined,
      response: { status: 200, ok: true },
    });
    renderActions({ ...task, state: 'completed' as never });
    await toggle();
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ body: { state: 'todo' } });
  });

  it('goes back and says why when the save fails', async () => {
    patch.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: 'WEDDING_ARCHIVED',
          message: 'This wedding is archived, so it can no longer be changed.',
        },
      },
      response: { status: 409, ok: false },
    });
    renderActions();
    await toggle();
    const button = screen.getByRole('button', { name: 'Completed: Book band' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('status').textContent).toContain('archived');
    expect(refresh).toHaveBeenCalled();
  });

  it('only shows the state on a read-only page, and offers no edit', () => {
    render(
      <>
        <QuickComplete weddingId={weddingId} task={task} />
        <EditTaskButton task={task} />
      </>,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('opens the drawer on the task to edit it', () => {
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Book band' }));
    expect(screen.getByRole('heading', { name: 'Edit task' })).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>(/^Task name/).value).toBe('Book band');
  });
});
