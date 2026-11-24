import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfirmedByCeremony } from './confirmed-by-ceremony';

const titles = ['Tilak', 'Haldi', 'Matkor', 'Mehendi', 'Sangeet', 'Garba', 'Wedding'];
const events = titles.map((title, index) => ({
  eventId: `e${index}`,
  title,
  confirmedPeople: 10 + index,
  invitedPeople: 30,
}));

afterEach(cleanup);

describe('ConfirmedByCeremony', () => {
  it('shows the first two ceremonies, then the rest on request', () => {
    render(<ConfirmedByCeremony events={events} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Tilak10 of 30',
      'Haldi11 of 30',
    ]);
    const more = screen.getByRole('button', { name: 'Show 5 more' });
    expect(more.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(more);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Wedding')).toBeTruthy();
    const fewer = screen.getByRole('button', { name: 'Show fewer' });
    expect(fewer.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(fewer);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('needs no button for two ceremonies or fewer', () => {
    render(<ConfirmedByCeremony events={events.slice(0, 2)} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
