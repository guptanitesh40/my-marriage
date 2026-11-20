import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestForm, type GuestEventChoice } from './guest-form';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { POST: post, PATCH: vi.fn(), PUT: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const events: GuestEventChoice[] = [
  { id: 'haldi', title: 'Haldi', cancelled: false },
  { id: 'wedding', title: 'Wedding', cancelled: false },
  { id: 'mehendi', title: 'Mehendi', cancelled: true },
  { id: 'reception', title: 'Reception', cancelled: false },
];

beforeEach(() => post.mockReset());
afterEach(cleanup);

const all = () =>
  screen.getByRole('checkbox', { name: /Select all ceremonies/ }) as HTMLInputElement;
const ceremony = (name: string) =>
  screen.getByRole('checkbox', { name: new RegExp(`^${name}`) }) as HTMLInputElement;

describe('GuestForm ceremonies', () => {
  it('selects every ceremony still open at once, and clears them again', async () => {
    post.mockResolvedValue({ data: { data: {} }, response: { status: 201, ok: true } });
    render(<GuestForm weddingId="w1" events={events} onCancel={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(ceremony('Wedding'));
    expect(all().checked).toBe(false);
    expect(all().indeterminate).toBe(true);

    fireEvent.click(all());
    expect(['Haldi', 'Wedding', 'Reception'].map((name) => ceremony(name).checked)).toEqual([
      true,
      true,
      true,
    ]);
    // A cancelled ceremony is never chosen for everyone.
    expect(ceremony('Mehendi').checked).toBe(false);
    expect(all().checked).toBe(true);
    expect(screen.getByText(/3 of\s*3/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/^Primary contact name/), {
      target: { value: 'Rajesh Sharma' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add guest' }));
      await Promise.resolve();
    });
    expect(post.mock.calls[0]?.[1].body.eventIds).toEqual(['wedding', 'haldi', 'reception']);

    fireEvent.click(all());
    expect(events.map((event) => ceremony(event.title).checked)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('offers no select-all for a single ceremony', () => {
    render(
      <GuestForm
        weddingId="w1"
        events={[events[0] as GuestEventChoice]}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByRole('checkbox', { name: /Select all/ })).toBeNull();
  });
});
