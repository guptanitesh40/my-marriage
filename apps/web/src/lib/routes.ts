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
  /** Wedding onboarding, step 1: create the wedding. */
  onboarding: '/onboarding',
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
