import { RSVP_SKINS, type RsvpSkin } from '@/components/rsvp/rsvp-theme';
import type { Site } from '@/lib/website/site';

type Theme = Site['templateId'];

/**
 * The wedding website in each design, drawn in the visual language of the
 * Stitch "Private Guest RSVP" screens (Traditional "Rajesh Sharma Family",
 * "Modern Minimal", "Royal Elegant"): cards, tags, detail boxes and a
 * photo in the welcome card. It shares the RSVP page's skins, so the
 * website and the RSVP section look like one thing; these add what only
 * the website has.
 */
export interface SiteSkin extends RsvpSkin {
  /** The sticky top bar's links. */
  navLink: string;
  /** Small label above a section heading ("The journey together"). */
  overline: string;
  /** A section heading. */
  heading: string;
  /** The main action ("RSVP for celebrations"). */
  primary: string;
  /** The quieter action ("See the celebrations", "Get directions"). */
  secondary: string;
  /** The welcome card's photo frame and its caption. */
  photo: string;
  caption: string;
  /** A number in the quick-facts row, and its label. */
  statValue: string;
  statLabel: string;
  /** The footer band. */
  footer: string;
}

const traditional: SiteSkin = {
  ...RSVP_SKINS.traditional,
  navLink: 'text-label-md font-semibold text-on-surface-variant hover:text-primary',
  overline: 'text-label-sm font-semibold tracking-widest text-secondary uppercase',
  heading: 'font-serif text-headline-lg-mobile text-on-surface sm:text-headline-lg',
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-title-sm font-semibold text-on-primary shadow-md transition-colors hover:bg-primary-container',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface-container px-4 py-2.5 text-label-md font-semibold text-primary transition-colors hover:bg-surface-container-high',
  photo: 'rounded-2xl shadow-sm',
  caption:
    'flex items-center gap-1.5 bg-linear-to-t from-on-surface/70 via-on-surface/20 to-transparent p-4 text-label-md tracking-wide text-surface',
  statValue: 'font-serif text-headline-md text-primary',
  statLabel: 'text-label-sm tracking-wider text-on-surface-variant uppercase',
  footer: 'rounded-2xl bg-surface-container-lowest p-6 shadow-sm',
};

const modern: SiteSkin = {
  ...RSVP_SKINS.modern,
  navLink:
    'font-mono text-[11px] tracking-widest text-minimal-body uppercase hover:text-minimal-ink',
  overline: 'font-mono text-[10px] tracking-[0.18em] text-minimal-tan uppercase',
  heading: 'font-serif text-[2rem] leading-tight font-normal text-minimal-text sm:text-[2.5rem]',
  primary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-minimal-ink px-5 py-3 font-mono text-[12px] tracking-widest text-white uppercase transition-colors hover:bg-minimal-ink-hover',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-md border border-minimal-line bg-surface-container-lowest px-4 py-2.5 font-mono text-[11px] tracking-wider text-minimal-text uppercase transition-colors hover:border-minimal-ink',
  photo: 'rounded-[0.875rem] border border-minimal-line',
  caption:
    'flex items-end justify-between gap-2 bg-linear-to-t from-black/60 to-transparent p-3 font-mono text-[10px] tracking-wider text-white/90 uppercase',
  statValue: 'font-serif text-[2rem] leading-none text-minimal-text',
  statLabel: 'font-mono text-[10px] tracking-widest text-minimal-muted uppercase',
  footer: 'rounded-[0.875rem] border border-minimal-line bg-surface-container-lowest p-6',
};

const royal: SiteSkin = {
  ...RSVP_SKINS.royal,
  navLink:
    'font-display text-[11px] font-semibold tracking-[0.16em] text-regal-label uppercase hover:text-regal-ink',
  overline: 'font-display text-[11px] font-bold tracking-[0.22em] text-regal-bronze uppercase',
  heading: 'font-serif text-headline-lg-mobile text-regal-ink sm:text-headline-lg',
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-regal-emboss-line bg-regal-emboss px-5 py-3 font-display text-[13px] font-bold tracking-wider text-regal-gold-ink shadow-md transition hover:brightness-105',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-regal-line bg-regal-pill px-4 py-2.5 text-label-md font-semibold text-regal-ink transition-colors hover:bg-regal-sand-deep',
  photo: 'rounded-2xl border border-regal-gold/45 shadow-md',
  caption:
    'flex items-center gap-1.5 bg-linear-to-t from-regal-deep/90 via-regal-deep/30 to-transparent p-4 font-display text-[12px] font-medium tracking-wider text-regal-cream',
  statValue: 'font-display text-[1.75rem] leading-none font-bold text-regal-ink',
  statLabel: 'text-[11px] font-semibold tracking-wider text-regal-bronze uppercase',
  footer: 'rounded-2xl border border-regal-gold/40 bg-regal-emerald p-6 text-regal-cream shadow-lg',
};

export const SITE_SKINS: Record<Theme, SiteSkin> = { traditional, modern, royal };
