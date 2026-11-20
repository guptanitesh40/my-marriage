import { describe, expect, it } from 'vitest';
import {
  answerLabel,
  deliveryOf,
  filterParams,
  matches,
  NO_FILTERS,
  people,
  readFilters,
  type Guest,
  type GuestInvitation,
} from './directory';

const HALDI = '6740a1b2c3d4e5f601230001';
const WEDDING = '6740a1b2c3d4e5f601230002';

function invitation(
  eventId: string,
  title: string,
  rsvp: GuestInvitation['rsvp'],
): GuestInvitation {
  return { id: `${eventId}-i`, eventId, title, available: true, cancelled: false, rsvp };
}

function guest(fields: Partial<Guest> & Pick<Guest, 'id' | 'name'>): Guest {
  return {
    partySize: 1,
    invitations: [],
    link: { status: 'none' },
    remindersOff: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...fields,
  };
}

const rajesh = guest({
  id: 'r',
  name: 'Rajesh Sharma',
  partySize: 5,
  email: 'rajesh@example.com',
  phone: '+91 98200 11111',
  link: { status: 'active' },
  lastEmail: { state: 'sent', requestedAt: '2026-11-02T00:00:00.000Z' },
  invitations: [
    invitation(HALDI, 'Haldi', { status: 'attending', attendingCount: 3, responseVersion: 1 }),
    invitation(WEDDING, 'Wedding', { status: 'pending', responseVersion: 0 }),
  ],
});
const kavya = guest({ id: 'k', name: 'Kavya Shah', partySize: 4 });

describe('guest filters', () => {
  it('reads and writes the address, ignoring the unknown', () => {
    const filters = readFilters({
      q: 'raj',
      eventId: HALDI,
      rsvp: 'attending',
      delivery: 'email_sent',
      sort: 'updated',
    });
    expect(filterParams(filters).toString()).toBe(
      `q=raj&eventId=${HALDI}&rsvp=attending&delivery=email_sent&sort=updated`,
    );
    expect(readFilters({ rsvp: 'yes', delivery: 'x', eventId: 'haldi', sort: 'z' })).toEqual(
      NO_FILTERS,
    );
  });

  it('narrows by ceremony, RSVP (for that ceremony), invitation status and words', () => {
    const ids = (f: Partial<typeof NO_FILTERS>) =>
      [rajesh, kavya].filter((g) => matches(g, { ...NO_FILTERS, ...f })).map((g) => g.id);
    expect(ids({ eventId: HALDI })).toEqual(['r']);
    expect(ids({ rsvp: 'pending' })).toEqual(['r']);
    expect(ids({ eventId: HALDI, rsvp: 'pending' })).toEqual([]);
    expect(ids({ rsvp: 'not_invited' })).toEqual(['k']);
    expect(ids({ delivery: 'not_shared' })).toEqual(['k']);
    expect(ids({ q: '9820011111' })).toEqual(['r']);
    expect(ids({ q: 'EXAMPLE.COM' })).toEqual(['r']);
  });
});

describe('guest labels', () => {
  it('never calls a sent email delivered', () => {
    expect(deliveryOf(rajesh)).toBe('email_sent');
    expect(deliveryOf({ link: { status: 'active' } })).toBe('link_ready');
    expect(deliveryOf({ link: { status: 'revoked' }, lastEmail: rajesh.lastEmail })).toBe(
      'link_revoked',
    );
    expect(
      deliveryOf({ link: { status: 'active' }, lastEmail: { state: 'failed', requestedAt: '' } }),
    ).toBe('email_failed');
  });

  it('says each ceremony’s answer against the party size', () => {
    expect(rajesh.invitations.map((i) => answerLabel(i, rajesh.partySize))).toEqual([
      'Haldi 3/5 attending',
      'Wedding pending',
    ]);
    expect(people(1)).toBe('1 person');
    expect(people(5)).toBe('5 people');
  });
});
