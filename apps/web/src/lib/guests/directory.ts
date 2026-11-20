import type { components } from '@my-marriage/contracts';

export type Guest = components['schemas']['GuestDto'];
export type GuestDetail = components['schemas']['GuestDetailDto'];
export type GuestInvitation = components['schemas']['GuestInvitationDto'];
export type GuestTotals = components['schemas']['GuestTotalsDto'];
export type RsvpStatus = GuestInvitation['rsvp']['status'];

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: 'Pending',
  attending: 'Attending',
  not_attending: 'Not attending',
  maybe: 'Maybe',
};

/** Where the guest's invitation stands, from the link and the last email (PRD INV-08). */
export type Delivery =
  'not_shared' | 'link_ready' | 'email_queued' | 'email_sent' | 'email_failed' | 'link_revoked';

export const DELIVERY_LABELS: Record<Delivery, string> = {
  not_shared: 'Not shared',
  link_ready: 'Link ready',
  email_queued: 'Email queued',
  email_sent: 'Email sent',
  email_failed: 'Email failed',
  link_revoked: 'Link revoked',
};

/**
 * "Sent" means the mail server accepted it, never that it was delivered,
 * which Gmail cannot confirm (decision 0015).
 */
export function deliveryOf(guest: Pick<Guest, 'link' | 'lastEmail'>): Delivery {
  if (guest.link.status === 'revoked') return 'link_revoked';
  const state = guest.lastEmail?.state;
  if (state === 'queued' || state === 'processing') return 'email_queued';
  if (state === 'sent' || state === 'delivered') return 'email_sent';
  if (state === 'failed' || state === 'bounced') return 'email_failed';
  return guest.link.status === 'active' ? 'link_ready' : 'not_shared';
}

/** "Haldi 3/5 attending", "Sangeet pending", "Wedding not attending". */
export function answerLabel(invitation: GuestInvitation, partySize: number): string {
  const { status, attendingCount } = invitation.rsvp;
  if (invitation.cancelled) return `${invitation.title} cancelled`;
  if (status === 'attending')
    return `${invitation.title} ${attendingCount ?? 0}/${partySize} attending`;
  if (status === 'maybe') return `${invitation.title} maybe`;
  if (status === 'not_attending') return `${invitation.title} not attending`;
  return `${invitation.title} pending`;
}

/** The value of the RSVP filter for guests not invited to anything. */
export const NOT_INVITED = 'not_invited';

export const SORTS = { name: 'Name A–Z', updated: 'Recently updated' } as const;
export type GuestSort = keyof typeof SORTS;

/** What the list shows, kept in the address. */
export interface GuestFilters {
  q: string;
  /** An event ID: guests invited to it. */
  eventId: string;
  /** An RSVP status (for any ceremony, or the chosen one), or `not_invited`. */
  rsvp: RsvpStatus | typeof NOT_INVITED | '';
  delivery: Delivery | '';
  sort: GuestSort;
}

export const NO_FILTERS: GuestFilters = {
  q: '',
  eventId: '',
  rsvp: '',
  delivery: '',
  sort: 'name',
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function readFilters(params: SearchParams): GuestFilters {
  const eventId = first(params.eventId);
  const rsvp = first(params.rsvp);
  const delivery = first(params.delivery);
  const sort = first(params.sort);
  return {
    q: first(params.q).slice(0, 100),
    eventId: /^[a-f0-9]{24}$/i.test(eventId) ? eventId : '',
    rsvp: rsvp in RSVP_LABELS || rsvp === NOT_INVITED ? (rsvp as GuestFilters['rsvp']) : '',
    delivery: delivery in DELIVERY_LABELS ? (delivery as Delivery) : '',
    sort: sort in SORTS ? (sort as GuestSort) : 'name',
  };
}

export function filterParams(filters: GuestFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.eventId) params.set('eventId', filters.eventId);
  if (filters.rsvp) params.set('rsvp', filters.rsvp);
  if (filters.delivery) params.set('delivery', filters.delivery);
  if (filters.sort !== 'name') params.set('sort', filters.sort);
  return params;
}

export function isNarrowed(filters: GuestFilters): boolean {
  return Boolean(filters.q.trim() || filters.eventId || filters.rsvp || filters.delivery);
}

/** Every filter, and every word in the name, email or phone (phone digits however spaced). */
export function matches(guest: Guest, filters: GuestFilters): boolean {
  const scoped = filters.eventId
    ? guest.invitations.filter((invitation) => invitation.eventId === filters.eventId)
    : guest.invitations;
  if (filters.eventId && scoped.length === 0) return false;
  if (filters.rsvp === NOT_INVITED && guest.invitations.length > 0) return false;
  if (
    filters.rsvp &&
    filters.rsvp !== NOT_INVITED &&
    !scoped.some((invitation) => invitation.rsvp.status === filters.rsvp)
  ) {
    return false;
  }
  if (filters.delivery && deliveryOf(guest) !== filters.delivery) return false;
  const words = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = [guest.name, guest.email, guest.phone].filter(Boolean).join(' ').toLowerCase();
  const digits = guest.phone?.replace(/\D/g, '') ?? '';
  return words.every(
    (word) =>
      text.includes(word) || (/^\+?\d+$/.test(word) && digits.includes(word.replace('+', ''))),
  );
}

export function sortGuests(guests: readonly Guest[], sort: GuestSort): Guest[] {
  const list = [...guests];
  if (sort === 'updated') list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return list;
}

/** "5 people", "1 person". */
export function people(count: number): string {
  return count === 1 ? '1 person' : `${count} people`;
}
