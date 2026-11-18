import { defineConfig } from 'vitest/config';

// Unit tests: no network, no database. Files live next to the code they test.
export default defineConfig({
  test: {
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
