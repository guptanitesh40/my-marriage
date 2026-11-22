import { Cinzel, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

// The RSVP page's Modern Minimal and Royal / Elegant type (Stitch "Private
// Guest RSVP"). Not preloaded: a page in one design never downloads the
// others' fonts.
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  preload: false,
});
const mono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  preload: false,
});
const cinzel = Cinzel({ variable: '--font-cinzel', subsets: ['latin'], preload: false });

/** Classes that define the fonts' variables; put them on the page's root. */
export const rsvpFonts = `${jakarta.variable} ${mono.variable} ${cinzel.variable}`;
