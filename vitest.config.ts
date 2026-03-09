/**
 * vitest.config.ts
 *
 * Configuration for Vitest — the test runner that executes the automated tests
 * in the tests/ folder. Run `npm test` to use it.
 *
 * Settings:
 *   environment: 'node'  — tests run in Node.js (not a browser), which is faster
 *                          and doesn't require a screen. Browser APIs that the
 *                          tests need (like sessionStorage) are mocked manually.
 *
 *   coverage.provider    — uses V8 (Node's built-in engine) to measure which
 *                          lines of code get executed during the tests.
 *
 *   coverage.reporter    — 'text' prints a summary to the terminal;
 *                          'lcov' writes a detailed report file that Codecov
 *                          reads to display coverage on GitHub.
 *
 * Run `npm run test:coverage` to generate the coverage report.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
