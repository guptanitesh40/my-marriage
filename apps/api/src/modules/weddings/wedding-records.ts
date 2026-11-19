import type { Types } from 'mongoose';
import { duplicateKey } from '../../platform/mongo.js';
import type { WeddingDto } from './dto/wedding.dto.js';
import { ACTIVE_OWNED_INDEX, type MembershipRole } from './schemas/wedding-membership.schema.js';
import type { Wedding } from './schemas/wedding.schema.js';

/** Shared by the weddings module's services: stored records to and from the API. */

/** Which unique index a duplicate-key error came from, if it is one. */
export function duplicateKeyOn(error: unknown): 'slug' | 'activeOwned' | 'other' | null {
  const duplicate = duplicateKey(error);
  if (!duplicate) return null;
  if ('slug' in duplicate.keyPattern) return 'slug';
  if (duplicate.message.includes(ACTIVE_OWNED_INDEX)) return 'activeOwned';
  return 'other';
}

export function toDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

export function toWeddingDto(
  wedding: Wedding & { _id: Types.ObjectId },
  role: MembershipRole,
): WeddingDto {
  return {
    id: wedding._id.toHexString(),
    slug: wedding.slug,
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    city: wedding.city,
    state: wedding.state,
    ...(wedding.weddingDate ? { weddingDate: wedding.weddingDate.toISOString().slice(0, 10) } : {}),
    status: wedding.status,
    role,
  };
}
