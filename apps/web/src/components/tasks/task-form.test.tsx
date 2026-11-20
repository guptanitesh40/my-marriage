import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskForm, type TaskChoices } from './task-form';

const post = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, PATCH: patch, GET: vi.fn() } }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return { data: ok ? body : undefined, error: ok ? undefined : body, response: { status, ok } };
}

const weddingId = '6740a1b2c3d4e5f601234567';
const haldi = '6740a1b2c3d4e5f601230001';
const ritu = '6740a1b2c3d4e5f601239001';
const choices: TaskChoices = {
  events: [{ id: haldi, title: 'Haldi' }],
  members: [
    { userId: '6740a1b2c3d4e5f601239000', displayName: 'Ananya Sharma', role: 'owner' },
    { userId: ritu, displayName: 'Ritu Sharma', role: 'manager' },
  ],
};
const onSaved = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  refresh.mockReset();
  onSaved.mockReset();
});
afterEach(cleanup);

const task = {
  id: '6740a1b2c3d4e5f601238888',
  title: 'Book Haldi decorator',
  description: 'Marigolds',
  event: { id: haldi, title: 'Haldi' },
  assignee: { userId: ritu, displayName: 'Ritu Sharma', role: 'manager' as const },
  dueDate: '2027-12-08',
  dueTime: '14:00',
  overdue: false,
  priority: 'high' as const,
  state: 'in_progress' as const,
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T10:00:00.000Z',
};

async function press(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

const field = <T extends HTMLElement>(label: RegExp) => screen.getByLabelText<T>(label);

describe('TaskForm, adding', () => {
  it('starts as General, Unassigned, Medium and To Do, and saves with only a title', async () => {
    post.mockResolvedValue(reply(201, { data: { id: 't1', title: 'Hampers' } }));
    render(
      <TaskForm weddingId={weddingId} choices={choices} onCancel={onCancel} onSaved={onSaved} />,
    );
    expect(field<HTMLSelectElement>(/^Event/).value).toBe('');
    expect(screen.getByRole('option', { name: 'General / No event' })).toBeTruthy();
    expect(field<HTMLSelectElement>(/^Assign to/).value).toBe('');
    expect(screen.getByRole('option', { name: 'Ritu Sharma (Manager)' })).toBeTruthy();
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Medium' }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'To Do' }).checked).toBe(true);

    fireEvent.change(field(/^Task name/), { target: { value: '  Hampers  ' } });
    await press(/Create task/);
    expect(post).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/tasks', {
      params: { path: { weddingId } },
      body: { title: 'Hampers', priority: 'normal', state: 'todo' },
    });
    expect(onSaved).toHaveBeenCalledWith('Hampers');
  });

  it('sends the event, assignee, due day and time, priority and status chosen', async () => {
    post.mockResolvedValue(reply(201, { data: { id: 't1', title: 'Tent' } }));
    render(
      <TaskForm weddingId={weddingId} choices={choices} onCancel={onCancel} onSaved={onSaved} />,
    );
    fireEvent.change(field(/^Task name/), { target: { value: 'Tent' } });
    fireEvent.change(field(/^Event/), { target: { value: haldi } });
    fireEvent.change(field(/^Assign to/), { target: { value: ritu } });
    const time = field<HTMLInputElement>(/^Time/);
    expect(time.disabled).toBe(true);
    fireEvent.change(field(/^Due date/), { target: { value: '2027-12-08' } });
    fireEvent.change(time, { target: { value: '17:00' } });
    fireEvent.click(screen.getByRole('radio', { name: 'High' }));
    fireEvent.click(screen.getByRole('radio', { name: 'In Progress' }));
    await press(/Create task/);
    expect(post.mock.calls[0]?.[1]).toEqual({
      params: { path: { weddingId } },
      body: {
        title: 'Tent',
        eventId: haldi,
        assigneeId: ritu,
        dueDate: '2027-12-08',
        dueTime: '17:00',
        priority: 'high',
        state: 'in_progress',
      },
    });
  });

  it('sends once however quickly it is pressed again, and shows it is busy', async () => {
    let finish: (value: unknown) => void = () => undefined;
    post.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(
      <TaskForm weddingId={weddingId} choices={choices} onCancel={onCancel} onSaved={onSaved} />,
    );
    fireEvent.change(field(/^Task name/), { target: { value: 'Hampers' } });
    await press(/Create task/);
    const busy = screen.getByRole('button', { name: 'Saving…' });
    expect(busy.hasAttribute('disabled')).toBe(true);
    fireEvent.submit(busy.closest('form') as HTMLFormElement);
    expect(post).toHaveBeenCalledTimes(1);
    await act(async () => finish(reply(201, { data: { id: 't1', title: 'Hampers' } })));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('asks for a title before sending, and keeps the values when the server fails', async () => {
    render(
      <TaskForm weddingId={weddingId} choices={choices} onCancel={onCancel} onSaved={onSaved} />,
    );
    await press(/Create task/);
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('Enter what needs to be done.')).toBeTruthy();

    post.mockRejectedValueOnce(new TypeError('fetch failed'));
    fireEvent.change(field(/^Task name/), { target: { value: 'Hampers' } });
    await press(/Create task/);
    expect(screen.getByRole('alert').textContent).toContain('could not reach');
    expect(field<HTMLInputElement>(/^Task name/).value).toBe('Hampers');
  });

  it('shows a refused assignee beside the field and refreshes the team list', async () => {
    post.mockResolvedValue(
      reply(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Choose someone on this wedding’s team, or leave it unassigned.',
          details: [{ field: 'assigneeId', messages: ['Choose someone on this wedding’s team.'] }],
        },
      }),
    );
    render(
      <TaskForm weddingId={weddingId} choices={choices} onCancel={onCancel} onSaved={onSaved} />,
    );
    fireEvent.change(field(/^Task name/), { target: { value: 'Hampers' } });
    fireEvent.change(field(/^Assign to/), { target: { value: ritu } });
    await press(/Create task/);
    expect(field(/^Assign to/).getAttribute('aria-invalid')).toBe('true');
    expect(refresh).toHaveBeenCalled();
  });
});

