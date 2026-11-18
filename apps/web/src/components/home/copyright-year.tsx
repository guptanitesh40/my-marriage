import { cacheLife } from 'next/cache';

// The current year can't be read during prerendering (Cache Components
// treat `new Date()` as request-time data), so it is cached: computed once,
// refreshed at most daily.
export async function CopyrightYear() {
  'use cache';
  cacheLife('days');
  return <>{new Date().getFullYear()}</>;
}
