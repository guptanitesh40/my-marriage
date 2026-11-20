import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EventCard } from './event-card';

afterEach(cleanup);

const base = {
  id: 'e1',
  title: 'Haldi Ceremony',
  timeZone: 'Asia/Kolkata',
  state: 'scheduled' as const,
  createdAt: '2026-11-19T10:00:00.000Z',
};

describe('EventCard', () => {
  it('shows a planned ceremony: day, when, status, name and venue', () => {
    render(
      <EventCard
        day={1}
        event={{
          ...base,
          startDate: '2027-12-12',
          startTime: '10:00',
          description: 'Turmeric by the pool.',
          venue: { name: 'Poolside Courtyard', address: 'Rambagh Palace, Jaipur' },
        }}
      />,
    );
    const card = screen.getByRole('article', { name: 'Haldi Ceremony' });
    expect(card.textContent).toContain('Day 1 · Morning');
    expect(card.textContent).toContain('Sun, 12 Dec 2027 · 10:00 am');
    expect(card.textContent).toContain('Scheduled');
    expect(card.textContent).toContain('Poolside Courtyard · Rambagh Palace, Jaipur');
    expect(card.textContent).toContain('Turmeric by the pool.');
    expect(within(card).queryByRole('list', { name: 'Still to decide' })).toBeNull();
  });

  it('says what is still to decide for a ceremony with only a name', () => {
    render(<EventCard event={base} />);
    const card = screen.getByRole('article', { name: 'Haldi Ceremony' });
    expect(card.textContent).not.toContain('Day');
    const missing = within(card).getByRole('list', { name: 'Still to decide' });
    expect(
      within(missing)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Date not set', 'Venue not set']);
  });

  it('shows the ceremony’s tasks done and overdue, as a link to them', () => {
    render(
      <EventCard
        event={base}
        tasks={{ total: 10, completed: 8, overdue: 1 }}
        tasksHref="/weddings/w/tasks?eventId=e1"
      />,
    );
    const link = screen.getByRole('link', {
      name: /^Tasks ?for Haldi Ceremony: ?8 \/ 10 done ?Overdue ?1$/,
    });
    expect(link.getAttribute('href')).toBe('/weddings/w/tasks?eventId=e1');
    expect(link.textContent).toContain('8 / 10 done');
    cleanup();

    render(
      <EventCard
        event={base}
        tasks={{ total: 0, completed: 0, overdue: 0 }}
        tasksHref="/weddings/w/tasks?eventId=e1"
      />,
    );
    expect(
      screen.getByRole('link', { name: /^Tasks ?for Haldi Ceremony: ?None yet$/ }).textContent,
    ).toContain('None yet');
  });
});
