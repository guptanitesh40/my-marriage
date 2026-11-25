/** Where the API listens in development (`pnpm dev`). */
const LOCAL_API_ORIGIN = 'http://localhost:4000';

/**
 * The API's origin, for the /api/v1 forwarding (next.config.ts) and for
 * server rendering (as-visitor.ts). Falls back to the local API only off
 * Vercel: a deployment has nothing listening on its own port 4000, so a
 * missing or local value there fails the build with a reason, instead of
 * every page failing later with none.
 */
export function apiOrigin(env: Record<string, string | undefined> = process.env): string {
  const configured = env.API_ORIGIN;
  if (!env.VERCEL) return configured || LOCAL_API_ORIGIN;
  if (!configured) {
    throw new Error('API_ORIGIN must be set to the API’s public address on Vercel');
  }
  const host = new URL(configured).hostname;
  if (host === 'localhost' || host.endsWith('.localhost') || /^(127\.|0\.0\.0\.0$)/.test(host)) {
    throw new Error('API_ORIGIN must not be a local address on Vercel');
  }
  return configured;
}
