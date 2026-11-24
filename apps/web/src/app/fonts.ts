import { Manrope, Newsreader } from 'next/font/google';

// Newsreader for editorial headings (with its italic, used for accents),
// Manrope for product text (docs/design). Shared by the root layout and the
// global error page, which renders its own document.
export const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});
export const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });

export const fontClasses = `${newsreader.variable} ${manrope.variable}`;
