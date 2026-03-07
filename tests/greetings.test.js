import { describe, it, expect, beforeAll } from 'vitest';
import { getGreeting } from '../greetings.js';

// sessionStorage doesn't exist in Node — provide a minimal stand-in
beforeAll(() => {
  const store = {};
  global.sessionStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
  };
});

const MORNING   = ['Good morning', 'Morning', 'Rise and shine'];
const AFTERNOON = ['Good afternoon', "Hope the day's treating you well"];
const EVENING   = ['Good evening', 'Winding down?'];

describe('getGreeting — time-of-day (funnyEnabled = false)', () => {
  it('returns a morning greeting for hours 5–11', () => {
    for (const hour of [5, 8, 11]) {
      expect(MORNING).toContain(getGreeting(hour, false));
    }
  });

  it('returns an afternoon greeting for hours 12–16', () => {
    for (const hour of [12, 14, 16]) {
      expect(AFTERNOON).toContain(getGreeting(hour, false));
    }
  });

  it('returns an evening greeting for hours 17–23 and 0–4', () => {
    for (const hour of [0, 2, 17, 20, 23]) {
      expect(EVENING).toContain(getGreeting(hour, false));
    }
  });
});

describe('getGreeting — funny mode', () => {
  it('returns a non-empty string when funnyEnabled = true', () => {
    const result = getGreeting(9, true);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
