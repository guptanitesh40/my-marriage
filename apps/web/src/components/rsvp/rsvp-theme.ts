import type { GuestView } from '@/lib/guests/guests';

export type RsvpThemeId = GuestView['templateId'];

/**
 * The RSVP page in each website design, taken class for class from the
 * Stitch screens (docs/design/guest-management-rsvp/themes): "Private Guest
 * RSVP — Rajesh Sharma Family" (Traditional), "— Modern Minimal" and
 * "— Royal Elegant". Only the look changes; the questions, answers and
 * rules are the same in every design.
 */
export interface RsvpSkin {
  /** The page behind everything. */
  page: string;
  /** The top bar. */
  header: string;
  /** A card: ceremonies, "All celebrations", reminders. */
  card: string;
  /** The ceremony tag: "Function 1 of 2", or Modern's "01 / HALDI". */
  tag: string;
  tagIcon: string;
  /** A ceremony's name. */
  title: string;
  /** The answer badge: "Attending (3)". */
  status: string;
  /** The box with the day, venue and attire. */
  details: string;
  detailIcon: string;
  detailStrong: string;
  detailText: string;
  /** "Will your family join?" */
  question: string;
  /** The three answers. */
  choices: string;
  choice: string;
  choiceOn: string;
  choiceIcon: string;
  choiceIconOn: string;
  /** The headcount box. */
  counter: string;
  counterQuestion: string;
  counterWho: string;
  stepper: string;
  stepperButton: string;
  stepperCount: string;
  counterFoot: string;
  counterFootStrong: string;
  fullFamily: string;
  /** Notes under the answers. */
  note: string;
  /** "Your responses are currently saved". */
  saved: string;
  savedIcon: string;
  /** The save button. */
  submit: string;
  submitIcon: string;
  /** The private-link note at the end. */
  privacy: string;
  privacyIcon: string;
  /** Headings in the reminders card. */
  cardHeading: string;
  body: string;
}

const traditional: RsvpSkin = {
  page: 'bg-surface text-on-surface',
  header: 'bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl',
  card: 'rounded-2xl bg-surface-container-lowest p-5 shadow-sm',
  tag: 'inline-flex items-center gap-1 rounded-full bg-secondary-container/40 px-2 py-0.5 text-label-sm text-on-secondary-container',
  tagIcon: 'size-3.5',
  title: 'font-serif text-headline-sm text-on-surface',
  status:
    'shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-label-sm font-semibold text-primary',
  details:
    'flex flex-col gap-1 rounded-xl bg-surface-container-low p-2.5 text-body-sm text-on-surface-variant',
  detailIcon: 'size-4 text-secondary',
  detailStrong: 'font-semibold text-on-surface',
  detailText: '',
  question: 'text-label-sm tracking-wider text-on-surface-variant uppercase',
  choices: 'grid grid-cols-3 gap-1.5 rounded-xl bg-surface-container p-1',
  choice: 'rounded-lg text-label-md text-on-surface-variant hover:text-on-surface',
  choiceOn: 'peer-checked:bg-primary peer-checked:text-on-primary peer-checked:shadow-sm',
  choiceIcon: 'size-4',
  choiceIconOn: '',
  counter: 'rounded-xl bg-surface-container-low p-3.5',
  counterQuestion: 'text-title-sm text-on-surface',
  counterWho: 'mt-0.5 text-body-sm font-medium text-primary',
  stepper: 'flex items-center gap-2 rounded-xl bg-surface-container-lowest p-1 shadow-xs',
  stepperButton:
    'flex size-8 items-center justify-center rounded-lg bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high active:scale-95 disabled:opacity-30',
  stepperCount: 'w-7 text-center text-title-sm text-on-surface tabular-nums',
  counterFoot:
    'mt-2.5 flex items-center justify-between gap-2 pt-2 text-label-sm text-on-surface-variant',
  counterFootStrong: 'font-semibold text-primary',
  fullFamily:
    'rounded bg-secondary-container px-2 text-label-sm font-semibold text-on-secondary-container',
  note: 'rounded-xl bg-surface-container-low p-3 text-body-sm text-secondary',
  saved:
    'flex items-center justify-center gap-1.5 rounded-xl bg-primary-fixed p-2.5 text-label-sm font-semibold text-on-primary-fixed',
  savedIcon: 'size-4 text-primary',
  submit:
    'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-title-sm text-on-primary shadow-md transition-all hover:bg-primary-container active:scale-[0.99] disabled:opacity-60',
  submitIcon: 'size-5',
  privacy: 'text-label-sm text-on-surface-variant',
  privacyIcon: 'size-4 text-secondary',
  cardHeading: 'text-title-md text-on-surface',
  body: 'text-body-sm text-on-surface-variant',
};

