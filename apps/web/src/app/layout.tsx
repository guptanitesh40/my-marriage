import type { Metadata } from 'next';
import { Manrope, Newsreader } from 'next/font/google';
import './globals.css';

// Newsreader for editorial headings, Manrope for product text (docs/design).
const newsreader = Newsreader({ variable: '--font-newsreader', subsets: ['latin'] });
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My Marriage',
  description: 'Plan, coordinate, celebrate and preserve your wedding in one place.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
