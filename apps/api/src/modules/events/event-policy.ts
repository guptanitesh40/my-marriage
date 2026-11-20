/** Event rules and limits, in one place for review (decision 0010). */

/** The list answers with at most this many events, and says when there are more. */
export const EVENT_LIST_LIMIT = 100;

export const EVENT_LIMITS = {
  title: 80,
  description: 2000,
  venueName: 120,
  venueAddress: 300,
  dressCode: 120,
  url: 2048,
} as const;
