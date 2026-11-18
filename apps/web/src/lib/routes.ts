/**
 * Every destination the public pages link to, in one place.
 *
 * `login` is the target of "Log in" and every "Start planning free" button.
 * The authentication milestone builds that page; it is responsible for
 * sending visitors who are already signed in straight to their dashboard.
 * Until then the link resolves to a 404 in development.
 */
export const routes = {
  home: '/',
  login: '/login',
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
 * A public wedding URL (/w/<slug>) as shown in mock-ups. The domain is an
 * ellipsis because one has not been chosen yet.
 */
export function publicWeddingUrl(slug: string): string {
  return `…/w/${slug}`;
}
