/**
 * clock.ts
 *
 * Formats the current time into a displayable string.
 * Kept in its own file so it can be tested independently from the DOM code in newtab.ts.
 *
 * Returns { time, period } where:
 *   time   — the formatted digits, e.g. "14:05" or "2:05:30"
 *   period — "AM" or "PM" in 12h mode, null in 24h mode
 *
 * Keeping them separate lets the caller render AM/PM at a different size.
 */

// The shape of the value returned by formatTime.
export interface ClockDisplay {
  time: string;
  period: 'AM' | 'PM' | null;
}

// Convert a Date into a clock display object based on format and seconds preference.
export function formatTime(date: Date, format: string, showSeconds: boolean): ClockDisplay {
  const h24 = date.getHours();
  const m   = String(date.getMinutes()).padStart(2, '0');
  const s   = String(date.getSeconds()).padStart(2, '0');

  if (format === '12h') {
    const h = h24 % 12 || 12;
    return {
      time:   showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`,
      period: h24 < 12 ? 'AM' : 'PM',
    };
  }

  const h = String(h24).padStart(2, '0');
  return {
    time:   showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`,
    period: null,
  };
}
