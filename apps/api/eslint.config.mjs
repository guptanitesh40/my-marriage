import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**']),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Unawaited promises silently drop errors — unacceptable around
      // transactions and job handlers.
      '@typescript-eslint/no-floating-promises': 'error',
      // AGENTS.md: no non-null assertions to silence the compiler.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Nest modules are legitimately empty decorated classes.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  prettier,
]);
