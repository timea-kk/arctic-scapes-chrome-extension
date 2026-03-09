/**
 * tests/settings.test.ts
 *
 * Tests for getSetting() and setSetting() in settings.ts.
 *
 * These tests check that:
 *   - getSetting() returns the correct default when nothing has been saved yet
 *   - setSetting() saves a value that getSetting() can then read back
 *
 * settings.ts uses storage.ts, which falls back to localStorage when Chrome's
 * storage isn't available. Tests run in Node, so we provide a minimal
 * localStorage stand-in before the tests run.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getSetting, setSetting } from '../settings.js';

// localStorage doesn't exist in Node — provide a minimal stand-in.
let store: Record<string, string> = {};
beforeAll(() => {
  (global as unknown as { localStorage: Storage }).localStorage = {
    getItem:    (key: string)              => store[key] ?? null,
    setItem:    (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string)              => { delete store[key]; },
    clear:      ()                         => { store = {}; },
    length:     0,
    key:        (_index: number)           => null,
  } as Storage;
});

// Clear storage before each test so they don't interfere with each other.
beforeEach(() => { store = {}; });

describe('getSetting — defaults', () => {
  it('returns 24h as the default clock format', async () => {
    expect(await getSetting('clockFormat')).toBe('24h');
  });

  it('returns false as the default for showSeconds', async () => {
    expect(await getSetting('showSeconds')).toBe(false);
  });

  it('returns true as the default for funnyGreetings', async () => {
    expect(await getSetting('funnyGreetings')).toBe(true);
  });

  it('returns true as the default for showClock', async () => {
    expect(await getSetting('showClock')).toBe(true);
  });

  it('returns true as the default for showGreeting', async () => {
    expect(await getSetting('showGreeting')).toBe(true);
  });

  it('returns true as the default for showLocation', async () => {
    expect(await getSetting('showLocation')).toBe(true);
  });
});

describe('setSetting / getSetting — round trip', () => {
  it('saves and reads back a clock format change', async () => {
    await setSetting('clockFormat', '12h');
    expect(await getSetting('clockFormat')).toBe('12h');
  });

  it('saves and reads back a boolean toggle', async () => {
    await setSetting('showSeconds', true);
    expect(await getSetting('showSeconds')).toBe(true);
  });

  it('saves and reads back a false value correctly', async () => {
    await setSetting('funnyGreetings', false);
    expect(await getSetting('funnyGreetings')).toBe(false);
  });
});