describe('TaskForm, editing', () => {
  it('starts from the task, and sends every field with the cleared ones as null', async () => {
    patch.mockResolvedValue(reply(200, { data: { ...task, title: 'Book decorator' } }));
    render(
      <TaskForm
        weddingId={weddingId}
        task={task}
        choices={choices}
        onCancel={onCancel}
        onSaved={onSaved}
      />,
    );
    expect(field<HTMLInputElement>(/^Task name/).value).toBe('Book Haldi decorator');
    expect(field<HTMLSelectElement>(/^Event/).value).toBe(haldi);
    expect(field<HTMLSelectElement>(/^Assign to/).value).toBe(ritu);
    expect(field<HTMLInputElement>(/^Time/).value).toBe('14:00');
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'High' }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'In Progress' }).checked).toBe(true);

    fireEvent.change(field(/^Task name/), { target: { value: 'Book decorator' } });
    fireEvent.change(field(/^Description/), { target: { value: '' } });
    fireEvent.change(field(/^Event/), { target: { value: '' } });
    fireEvent.change(field(/^Assign to/), { target: { value: '' } });
    fireEvent.change(field(/^Due date/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Cancelled' }));
    await press(/Save changes/);
    expect(patch).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/tasks/{taskId}', {
      params: { path: { weddingId, taskId: task.id } },
      body: {
        title: 'Book decorator',
        description: null,
        eventId: null,
        assigneeId: null,
        dueDate: null,
        dueTime: null,
        priority: 'high',
        state: 'cancelled',
      },
    });
  });

  it('shows Unassigned when the assignee is no longer on the team', () => {
    render(
      <TaskForm
        weddingId={weddingId}
        task={{ ...task, assignee: undefined }}
        choices={choices}
        onCancel={onCancel}
        onSaved={onSaved}
      />,
    );
    expect(field<HTMLSelectElement>(/^Assign to/).value).toBe('');
  });
});
