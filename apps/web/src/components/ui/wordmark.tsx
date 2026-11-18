import Link from 'next/link';
import { routes } from '@/lib/routes';
import { LogoMark } from './logo-mark';

/** Logo and name, linking home. Used in the header and footer. */
export function Wordmark() {
  return (
    <Link
      href={routes.home}
      className="group inline-flex shrink-0 items-center gap-2 rounded-base whitespace-nowrap"
    >
      <LogoMark className="size-8" />
      <span className="font-serif text-headline-sm tracking-tight text-on-surface italic transition-colors group-hover:text-primary-container">
        My Marriage
      </span>
      <span className="mb-1 size-1.5 rounded-full bg-secondary" aria-hidden="true" />
    </Link>
  );
}
