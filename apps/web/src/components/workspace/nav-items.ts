import type { IconName } from '@/components/ui/icon';
import {
  eventsPath,
  expensesPath,
  guestsPath,
  tasksPath,
  vendorsPath,
  websitePath,
  workspacePath,
} from '@/lib/routes';

export interface NavItem {
  label: string;
  icon: IconName;
  /** Where it leads; missing while the section is still being built. */
  href?: (weddingId: string) => string;
  /** Current for its own address only, not the pages beneath it. */
  exact?: boolean;
}

/**
 * The workspace sections, in the order of the approved Stitch design. The
 * sections not built yet are listed (as "Soon") so the workspace shows
 * what is coming; each gets its `href` when its feature lands.
 */
export const WORKSPACE_NAV: readonly NavItem[] = [
  { label: 'Overview', icon: 'space-dashboard', href: workspacePath, exact: true },
  { label: 'Events', icon: 'calendar-month', href: eventsPath },
  { label: 'Tasks', icon: 'checklist', href: (weddingId) => tasksPath(weddingId) },
  { label: 'Guests & RSVP', icon: 'group', href: (weddingId) => guestsPath(weddingId) },
  {
    label: 'Expenses & Budget',
    icon: 'account-balance-wallet',
    href: (weddingId) => expensesPath(weddingId),
  },
  { label: 'Vendors', icon: 'storefront', href: (weddingId) => vendorsPath(weddingId) },
  { label: 'Wedding Website', icon: 'language', href: websitePath },
  { label: 'Photos & QR Drive', icon: 'photo-library' },
  { label: 'Team & Family', icon: 'supervisor-account' },
  { label: 'Settings', icon: 'settings' },
];
