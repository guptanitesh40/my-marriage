import type { IconName } from '@/components/ui/icon';
import {
  eventsPath,
  expensesPath,
  guestsPath,
  photosPath,
  settingsPath,
  teamPath,
  tasksPath,
  vendorsPath,
  websitePath,
  workspacePath,
} from '@/lib/routes';

export interface NavItem {
  label: string;
  icon: IconName;
  href: (weddingId: string) => string;
  /** Current for its own address only, not the pages beneath it. */
  exact?: boolean;
  /** Shown to owners and admins only (the page itself is refused to others). */
  adminsOnly?: boolean;
}

/** The workspace sections, in the order of the approved Stitch design. */
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
  { label: 'Photos & QR Drive', icon: 'photo-library', href: (weddingId) => photosPath(weddingId) },
  {
    label: 'Team & Family',
    icon: 'supervisor-account',
    href: (weddingId) => teamPath(weddingId),
    adminsOnly: true,
  },
  { label: 'Settings', icon: 'settings', href: settingsPath },
];