const modern: RsvpSkin = {
  page: 'bg-minimal-surface text-minimal-text',
  header: 'border-b border-minimal-line/60 bg-minimal-surface/90 backdrop-blur-md',
  card: 'rounded-[0.875rem] border border-minimal-line bg-surface-container-lowest p-5',
  tag: 'font-mono text-[10px] font-medium tracking-widest text-minimal-tan uppercase',
  tagIcon: 'hidden',
  title: 'font-serif text-[22px] leading-snug font-normal text-minimal-text',
  status:
    'shrink-0 rounded-full border border-minimal-ink/20 bg-minimal-ink/5 px-2 py-0.5 font-mono text-[10px] font-medium text-minimal-ink uppercase',
  details:
    'flex flex-col gap-1.5 rounded-md border border-minimal-line/60 bg-minimal-subtle p-3 text-[12px]',
  detailIcon: 'hidden',
  detailStrong: 'font-medium text-minimal-text',
  detailText: 'text-minimal-body',
  question: 'font-mono text-[10px] tracking-wider text-minimal-muted uppercase',
  choices: 'grid grid-cols-3 gap-1 rounded-md border border-minimal-line bg-minimal-subtle p-1',
  choice:
    'rounded-[3px] font-mono text-[11px] tracking-wide text-minimal-body hover:text-minimal-text',
  choiceOn: 'peer-checked:bg-minimal-ink peer-checked:font-medium peer-checked:text-white',
  choiceIcon: 'hidden',
  choiceIconOn: '',
  counter: 'rounded-md border border-minimal-line bg-minimal-subtle p-3.5',
  counterQuestion: 'font-mono text-[9px] tracking-widest text-minimal-muted uppercase',
  counterWho: 'mt-0.5 text-[13px] font-medium text-minimal-text',
  stepper: 'flex items-center gap-2.5',
  stepperButton:
    'flex size-8 items-center justify-center rounded-full border border-minimal-line bg-surface-container-lowest text-minimal-text transition-all hover:border-minimal-ink active:scale-95 disabled:pointer-events-none disabled:opacity-30',
  stepperCount: 'w-6 text-center font-mono text-[15px] font-medium text-minimal-text',
  counterFoot:
    'mt-2.5 flex items-center justify-between gap-2 border-t border-minimal-line/60 pt-2 font-mono text-[10px] text-minimal-muted uppercase',
  counterFootStrong: 'font-medium text-minimal-ink',
  fullFamily: 'rounded border border-minimal-tan/30 px-1.5 font-mono text-[9px] text-minimal-tan',
  note: 'rounded-md border border-minimal-line/70 bg-minimal-subtle p-3 text-[12px] text-minimal-body italic',
  saved:
    'flex items-center justify-center gap-1.5 rounded-md border border-minimal-ink/20 bg-minimal-ink/5 p-2 font-mono text-[10px] font-medium tracking-wide text-minimal-ink uppercase',
  savedIcon: 'size-1.5 rounded-full bg-minimal-ink',
  submit:
    'flex h-12 w-full items-center justify-center gap-2 rounded-md bg-minimal-ink font-mono text-[12px] tracking-widest text-white uppercase shadow-[0_2px_8px_rgba(26,61,52,0.15)] transition-all hover:bg-minimal-ink-hover active:scale-[0.99] disabled:opacity-60',
  submitIcon: 'size-4.5',
  privacy: 'font-mono text-[10px] text-minimal-muted uppercase',
  privacyIcon: 'size-3.5',
  cardHeading: 'font-serif text-[20px] font-normal text-minimal-text',
  body: 'text-[12.5px] leading-relaxed text-minimal-body',
};

