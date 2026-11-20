import type { EventBrief } from '../events/events.service.js';
import type { Wedding } from '../weddings/schemas/wedding.schema.js';
import type { PublicEventDto, PublicWebsiteDto } from './dto/public-website.dto.js';
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
  wedding: Pick<Wedding, 'slug' | 'brideName' | 'groomName' | 'city' | 'state'>;
  templateId: WebsiteTemplate;
  content: WebsiteContent | undefined;
  events: readonly EventBrief[];
  preview: boolean;
}): PublicWebsiteDto {
  const events = publicEvents(input.events);
  const days = events
    .filter((event) => !event.cancelled && event.startDate)
    .map((event) => event.startDate as string)
    .sort();
  const first = days[0];
  const last = days.at(-1);
  const content = contentDto(input.content);
  return {
    slug: input.wedding.slug,
    templateId: input.templateId,
    brideName: input.wedding.brideName,
    groomName: input.wedding.groomName,
    coupleName: `${input.wedding.brideName} & ${input.wedding.groomName}`,
    city: input.wedding.city,
    state: input.wedding.state,
    ...content,
    ...(first && last ? { dateRange: { start: first, end: last } } : {}),
    events,
    preview: input.preview,
  };
}
