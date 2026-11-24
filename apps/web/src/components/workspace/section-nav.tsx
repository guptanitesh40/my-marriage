'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { WORKSPACE_NAV, type NavItem } from './nav-items';

function isCurrent(item: NavItem, href: string, pathname: string): boolean {
  return item.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** The workspace sections, with the current one highlighted. */
export function SectionNav({
  weddingId,
  managesTeam,
}: {
  weddingId: string;
  /** Owners and admins see the team page; managers do not. */
  managesTeam: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace" className="px-2 py-1">
      <p className="px-3 pt-2 pb-1 text-label-sm tracking-wider text-on-surface-variant uppercase">
        Workspace
      </p>
      <ul className="flex flex-col gap-0.5">
        {WORKSPACE_NAV.filter((item) => managesTeam || !item.adminsOnly).map((item) => {
          const href = item.href(weddingId);
          const current = isCurrent(item, href, pathname);
          return (
            <li key={item.label}>
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm transition-colors ${
                  current
                    ? 'bg-primary-container font-semibold text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon name={item.icon} className="size-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
