import type { Types } from 'mongoose';
import { duplicateKey } from '../../platform/mongo.js';
import type { WeddingDto, WeddingVenueDto } from './dto/wedding.dto.js';
import type { MembershipRole } from './schemas/wedding-membership.schema.js';
import type { Wedding } from './schemas/wedding.schema.js';

/** Shared by the weddings module's services: stored records to and from the API. */

/** Which unique index a duplicate-key error came from, if it is one. */
export function duplicateKeyOn(error: unknown): 'slug' | 'other' | null {
  const duplicate = duplicateKey(error);
  if (!duplicate) return null;
  if ('slug' in duplicate.keyPattern) return 'slug';
  return 'other';
}

export function toDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** The venue's known parts; nothing when none is known. */
function venueOf(wedding: Wedding): WeddingVenueDto | undefined {
  const venue = wedding.mainVenue;
  if (!venue?.name && !venue?.address && !venue?.mapsUrl) return undefined;
  return {
    ...(venue.name ? { name: venue.name } : {}),
    ...(venue.address ? { address: venue.address } : {}),
    ...(venue.mapsUrl ? { mapsUrl: venue.mapsUrl } : {}),
  };
}

export function toWeddingDto(
  wedding: Wedding & { _id: Types.ObjectId },
  role: MembershipRole,
): WeddingDto {
  const mainVenue = venueOf(wedding);
  return {
    id: wedding._id.toHexString(),
    slug: wedding.slug,
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    city: wedding.city,
    state: wedding.state,
    ...(wedding.weddingDate ? { weddingDate: wedding.weddingDate.toISOString().slice(0, 10) } : {}),
    ...(mainVenue ? { mainVenue } : {}),
    ...(wedding.description ? { description: wedding.description } : {}),
    status: wedding.status,
    ...(wedding.archivedAt ? { archivedAt: wedding.archivedAt.toISOString() } : {}),
    role,
  };
}
