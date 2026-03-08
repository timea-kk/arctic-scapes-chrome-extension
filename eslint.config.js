/**
 * eslint.config.js
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
 * Three environments are configured:
 *   - Extension files (root *.js) — browser + Chrome API globals
 *   - scripts/                    — Node.js globals (file system, process, etc.)
 *   - tests/                      — both Node and browser globals (tests run in
 *                                   Node but test browser code)
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/', 'coverage/'],
  },
  // Browser extension files
  {
    files: ['**/*.js'],
    ignores: ['scripts/**', 'tests/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
  // Node scripts
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
  // Tests
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
