import type { components } from '@my-marriage/contracts';

type Membership = Pick<components['schemas']['WeddingDto'], 'role' | 'status'>;

/** The visitor's own active wedding: at most one, enforced by the API. */
export function ownedActiveWedding<T extends Membership>(weddings: readonly T[]): T | undefined {
  return weddings.find((wedding) => wedding.role === 'owner' && wedding.status === 'active');
}

/**
 * The wedding `/dashboard` opens: the visitor's own active wedding, or else
 * the newest one they belong to (the API lists newest first).
 */
export function landingWedding<T extends Membership>(weddings: readonly T[]): T | undefined {
  return ownedActiveWedding(weddings) ?? weddings[0];
}
