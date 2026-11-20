import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuestView } from '@/lib/guests/guests';
import { RsvpForm } from './rsvp-form';

const patch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/browser', () => ({ api: { PATCH: patch } }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function reply(status: number, body?: unknown) {
  const ok = status < 400;
  return { data: ok ? body : undefined, error: ok ? undefined : body, response: { status, ok } };
}

const view: GuestView = {
  coupleName: 'Ananya & Arjun',
  guestName: 'Rajesh Sharma',
  partySize: 5,
  writable: true,
  events: [
    {
      invitationId: 'h',
      title: 'Haldi',
      timeZone: 'Asia/Kolkata',
      cancelled: false,
      rsvp: { status: 'pending', responseVersion: 0 },
    },
    {
      invitationId: 'w',
      title: 'Wedding',
      timeZone: 'Asia/Kolkata',
      cancelled: false,
      rsvp: { status: 'pending', responseVersion: 0 },
    },
    {
      invitationId: 'r',
      title: 'Reception',
      timeZone: 'Asia/Kolkata',
      cancelled: true,
      rsvp: { status: 'attending', attendingCount: 2, responseVersion: 1 },
    },
  ],
};

beforeEach(() => {
  patch.mockReset();
  refresh.mockReset();
});
afterEach(cleanup);

const card = (name: string) => screen.getByRole('region', { name });

async function save(name = /Save my RSVP|Update RSVP/) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('RsvpForm', () => {
  it('answers each ceremony on its own, counting within the party size', async () => {
    patch
      .mockResolvedValueOnce(reply(200, { data: { rsvp: { responseVersion: 1 } } }))
      .mockResolvedValueOnce(reply(200, { data: { rsvp: { responseVersion: 1 } } }));
    render(<RsvpForm view={view} when={() => undefined} />);
    expect(
      within(card('Reception')).getByText('This celebration has been cancelled. RSVP is closed.'),
    ).toBeTruthy();

    fireEvent.click(within(card('Haldi')).getByLabelText('Attending'));
    expect(within(card('Haldi')).getByText(/5 of 5 people/)).toBeTruthy();
    expect(within(card('Haldi')).getByRole('button', { name: 'One more' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(within(card('Haldi')).getByRole('button', { name: 'One fewer' }));
    fireEvent.click(within(card('Haldi')).getByRole('button', { name: 'One fewer' }));
    expect(within(card('Haldi')).getByText(/3 of 5 people/)).toBeTruthy();
    fireEvent.click(within(card('Wedding')).getByLabelText('Not attending'));
    expect(within(card('Wedding')).getByText('No one from your family will attend.')).toBeTruthy();

    await save();
    expect(
      patch.mock.calls.map((call) => [call[1].params.path.invitationId, call[1].body]),
    ).toEqual([
      ['h', { status: 'attending', attendingCount: 3, responseVersion: 0 }],
      ['w', { status: 'not_attending', responseVersion: 0 }],
    ]);
    expect(screen.getByText(/Your responses have been saved/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Your RSVP is saved' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('answers every open ceremony at once, then lets one be changed on its own', async () => {
    patch.mockResolvedValue(reply(200, { data: { rsvp: { responseVersion: 1 } } }));
    render(<RsvpForm view={view} when={() => undefined} />);
    const all = card('All celebrations');
    expect(within(all).getByText(/Answer once for all 2 celebrations/)).toBeTruthy();

    fireEvent.click(within(all).getByLabelText('Attending'));
    fireEvent.click(within(all).getByRole('button', { name: 'One fewer' }));
    expect(within(all).getByText(/4 of 5 people/)).toBeTruthy();
    expect(within(card('Haldi')).getByText(/4 of 5 people/)).toBeTruthy();
    expect(within(card('Wedding')).getByText(/4 of 5 people/)).toBeTruthy();

    // One ceremony changed on its own: the card shows the answers now differ.
    fireEvent.click(within(card('Wedding')).getByLabelText('Maybe'));
    expect((within(all).getByLabelText('Attending') as HTMLInputElement).checked).toBe(false);
    expect(within(all).getByText(/different for some celebrations/)).toBeTruthy();

    await save();
    expect(
      patch.mock.calls.map((call) => [call[1].params.path.invitationId, call[1].body]),
    ).toEqual([
      ['h', { status: 'attending', attendingCount: 4, responseVersion: 0 }],
      ['w', { status: 'maybe', responseVersion: 0 }],
    ]);
  });

  it('stops and asks to refresh when the answers changed elsewhere', async () => {
    patch.mockResolvedValue(
      reply(409, { error: { code: 'RSVP_VERSION_CONFLICT', message: 'Changed.' } }),
    );
    render(<RsvpForm view={view} when={() => undefined} />);
    fireEvent.click(within(card('Haldi')).getByLabelText('Maybe'));
    await save();
    expect(screen.getByRole('alert').textContent).toContain('These responses have changed');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
  });

  it('keeps the choices when saving fails, and can be tried again', async () => {
    patch.mockRejectedValueOnce(new TypeError('offline'));
    patch.mockResolvedValueOnce(reply(200, { data: { rsvp: { responseVersion: 1 } } }));
    render(<RsvpForm view={view} when={() => undefined} />);
    fireEvent.click(within(card('Haldi')).getByLabelText('Maybe'));
    await save();
    expect(screen.getByRole('alert').textContent).toContain('Your choices are still here');
    expect((within(card('Haldi')).getByLabelText('Maybe') as HTMLInputElement).checked).toBe(true);
    await save();
    expect(screen.getByText(/Your responses have been saved/)).toBeTruthy();
  });

  it('shows saved answers read-only once RSVPs are closed', () => {
    render(<RsvpForm view={{ ...view, writable: false }} when={() => undefined} />);
    expect(screen.getByText(/RSVPs for this wedding are closed/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Save my RSVP/ })).toBeNull();
    expect(within(card('Haldi')).getByLabelText('Attending').matches(':disabled')).toBe(true);
  });
});