const royal: RsvpSkin = {
  page: 'bg-regal-surface text-on-surface',
  header: 'border-b border-regal-header-line bg-regal-surface/90 backdrop-blur-md',
  card: 'relative overflow-hidden rounded-2xl border border-regal-gold/45 bg-regal-card p-5 shadow-sm',
  tag: 'inline-flex items-center gap-1 rounded-full border border-regal-line bg-regal-pill px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-regal-bronze',
  tagIcon: 'size-3.5 text-regal-bronze-soft',
  title: 'font-serif text-headline-sm text-regal-ink',
  status:
    'shrink-0 rounded-full border border-regal-ink/25 bg-regal-ink/10 px-2.5 py-1 text-label-sm font-bold tracking-wide text-regal-ink',
  details:
    'flex flex-col gap-1.5 rounded-xl border border-regal-line bg-regal-sand p-3 text-[13px] text-regal-body',
  detailIcon: 'size-4 text-regal-bronze-soft',
  detailStrong: 'font-semibold text-regal-text',
  detailText: 'text-regal-body',
  question: 'font-display text-[11px] font-bold tracking-[0.18em] text-regal-label uppercase',
  choices: 'grid grid-cols-3 gap-1.5 rounded-xl border border-regal-line bg-regal-sand-deep p-1',
  choice:
    'rounded-lg border border-transparent text-label-md text-regal-body hover:text-on-surface',
  choiceOn:
    'peer-checked:border-regal-gold/60 peer-checked:bg-regal-ink peer-checked:font-semibold peer-checked:text-regal-cream peer-checked:shadow-sm',
  choiceIcon: 'size-4',
  choiceIconOn: 'peer-checked:text-regal-gold-light',
  counter: 'rounded-xl border border-regal-line bg-regal-sand p-3.5',
  counterQuestion: 'text-title-sm font-semibold text-regal-text',
  counterWho: 'mt-0.5 text-[13px] font-semibold text-regal-ink',
  stepper:
    'flex items-center gap-2 rounded-xl border border-regal-line-strong bg-surface-container-lowest p-1 shadow-xs',
  stepperButton:
    'flex size-8 items-center justify-center rounded-lg border border-regal-line bg-regal-pill text-regal-ink transition-colors hover:bg-regal-sand-deep active:scale-95 disabled:opacity-30',
  stepperCount: 'w-7 text-center font-display text-title-sm font-bold text-regal-ink',
  counterFoot:
    'mt-2.5 flex items-center justify-between gap-2 border-t border-regal-line pt-2 text-[11px] text-regal-muted',
  counterFootStrong: 'font-bold tracking-wide text-regal-ink',
  fullFamily:
    'rounded border border-regal-emboss-line bg-regal-emboss px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-regal-gold-ink',
  note: 'rounded-xl border border-regal-line bg-regal-sand p-3 text-body-sm text-regal-bronze',
  saved:
    'flex items-center justify-center gap-1.5 rounded-xl border border-regal-mint-line bg-regal-mint p-2.5 text-label-sm font-bold tracking-wide text-regal-ink shadow-xs',
  savedIcon: 'size-4 text-regal-ink',
  submit:
    'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-regal-gold/70 bg-regal-emerald font-display text-[14px] font-bold tracking-wider text-regal-cream shadow-md transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60',
  submitIcon: 'size-5 text-regal-gold-light',
  privacy: 'text-[11px] font-medium text-regal-muted',
  privacyIcon: 'size-4 text-regal-bronze-soft',
  cardHeading: 'font-serif text-[17px] text-regal-ink',
  body: 'text-[13px] leading-relaxed text-regal-body',
};

export const RSVP_SKINS: Record<RsvpThemeId, RsvpSkin> = { traditional, modern, royal };
