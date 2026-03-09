/**
 * eslint.config.ts
 *
 * Configuration for ESLint — a tool that automatically checks your code for
 * common mistakes and style issues while you write it. Think of it as a
 * spell-checker, but for JavaScript. It flags things like unused variables,
 * accidental globals, and other easy-to-miss problems.
 *
 * This file tells ESLint which files to check and what environment they run in,
 * because the rules for browser code (which has access to `window`, `document`,
 * `chrome`, etc.) are different from Node.js scripts (which have access to
 * `process`, `fs`, etc.).
 *
 * Two environments are configured:
 *   - Extension source files (src/**/*.ts) — browser + Chrome API globals
 *   - Tests (tests/**/*.ts)                — both Node and browser globals
 */

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'scripts/',
    ],
  },
  // TypeScript extension source files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  // Tests
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
);
