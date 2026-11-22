import type { ComposedEmail } from '../notifications/email-composer.js';
import { escapeHtml } from '../notifications/email-layout.js';
import type { EventBrief } from '../events/events.service.js';
import type { RsvpStatus } from './schemas/event-invitation.schema.js';

/**
 * The invitation has its own design, not the plain account-email layout: it
 * is the first thing a family sees of the wedding. Email clients ignore
 * stylesheets and many ignore flexbox, so it is built from tables with
 * inline styles, and web-safe fonts stand in for the app's.
 */
const C = {
  page: '#f2ede4',
  card: '#fffdf8',
  ink: '#1c1c16',
  muted: '#5b625f',
  primary: '#184539',
  gold: '#e2c195',
  goldInk: '#735a35',
  soft: '#f7f3ea',
  line: '#ece4d4',
  onPrimarySoft: '#cfe3da',
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Helvetica,Arial,sans-serif';

interface When {
  month: string;
  day: string;
  year: string;
  /** "Wednesday · 4:00 pm", or what is still to be announced. */
  line: string;
}

function whenOf(event: EventBrief): When {
  if (!event.startDate) {
    return { month: 'Date', day: '–', year: 'TBA', line: 'Date to be announced' };
  }
  // The stored day and time are the ceremony's own wall clock: read as UTC.
  const at = new Date(`${event.startDate}T${event.startTime ?? '00:00'}:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    at.toLocaleString('en-IN', { ...options, timeZone: 'UTC' });
  const weekday = part({ weekday: 'long' });
  const time = event.startTime
    ? part({ hour: 'numeric', minute: '2-digit', hour12: true })
    : 'Time to be announced';
  return {
    month: part({ month: 'short' }).toUpperCase(),
    day: part({ day: 'numeric' }),
    year: part({ year: 'numeric' }),
    line: `${weekday} · ${time}`,
  };
}

function placeOf(event: EventBrief): string {
  return (
    [event.venueName, event.venueAddress].filter(Boolean).join(', ') || 'Venue to be announced'
  );
}

/** A line under a ceremony, e.g. the guest's current answer. */
interface RowNote {
  text: string;
  color: string;
}

function eventRow(event: EventBrief, first: boolean, note?: RowNote): string {
  const when = whenOf(event);
  const border = first ? '' : `border-top:1px solid ${C.line};`;
  return (
    `<tr><td style="${border}padding:16px 0" valign="top">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>` +
    `<td width="64" valign="top" style="width:64px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="64" ` +
    `style="width:64px;background:${C.soft};border:1px solid ${C.line};border-radius:12px">` +
    `<tr><td align="center" style="padding:8px 4px 6px;font-family:${SANS}">` +
    `<div style="font-size:11px;letter-spacing:1.5px;font-weight:700;color:${C.goldInk}">${escapeHtml(when.month)}</div>` +
    `<div style="font-family:${SERIF};font-size:26px;line-height:30px;color:${C.ink}">${escapeHtml(when.day)}</div>` +
    `<div style="font-size:11px;color:${C.muted}">${escapeHtml(when.year)}</div>` +
    `</td></tr></table></td>` +
    `<td valign="top" style="padding-left:16px;font-family:${SANS}">` +
    `<div style="font-family:${SERIF};font-size:19px;line-height:26px;color:${C.ink}">${escapeHtml(event.title)}</div>` +
    `<div style="font-size:14px;line-height:21px;color:${C.ink};margin-top:2px">${escapeHtml(when.line)}</div>` +
    `<div style="font-size:14px;line-height:21px;color:${C.muted}">${escapeHtml(placeOf(event))}</div>` +
    (note
      ? `<div style="font-size:13px;line-height:20px;font-weight:700;color:${note.color};margin-top:6px">${escapeHtml(note.text)}</div>`
      : '') +
    `</td></tr></table></td></tr>`
  );
}

/** The ceremonies as plain text, for email apps that show no HTML. */
function eventLines(events: readonly EventBrief[], notes: readonly (RowNote | undefined)[]) {
  return events.flatMap((event, index) => {
    const when = whenOf(event);
    const month = when.month.charAt(0) + when.month.slice(1).toLowerCase();
    const date = event.startDate ? `${when.day} ${month} ${when.year}, ` : '';
    const note = notes[index];
    return [
      `• ${event.title}`,
      `  ${date}${when.line}`,
      `  ${placeOf(event)}`,
      ...(note ? [`  ${note.text}`] : []),
      '',
    ];
  });
}

const PRIVATE_NOTE =
  'This link is private to your family. Anyone with it can see and change your responses, so please don’t forward it.';

/**
 * The invitation card every guest email shares: brand, a green header with
 * the couple, the body, one button, and the private-link note. Every value
 * is escaped here or by the caller; `bodyHtml` and `footHtml` are trusted
 * markup built in this file.
 */
function card(input: {
  title: string;
  preview: string;
  eyebrow: string;
  coupleName: string;
  subline: string;
  bodyHtml: string;
  link: string;
  action: string;
  actionHint: string;
  footHtml?: string;
  /** The note under the button; by default, that the link is the family's own. */
  privacy?: { title: string; body: string };
}): string {
  const couple = escapeHtml(input.coupleName);
  const link = escapeHtml(input.link);
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">` +
    `<title>${escapeHtml(input.title)}</title></head>` +
    `<body style="margin:0;padding:0;background:${C.page}">` +
    // The line inbox apps show beside the subject; hidden in the email itself.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preview)}</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.page}" style="background:${C.page}">` +
    `<tr><td align="center" style="padding:28px 12px 40px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px">` +
    `<tr><td align="center" style="padding:0 0 18px;font-family:${SERIF};font-size:18px;font-style:italic;color:${C.primary}">My Marriage</td></tr>` +
    `<tr><td style="background:${C.card};border:1px solid ${C.gold};border-radius:20px;overflow:hidden">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
    `<tr><td align="center" bgcolor="${C.primary}" style="background:${C.primary};border-radius:19px 19px 0 0;padding:44px 28px 40px;font-family:${SANS}">` +
    `<div style="font-size:12px;letter-spacing:4px;font-weight:700;color:${C.gold}">${escapeHtml(input.eyebrow)}</div>` +
    `<div style="font-family:${SERIF};font-size:34px;line-height:42px;color:#ffffff;margin:14px 0 10px">${couple}</div>` +
    `<div style="font-size:14px;letter-spacing:6px;color:${C.gold}">— ✦ —</div>` +
    `<div style="font-size:15px;line-height:22px;color:${C.onPrimarySoft};margin-top:10px">${escapeHtml(input.subline)}</div>` +
    `</td></tr>` +
    `<tr><td style="padding:32px 28px 8px;font-family:${SANS};color:${C.ink};font-size:15px;line-height:24px">` +
    input.bodyHtml +
    `</td></tr>` +
    `<tr><td align="center" style="padding:20px 28px 8px;font-family:${SANS}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td align="center" bgcolor="${C.primary}" style="background:${C.primary};border-radius:12px">` +
    `<a href="${link}" style="display:inline-block;padding:16px 36px;font-family:${SANS};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${escapeHtml(input.action)}</a>` +
    `</td></tr></table>` +
    `<div style="font-size:13px;line-height:20px;color:${C.muted};margin-top:12px">${escapeHtml(input.actionHint)}</div>` +
    `</td></tr>` +
    `<tr><td style="padding:24px 28px 28px;font-family:${SANS}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>` +
    `<td style="background:${C.soft};border-radius:12px;padding:14px 16px;font-size:13px;line-height:20px;color:${C.muted}">` +
    `<b style="color:${C.ink}">&#128274; ${escapeHtml(input.privacy?.title ?? 'Private to your family.')}</b> ` +
    escapeHtml(
      input.privacy?.body ??
        'Anyone with this link can see and change your responses, so please don’t forward it.',
    ) +
    `<div style="margin-top:8px">If the button doesn’t work, copy this link into your browser:<br>` +
    `<a href="${link}" style="color:${C.primary};word-break:break-all">${link}</a></div>` +
    (input.footHtml ?? '') +
    `</td></tr></table></td></tr>` +
    `</table></td></tr>` +
    `<tr><td align="center" style="padding:20px 12px 0;font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted}">` +
    `Sent with My Marriage on behalf of ${couple}.</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

function sectionTitle(text: string): string {
  return (
    `<div style="font-size:12px;letter-spacing:2px;font-weight:700;color:${C.goldInk};padding-bottom:6px;border-bottom:1px solid ${C.gold}">` +
    `${escapeHtml(text.toUpperCase())}</div>`
  );
}

function eventTable(events: readonly EventBrief[], notes: readonly (RowNote | undefined)[] = []) {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
    events.map((event, index) => eventRow(event, index === 0, notes[index])).join('') +
    `</table>`
  );
}

function celebrationsOf(count: number): string {
  return count === 1 ? '1 celebration' : `${count} celebrations`;
}

/**
 * A guest's invitation (PRD INV-06): the couple, the ceremonies they are
 * invited to, and their private link. Says plainly that the link is private
 * and that anyone holding it can answer.
 */
export function guestInviteMessage(input: {
  coupleName: string;
  guestName: string;
  partySize: number;
  events: EventBrief[];
  link: string;
}): ComposedEmail {
  const people = input.partySize === 1 ? '1 person' : `up to ${input.partySize} people`;
  const celebrations = celebrationsOf(input.events.length);
  const subject = `You’re invited to ${input.coupleName}’s wedding`;
  const html = card({
    title: subject,
    preview: `${input.coupleName} would love to celebrate with your family: ${celebrations}. Please RSVP.`,
    eyebrow: 'YOU’RE INVITED',
    coupleName: input.coupleName,
    subline: 'would love you to celebrate their wedding with them',
    bodyHtml:
      `<div style="font-family:${SERIF};font-size:21px;line-height:28px;margin:0 0 10px">Dear ${escapeHtml(input.guestName)},</div>` +
      `<div style="margin:0 0 24px">We would be delighted to have your family with us. ` +
      `This invitation is for <b>${escapeHtml(people)}</b>.</div>` +
      sectionTitle(`Your ${celebrations}`) +
      eventTable(input.events),
    link: input.link,
    action: 'RSVP for your family',
    actionHint:
      'Answer for each celebration in a minute. No account or password needed, and you can change your answers any time.',
  });

  const text = [
    `Dear ${input.guestName},`,
    '',
    `You’re invited to ${input.coupleName}’s wedding. We would be delighted to have your family with us. This invitation is for ${people}.`,
    '',
    `YOUR ${celebrations.toUpperCase()}`,
    '',
    ...eventLines(input.events, []),
    `RSVP for your family: ${input.link}`,
    '',
    'No account or password needed, and you can change your answers any time.',
    '',
    PRIVATE_NOTE,
    '',
    `— Sent with My Marriage on behalf of ${input.coupleName}`,
  ].join('\n');

  return { subject, html, text };
}

/** A ceremony on a reminder, with the guest's current answer for it. */
export interface ReminderEvent {
  event: EventBrief;
  status: RsvpStatus;
  attendingCount?: number;
}

function answerNote(item: ReminderEvent, partySize: number): RowNote {
  switch (item.status) {
    case 'pending':
      return { text: '● Not answered yet', color: C.goldInk };
    case 'attending': {
      const count = item.attendingCount ?? partySize;
      const people = partySize === 1 ? '' : ` · ${count} of ${partySize} people`;
      return { text: `✓ Your answer: Attending${people}`, color: C.primary };
    }
    case 'maybe':
      return { text: 'Your answer: Maybe. Please confirm once you know.', color: C.goldInk };
    case 'not_attending':
      return {
        text: 'Your answer: Not attending. Plans changed? You can update it.',
        color: C.muted,
      };
  }
}

/** "Haldi", "Haldi and Matkor", "Haldi, Matkor and Sangeet". */
function listOf(titles: readonly string[]): string {
  if (titles.length <= 1) return titles[0] ?? '';
  return `${titles.slice(0, -1).join(', ')} and ${titles.at(-1) ?? ''}`;
}

/**
 * A reminder (PRD INV-07, decision 0016), by hand or on schedule: the
 * ceremonies it is about with the guest's current answer for each, the
 * couple's optional note, and the same private link. Says how to turn
 * reminders off.
 */
export function guestReminderMessage(input: {
  coupleName: string;
  guestName: string;
  partySize: number;
  items: ReminderEvent[];
  link: string;
  /** Automatic: days before the ceremonies. */
  daysBefore?: number;
  note?: string;
}): ComposedEmail {
  const titles = input.items.map((item) => item.event.title);
  const pending = input.items.filter((item) => item.status === 'pending').length;
  const days = input.daysBefore;
  const wedding = `${input.coupleName}’s wedding`;
  const subject =
    days !== undefined
      ? `${listOf(titles)} ${titles.length === 1 ? 'is' : 'are'} ${days === 1 ? 'tomorrow' : `in ${days} days`} · ${wedding}`
      : pending > 0
        ? `Please RSVP: ${wedding}`
        : `A reminder about ${wedding}`;
  const intro =
    pending === 0
      ? 'Thank you for your reply. Here are the details again; you can still change your answers any time.'
      : pending === input.items.length
        ? 'We haven’t heard from you yet. Please let us know who’s coming.'
        : `We haven’t heard from you yet for ${pending} of these celebrations. Please let us know who’s coming.`;
  const notes = input.items.map((item) => answerNote(item, input.partySize));
  const turnOff = `${input.link}&reminders`;
  const noteHtml = input.note
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px"><tr>` +
      `<td style="border-left:3px solid ${C.gold};background:${C.soft};border-radius:0 12px 12px 0;padding:12px 16px">` +
      `<div style="font-size:12px;letter-spacing:1.5px;font-weight:700;color:${C.goldInk}">A NOTE FROM ${escapeHtml(input.coupleName.toUpperCase())}</div>` +
      `<div style="font-family:${SERIF};font-size:16px;line-height:24px;color:${C.ink};margin-top:4px">` +
      `${escapeHtml(input.note).replace(/\r?\n/g, '<br>')}</div></td></tr></table>`
    : '';

  const html = card({
    title: subject,
    preview:
      pending > 0 ? `${intro} ${listOf(titles)}.` : `${listOf(titles)}: your details and answers.`,
    eyebrow:
      days !== undefined ? (days === 1 ? 'TOMORROW' : `${days} DAYS TO GO`) : 'A GENTLE REMINDER',
    coupleName: input.coupleName,
    subline: 'are looking forward to celebrating with you',
    bodyHtml:
      `<div style="font-family:${SERIF};font-size:21px;line-height:28px;margin:0 0 10px">Dear ${escapeHtml(input.guestName)},</div>` +
      `<div style="margin:0 0 24px">${escapeHtml(intro)}</div>` +
      noteHtml +
      sectionTitle(
        titles.length === 1 ? 'Your celebration' : `Your ${celebrationsOf(titles.length)}`,
      ) +
      eventTable(
        input.items.map((item) => item.event),
        notes,
      ),
    link: input.link,
    action: pending > 0 ? 'RSVP now' : 'View or change your RSVP',
    actionHint: 'No account or password needed.',
    footHtml:
      `<div style="margin-top:8px">Don’t want reminder emails? ` +
      `<a href="${escapeHtml(turnOff)}" style="color:${C.primary}">Turn them off</a> at the bottom of your invitation.</div>`,
  });

  const text = [
    `Dear ${input.guestName},`,
    '',
    intro,
    '',
    ...(input.note ? [`A note from ${input.coupleName}:`, input.note, ''] : []),
    titles.length === 1
      ? 'YOUR CELEBRATION'
      : `YOUR ${celebrationsOf(titles.length).toUpperCase()}`,
    '',
    ...eventLines(
      input.items.map((item) => item.event),
      notes,
    ),
    `${pending > 0 ? 'RSVP now' : 'View or change your RSVP'}: ${input.link}`,
    '',
    PRIVATE_NOTE,
    `Don’t want reminder emails? Turn them off at the bottom of your invitation: ${turnOff}`,
    '',
    `— Sent with My Marriage on behalf of ${input.coupleName}`,
  ].join('\n');

  return { subject, html, text };
}

/**
 * Asks a guest for their photos (decision 0019): the wedding's upload link,
 * which needs no account. Says plainly that the couple reviews every photo
 * and that approved ones may appear on the wedding website.
 */
export function photoInviteMessage(input: {
  coupleName: string;
  guestName: string;
  link: string;
}): ComposedEmail {
  const subject = `Share your photos from ${input.coupleName}’s wedding`;
  const html = card({
    title: subject,
    preview: `${input.coupleName} would love to see the moments you captured.`,
    eyebrow: 'SHARE YOUR MEMORIES',
    coupleName: input.coupleName,
    subline: 'would love to see the moments you captured',
    bodyHtml:
      `<div style="font-family:${SERIF};font-size:21px;line-height:28px;margin:0 0 10px">Dear ${escapeHtml(input.guestName)},</div>` +
      `<div style="margin:0 0 8px">Thank you for celebrating with us. If you took photos, we would love to have them: ` +
      `add as many as you like, for any of the celebrations.</div>`,
    link: input.link,
    action: 'Add your photos',
    actionHint:
      'No account or app needed: choose photos from your phone or computer. JPG, PNG or WebP, up to 25 MB each.',
    privacy: {
      title: 'Reviewed by the couple.',
      body: 'Photos go to the couple first. Only the ones they approve may appear on their wedding website, and your name is never shown with them.',
    },
  });
  const text = [
    `Dear ${input.guestName},`,
    '',
    `Thank you for celebrating ${input.coupleName}’s wedding. If you took photos, they would love to have them: add as many as you like, for any of the celebrations.`,
    '',
    `Add your photos: ${input.link}`,
    '',
    'No account or app needed. JPG, PNG or WebP, up to 25 MB each.',
    'Photos go to the couple first. Only the ones they approve may appear on their wedding website, and your name is never shown with them.',
    '',
    `— Sent with My Marriage on behalf of ${input.coupleName}`,
  ].join('\n');
  return { subject, html, text };
}
