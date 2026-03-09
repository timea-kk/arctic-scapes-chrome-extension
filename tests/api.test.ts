/**
 * tests/api.test.ts
 *
 * Tests for getPeriod() in api.ts.
 *
 * getPeriod() decides which photo collection to show based on the hour.
 * These tests check every boundary: that morning starts at 5 and ends at 11,
 * afternoon starts at 12 and ends at 16, and everything else is evening
 * (including the early hours before 5 am).
 */

import { describe, it, expect } from 'vitest';
import { getPeriod } from '../api.js';

describe('getPeriod — morning (5 am to 11:59 am)', () => {
  it('returns morning at 5 am (the boundary)', () => {
    expect(getPeriod(5)).toBe('morning');
  });

  it('returns morning mid-morning', () => {
    expect(getPeriod(8)).toBe('morning');
    expect(getPeriod(11)).toBe('morning');
  });
});

describe('getPeriod — afternoon (12 pm to 4:59 pm)', () => {
  it('returns afternoon at 12 pm (the boundary)', () => {
    expect(getPeriod(12)).toBe('afternoon');
  });

  it('returns afternoon mid-afternoon', () => {
    expect(getPeriod(14)).toBe('afternoon');
    expect(getPeriod(16)).toBe('afternoon');
  });
});

describe('getPeriod — evening (5 pm onwards, and midnight to 4:59 am)', () => {
  it('returns evening at 17 (the boundary)', () => {
    expect(getPeriod(17)).toBe('evening');
  });

  it('returns evening late at night', () => {
    expect(getPeriod(20)).toBe('evening');
    expect(getPeriod(23)).toBe('evening');
  });

  it('returns evening for the early hours before 5 am', () => {
    expect(getPeriod(0)).toBe('evening');
    expect(getPeriod(4)).toBe('evening');
  });
});
