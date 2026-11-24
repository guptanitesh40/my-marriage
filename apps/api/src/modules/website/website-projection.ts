import type { EventBrief } from '../events/events.service.js';
import type { Wedding } from '../weddings/schemas/wedding.schema.js';
import type { PublicEventDto, PublicVenueDto, PublicWebsiteDto } from './dto/public-website.dto.js';
import type { WebsiteContentDto } from './dto/website.dto.js';
import type { WebsiteContent } from './schemas/website-config.schema.js';
import type { WebsiteTemplate } from './website-policy.js';

/**
 * The one view of a wedding website (decision 0017), built the same way for
 * the public site and an organizer's preview, whatever the template. Each
 * value is copied field by field, so nothing else a record holds can reach
 * a guest (PRD SITE-05, SITE-06).
 */

export function contentDto(content: WebsiteContent | undefined): WebsiteContentDto {
  return {
    ...(content?.headline ? { headline: content.headline } : {}),
    ...(content?.story ? { story: content.story } : {}),
    faq: (content?.faq ?? []).map((item) => ({ question: item.question, answer: item.answer })),
    ...(content?.coverAssetId ? { coverImageId: content.coverAssetId.toHexString() } : {}),
    showVenue: Boolean(content?.showVenue),
    showGallery: Boolean(content?.showGallery),
  };
}

/** The main venue's known parts, when the website is set to show it; nothing otherwise. */
function publicVenue(
  wedding: Pick<Wedding, 'mainVenue'>,
  content: WebsiteContent | undefined,
): PublicVenueDto | undefined {
  const venue = wedding.mainVenue;
  if (!content?.showVenue || (!venue?.name && !venue?.address && !venue?.mapsUrl)) return undefined;
  return {
    ...(venue.name ? { name: venue.name } : {}),
    ...(venue.address ? { address: venue.address } : {}),
    ...(venue.mapsUrl ? { mapsUrl: venue.mapsUrl } : {}),
  };
}

export function publicEvent(event: EventBrief): PublicEventDto {
  return {
    title: event.title,
    ...(event.description ? { description: event.description } : {}),
    ...(event.startDate ? { startDate: event.startDate } : {}),
    ...(event.startTime ? { startTime: event.startTime } : {}),
    timeZone: event.timeZone,
    ...(event.venueName ? { venueName: event.venueName } : {}),
    ...(event.venueAddress ? { venueAddress: event.venueAddress } : {}),
    ...(event.mapsUrl ? { mapsUrl: event.mapsUrl } : {}),
    ...(event.dressCode ? { dressCode: event.dressCode } : {}),
    ...(event.livestreamVideoId ? { livestreamVideoId: event.livestreamVideoId } : {}),
    cancelled: event.cancelled,
  };
}

/** Deleted ceremonies never show; cancelled ones do, marked (decision 0017). */
export function publicEvents(events: readonly EventBrief[]): PublicEventDto[] {
  return events.filter((event) => !event.deleted).map(publicEvent);
}

export function projectWebsite(input: {
  wedding: Pick<Wedding, 'slug' | 'brideName' | 'groomName' | 'city' | 'state' | 'mainVenue'>;
  templateId: WebsiteTemplate;
  content: WebsiteContent | undefined;
  events: readonly EventBrief[];
  preview: boolean;
  /** Where the cover photo is served, for this audience. */
  coverUrl?: string;
}): PublicWebsiteDto {
  const events = publicEvents(input.events);
  const days = events
    .filter((event) => !event.cancelled && event.startDate)
    .map((event) => event.startDate as string)
    .sort();
  const first = days[0];
  const last = days.at(-1);
  const { headline, story, faq } = contentDto(input.content);
  const mainVenue = publicVenue(input.wedding, input.content);
  return {
    slug: input.wedding.slug,
    templateId: input.templateId,
    brideName: input.wedding.brideName,
    groomName: input.wedding.groomName,
    coupleName: `${input.wedding.brideName} & ${input.wedding.groomName}`,
    city: input.wedding.city,
    state: input.wedding.state,
    ...(headline ? { headline } : {}),
    ...(story ? { story } : {}),
    faq,
    ...(mainVenue ? { mainVenue } : {}),
    ...(input.coverUrl ? { coverUrl: input.coverUrl } : {}),
    ...(first && last ? { dateRange: { start: first, end: last } } : {}),
    events,
    preview: input.preview,
  };
}
