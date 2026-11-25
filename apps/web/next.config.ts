import type { NextConfig } from 'next';
import { apiOrigin } from './src/lib/api/origin';

// Where the NestJS API listens. The browser never sees this: it always calls
// the web origin, and Next forwards /api/v1/* here. Same-origin requests are
// what let the HttpOnly session cookies work without CORS. In production the
// load balancer does this routing instead.
//
// Rewrites are resolved by `next build`, so for this forwarding API_ORIGIN is
// a build-time value. Server Components read it at run time (lib/api/server).
const api = apiOrigin();

// Baseline for every page. A full Content-Security-Policy (script and image
// sources) is still to be designed; until then this stops the two cheapest
// attacks: framing our pages (clickjacking) and MIME sniffing.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Pages opened from emailed links. The secret is in the URL fragment,
      // which browsers never send, but send no referrer from them at all.
      ...['/verify-email', '/reset-password', '/invitations/accept', '/u'].map((source) => ({
        source,
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      })),
    ];
  },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${api}/api/v1/:path*` }];
  },
};

export default nextConfig;
