import { CopyrightYear } from './copyright-year';
import { SiteFooterContent } from './site-footer-content';

/** The footer of the public pages, with the year cached on the server. */
export function SiteFooter() {
  return <SiteFooterContent year={<CopyrightYear />} />;
}
