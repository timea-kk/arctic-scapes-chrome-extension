/**
 * tests/clock.test.js
 *
 * Tests for the formatTime() function in clock.js.
 *
 * Checks that the clock displays the correct digits and AM/PM label
 * for both 24h and 12h formats, with and without seconds, and across
 * the tricky edge cases (midnight, noon, 1 am, 1 pm).
 */

import { describe, it, expect } from 'vitest';
import { formatTime } from '../clock.js';

// Helper: build a Date object for a specific hour, minute, second.
function at(h, m = 5, s = 30) {
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d;
}

describe('formatTime — 24h format', () => {
  it('formats hours and minutes correctly', () => {
    expect(formatTime(at(14, 5), '24h', false)).toEqual({ time: '14:05', period: null });
    expect(formatTime(at(9, 30), '24h', false)).toEqual({ time: '09:30', period: null });
  });

  it('includes seconds when showSeconds is true', () => {
    expect(formatTime(at(14, 5, 3), '24h', true)).toEqual({ time: '14:05:03', period: null });
  });

  it('pads single-digit hours with a leading zero', () => {
    expect(formatTime(at(7, 0), '24h', false).time).toBe('07:00');
  });

  it('returns null for period in 24h mode', () => {
    expect(formatTime(at(9), '24h', false).period).toBeNull();
    expect(formatTime(at(21), '24h', false).period).toBeNull();
  });
});

describe('formatTime — 12h format', () => {
  it('returns AM for morning hours', () => {
    expect(formatTime(at(9), '12h', false).period).toBe('AM');
    expect(formatTime(at(11), '12h', false).period).toBe('AM');
  });

  it('returns PM for afternoon and evening hours', () => {
    expect(formatTime(at(12), '12h', false).period).toBe('PM');
    expect(formatTime(at(18), '12h', false).period).toBe('PM');
    expect(formatTime(at(23), '12h', false).period).toBe('PM');
  });

  it('converts 0 (midnight) to 12 AM', () => {
    const result = formatTime(at(0, 0), '12h', false);
    expect(result.time).toBe('12:00');
    expect(result.period).toBe('AM');
  });

  it('converts 12 (noon) to 12 PM', () => {
    const result = formatTime(at(12, 0), '12h', false);
    expect(result.time).toBe('12:00');
    expect(result.period).toBe('PM');
  });

  it('converts 13:00 to 1:00 PM', () => {
    const result = formatTime(at(13, 0), '12h', false);
    expect(result.time).toBe('1:00');
    expect(result.period).toBe('PM');
  });

  it('does not pad 12h hours with a leading zero', () => {
    expect(formatTime(at(9, 5), '12h', false).time).toBe('9:05');
  });

  it('includes seconds when showSeconds is true', () => {
    expect(formatTime(at(14, 5, 3), '12h', true)).toEqual({ time: '2:05:03', period: 'PM' });
  });
});
