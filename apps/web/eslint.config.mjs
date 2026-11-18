import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      // AGENTS.md, architecture rule 3: the web app knows the API only
      // through the generated contract.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@my-marriage/api', '@my-marriage/api/*', '**/apps/api/**'],
              message: 'Import API types from @my-marriage/contracts, never from apps/api.',
            },
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
]);
