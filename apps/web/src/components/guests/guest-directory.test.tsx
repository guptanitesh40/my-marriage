import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NO_FILTERS, type Guest } from '@/lib/guests/directory';
import { GuestDirectory } from './guest-directory';

afterEach(cleanup);

const titles = ['Tilak', 'Matkor', 'Haldi', 'Sangeet', 'Mehendi', 'Wedding'];
const alok: Guest = {
  id: 'a',
  name: 'Dr. Alok Sinha',
  partySize: 4,
  invitations: titles.map((title, index) => ({
    id: `i${index}`,
    eventId: `e${index}`,
    title,
    available: true,
    cancelled: false,
    rsvp: { status: 'maybe', responseVersion: 1 },
  })),
  link: { status: 'active' },
  remindersOff: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const kavita: Guest = {
  ...alok,
  id: 'k',
  name: 'Kavita Singh',
  invitations: alok.invitations.slice(0, 3),
};

describe('GuestDirectory', () => {
  it('shows three ceremony answers per guest, and the rest on request', () => {
    render(
      <GuestDirectory
        weddingId="w"
        guests={[alok, kavita]}
        truncated={false}
        events={titles.map((title, index) => ({ id: `e${index}`, title, cancelled: false }))}
        initialFilters={NO_FILTERS}
      />,
    );
    const row = within(screen.getByRole('article', { name: 'Dr. Alok Sinha' }));
    const answers = () => row.getAllByText(/^(Tilak|Matkor|Haldi|Sangeet|Mehendi|Wedding) maybe$/);
    expect(answers()).toHaveLength(3);
    const more = row.getByRole('button', { name: /3 more\s*ceremonies for Dr. Alok Sinha/ });
    expect(more.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(more);
    expect(answers()).toHaveLength(6);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(row.getByRole('button', { name: /Show fewer/ }));
    expect(answers()).toHaveLength(3);

    // Exactly three: nothing to expand.
    const short = within(screen.getByRole('article', { name: 'Kavita Singh' }));
    expect(short.queryByRole('button', { name: /more/ })).toBeNull();
  });
});
