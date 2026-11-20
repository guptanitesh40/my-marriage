import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBrowser, type EventItem } from './event-browser';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

function item(id: string, title: string, extra: Partial<EventItem['event']> = {}): EventItem {
  return {
    event: {
      id,
      title,
      timeZone: 'Asia/Kolkata',
      state: 'scheduled',
      createdAt: '2026-11-19T10:00:00.000Z',
      ...extra,
    },
    tasksHref: `/weddings/w/tasks?eventId=${id}`,
  };
}

const items = [
  item('e1', 'Tilak', { startDate: '2027-02-10', venue: { name: 'Groom’s family home' } }),
  item('e2', 'Haldi', { startDate: '2026-11-01', state: 'completed' }),
  item('e3', 'Wedding', { startDate: '2027-02-14', description: 'Vedic pheras at sunset' }),
  item('e4', 'Drone show', { state: 'cancelled' }),
];

const titles = () => screen.queryAllByRole('article').map((a) => a.getAttribute('aria-labelledby'));

describe('EventBrowser', () => {
  it('counts and shows All, Upcoming and Completed', () => {
    render(
      <EventBrowser weddingId="w" items={items} truncated={false} today="2026-11-19" canDelete />,
    );
    expect(screen.getByRole('button', { name: 'All (4)' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Upcoming (2)' }));
    expect(titles()).toEqual(['event-e1-title', 'event-e3-title']);
    fireEvent.click(screen.getByRole('button', { name: 'Completed (1)' }));
    expect(titles()).toEqual(['event-e2-title']);
  });

  it('searches names, venues and descriptions, and offers a way back when nothing matches', () => {
    render(
      <EventBrowser weddingId="w" items={items} truncated={false} today="2026-11-19" canDelete />,
    );
    const search = screen.getByRole('searchbox', { name: 'Search events' });
    fireEvent.change(search, { target: { value: 'family home' } });
    expect(titles()).toEqual(['event-e1-title']);
    fireEvent.change(search, { target: { value: 'SUNSET' } });
    expect(titles()).toEqual(['event-e3-title']);
    fireEvent.change(search, { target: { value: 'fireworks' } });
    expect(screen.getByRole('heading', { name: 'No ceremonies match' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show all ceremonies' }));
    expect(titles()).toHaveLength(4);
  });
});
