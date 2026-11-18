import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // `server-only` is a marker Next.js resolves itself; it is not installed.
    // Point it at the same empty module Next uses on the server.
    alias: { 'server-only': 'next/dist/compiled/server-only/empty.js' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
