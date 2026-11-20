import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventForm } from './event-form';

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
const onSaved = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  refresh.mockReset();
  onSaved.mockReset();
  onCancel.mockReset();
});
afterEach(cleanup);

function renderForm() {
  return render(<EventForm weddingId={weddingId} onCancel={onCancel} onSaved={onSaved} />);
}

const haldi = {
  id: '6740a1b2c3d4e5f601234999',
  title: 'Haldi',
  description: 'By the pool.',
  startDate: '2099-12-12',
  startTime: '10:00',
  timeZone: 'Europe/London',
  venue: { name: 'Rambagh Palace', address: 'Jaipur' },
  state: 'scheduled' as const,
  createdAt: '2026-11-19T10:00:00.000Z',
};

function renderEdit(event: Parameters<typeof EventForm>[0]['event'] = haldi) {
  return render(
    <EventForm weddingId={weddingId} event={event} onCancel={onCancel} onSaved={onSaved} />,
  );
}

async function save(label: RegExp = /Save ceremony/) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
    await Promise.resolve();
  });
}

const name = () => screen.getByLabelText<HTMLInputElement>(/^Name/);

describe('EventForm, adding', () => {
  it('offers the PRD presets and a custom name; a preset fills in the name', () => {
    renderForm();
    const presets = screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'));
    expect(presets).toEqual([
      'Haldi',
      'Mehendi',
      'Sangeet',
      'Garba',
      'Wedding',
      'Reception',
      'custom',
    ]);

    fireEvent.click(screen.getByRole('radio', { name: 'Sangeet' }));
    expect(name().value).toBe('Sangeet');
    fireEvent.change(name(), { target: { value: 'Sangeet Sandhya' } });
    // Custom keeps a name the person typed, and clears one that came from a preset.
    fireEvent.click(screen.getByRole('radio', { name: 'Custom +' }));
    expect(name().value).toBe('Sangeet Sandhya');
    fireEvent.click(screen.getByRole('radio', { name: 'Haldi' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Custom +' }));
    expect(name().value).toBe('');
  });

  it('saves with only a name, in India time', async () => {
    post.mockResolvedValue(reply(201, { data: { id: 'e1', title: 'Haldi' } }));
    renderForm();
    fireEvent.click(screen.getByRole('radio', { name: 'Haldi' }));
    await save();
    expect(post).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/events', {
      params: { path: { weddingId } },
      body: { title: 'Haldi', timeZone: 'Asia/Kolkata' },
    });
    expect(onSaved).toHaveBeenCalledWith('Haldi');
  });

  it('sends the day, time, zone, venue and description when given', async () => {
    post.mockResolvedValue(reply(201, { data: { id: 'e1', title: 'Reception' } }));
    renderForm();
    fireEvent.change(name(), { target: { value: '  Reception  ' } });
    const time = screen.getByLabelText<HTMLInputElement>(/^Start time/);
    expect(time.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '2099-07-10' } });
    expect(time.disabled).toBe(false);
    fireEvent.change(time, { target: { value: '19:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Europe/London' } });
    fireEvent.change(screen.getByLabelText(/^Venue/), { target: { value: 'Kew Gardens' } });
    fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: ' Dinner. ' } });
    await save();
    expect(post.mock.calls[0]?.[1]).toEqual({
      params: { path: { weddingId } },
      body: {
        title: 'Reception',
        description: 'Dinner.',
        startDate: '2099-07-10',
        startTime: '19:00',
        timeZone: 'Europe/London',
        venue: { name: 'Kew Gardens' },
      },
    });
  });

  it('asks for a name before sending anything', async () => {
    renderForm();
    await save();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the ceremony’s name.')).toBeTruthy();
    expect(name().getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the API’s field errors beside their fields', async () => {
    post.mockResolvedValue(
      reply(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            { field: 'startDate', messages: ['Choose today or a later date.'] },
            { field: 'venue.name', messages: ['Use 120 characters or fewer.'] },
          ],
        },
      }),
    );
    renderForm();
    fireEvent.change(name(), { target: { value: 'Haldi' } });
    await save();
    expect(screen.getByLabelText(/^Date/).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Choose today or a later date.')).toBeTruthy();
    expect(screen.getByLabelText(/^Venue/).getAttribute('aria-invalid')).toBe('true');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('explains an archived wedding and refreshes the page into read-only', async () => {
    post.mockResolvedValue(
      reply(409, {
        error: {
          code: 'WEDDING_ARCHIVED',
          message: 'This wedding is archived, so it can no longer be changed.',
        },
      }),
    );
    renderForm();
    fireEvent.change(name(), { target: { value: 'Haldi' } });
    await save();
    expect(screen.getByRole('alert').textContent).toContain('archived');
    expect(refresh).toHaveBeenCalled();
  });

  it('keeps what was typed after a network failure, so saving again works', async () => {
    post.mockRejectedValueOnce(new TypeError('fetch failed'));
    post.mockResolvedValueOnce(reply(201, { data: { id: 'e1', title: 'Garba night' } }));
    renderForm();
    fireEvent.change(name(), { target: { value: 'Garba night' } });
    await save();
    expect(screen.getByRole('alert').textContent).toContain('could not reach');
    expect(name().value).toBe('Garba night');
    await save();
    expect(onSaved).toHaveBeenCalledWith('Garba night');
  });

  it('shows the button as busy while saving', async () => {
    let finish: (value: unknown) => void = () => undefined;
    post.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderForm();
    fireEvent.change(name(), { target: { value: 'Haldi' } });
    await save();
    const busy = screen.getByRole('button', { name: 'Saving…' });
    expect(busy.hasAttribute('disabled')).toBe(true);
    await act(async () => finish(reply(201, { data: { id: 'e1', title: 'Haldi' } })));
  });

  it('cancels without saving', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('EventForm, editing', () => {
  it('starts from the event as it is', () => {
    renderEdit();
    expect(name().value).toBe('Haldi');
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Haldi' }).checked).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>(/^Date/).value).toBe('2099-12-12');
    expect(screen.getByLabelText<HTMLInputElement>(/^Start time/).value).toBe('10:00');
    expect(screen.getByText('London time')).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>(/^Venue/).value).toBe('Rambagh Palace');
    expect(screen.getByLabelText<HTMLInputElement>(/^Address/).value).toBe('Jaipur');
    expect(screen.getByLabelText<HTMLTextAreaElement>(/^Description/).value).toBe('By the pool.');
    expect(screen.getByLabelText<HTMLSelectElement>(/^Status/).value).toBe('scheduled');
  });

  it('sends every field, with the cleared ones as null, and the status', async () => {
    patch.mockResolvedValue(reply(200, { data: { ...haldi, title: 'Haldi & Pithi' } }));
    renderEdit();
    fireEvent.change(name(), { target: { value: 'Haldi & Pithi' } });
    fireEvent.change(screen.getByLabelText(/^Venue/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Address/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: 'cancelled' } });
    await save(/Save changes/);
    expect(post).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith('/api/v1/weddings/{weddingId}/events/{eventId}', {
      params: { path: { weddingId, eventId: haldi.id } },
      body: {
        title: 'Haldi & Pithi',
        description: null,
        startDate: null,
        startTime: null,
        timeZone: 'Europe/London',
        venue: null,
        state: 'cancelled',
      },
    });
    expect(onSaved).toHaveBeenCalledWith('Haldi & Pithi');
  });

  it('lets a day that has passed be kept', () => {
    renderEdit({ ...haldi, startDate: '2020-01-10' });
    expect(screen.getByLabelText(/^Date/).getAttribute('min')).toBe('2020-01-10');
  });

  it('refreshes the page when the event was deleted meanwhile', async () => {
    patch.mockResolvedValue(
      reply(404, { error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } }),
    );
    renderEdit();
    await save(/Save changes/);
    expect(screen.getByRole('alert').textContent).toContain('Unable to save your changes');
    expect(refresh).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
