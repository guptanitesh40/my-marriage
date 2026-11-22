/**
 * Every destination the pages link to, in one place.
 *
 * `login` is the target of "Log in" and every "Start planning free" button
 * for visitors who are not signed in; it links new visitors to signup.
 */
export const routes = {
  home: '/',
  login: '/login',
  signup: '/signup',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  /**
   * Wedding onboarding, step 1: create the wedding. Shows the invitations
   * waiting for the visitor first, if any.
   */
  onboarding: '/onboarding',
  /** Step 1's form even when invitations are waiting ("Start my own wedding instead"). */
  onboardingStartOwn: '/onboarding?start=own',
  /** Step 2: invite your partner (optional). */
  onboardingPartner: '/onboarding/partner',
  /** Where a partner invitation email leads. */
  acceptInvitation: '/invitations/accept',
  privacy: '/privacy',
  terms: '/terms',
} as const;

/** In-page sections of the homepage, used by the header and footer navigation. */
export const homeSections = {
  features: 'features',
  howItWorks: 'how-it-works',
  weddingWebsites: 'wedding-websites',
  faq: 'faq',
} as const;

export function homeSection(id: (typeof homeSections)[keyof typeof homeSections]): string {
  return `${routes.home}#${id}`;
}

/**
 * A wedding's workspace. `/dashboard` leads here; the wedding is in the
 * address so a page never depends on a remembered "current wedding".
 */
export function workspacePath(weddingId: string): string {
  return `/weddings/${encodeURIComponent(weddingId)}`;
}

/** A wedding's ceremonies. */
export function eventsPath(weddingId: string): string {
  return `${workspacePath(weddingId)}/events`;
}

/** `/login?next=<path>`: sign in, then come back to `path`. */
export function loginThenReturnTo(path: string): string {
  return `${routes.login}?${new URLSearchParams({ next: path }).toString()}`;
}

/**
 * A public wedding URL (/w/<slug>) as shown in mock-ups. The domain is an
 * ellipsis because one has not been chosen yet.
 */
export function publicWeddingUrl(slug: string): string {
  return `…/w/${slug}`;
}

/** A wedding's Tasks page, with its filters in the query string. */
export function tasksPath(weddingId: string, query?: URLSearchParams): string {
  const search = query?.toString();
  return `${workspacePath(weddingId)}/tasks${search ? `?${search}` : ''}`;
}

/** A wedding's vendor directory, with its filters in the query string. */
export function vendorsPath(weddingId: string, query?: URLSearchParams): string {
  const search = query?.toString();
  return `${workspacePath(weddingId)}/vendors${search ? `?${search}` : ''}`;
}

/** A wedding's expenses, with their filters in the query string. */
export function expensesPath(weddingId: string, query?: URLSearchParams): string {
  const search = query?.toString();
  return `${workspacePath(weddingId)}/expenses${search ? `?${search}` : ''}`;
}

/** A wedding's guest list, with its filters in the query string. */
export function guestsPath(weddingId: string, query?: URLSearchParams): string {
  const search = query?.toString();
  return `${workspacePath(weddingId)}/guests${search ? `?${search}` : ''}`;
}

/** A wedding's Photos page, with its album filter in the query string. */
export function photosPath(weddingId: string, query?: URLSearchParams): string {
  const search = query?.toString();
  return `${workspacePath(weddingId)}/photos${search ? `?${search}` : ''}`;
}

/** One album of a wedding. */
export function albumPath(weddingId: string, albumId: string): string {
  return `${photosPath(weddingId)}/albums/${albumId}`;
}

/** A wedding's website editor. */
export function websitePath(weddingId: string): string {
  return `${workspacePath(weddingId)}/website`;
}

/** The organizers' full-page preview of the website's saved draft, in one design or another. */
export function websitePreviewPath(weddingId: string, templateId?: string): string {
  const path = `${websitePath(weddingId)}/preview`;
  return templateId ? `${path}?${new URLSearchParams({ template: templateId }).toString()}` : path;
}

/** A published wedding website, public at its address. */
export function publicSitePath(slug: string): string {
  return `/w/${slug}`;
}

/** A guest's private invitation page; the link's secret follows `#t=`. */
export const invitationPath = '/invitation';
