import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NavigationProgress } from '@/components/ui/navigation-progress';
import { fontClasses } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'My Marriage', template: '%s · My Marriage' },
  description: 'Plan, coordinate, celebrate and preserve your wedding in one place.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${fontClasses} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Reads the address, so it waits for the request; it shows nothing until a click. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
