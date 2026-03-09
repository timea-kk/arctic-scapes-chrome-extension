/**
 * greetings.ts
 *
 * Picks the greeting shown under the clock. 70% of the time it's a
 * time-appropriate phrase (morning / afternoon / evening). 30% of the
 * time it swaps in a dry one-liner from the surprise pool. The same
 * surprise is never shown twice in a row.
 *
 * To customise: edit the arrays below. The structure and logic stay the same.
 */

import type { TimePeriod } from './types.js';

// The three pools of time-of-day greetings.
// Morning = 05:00–11:59, afternoon = 12:00–16:59, evening = 17:00–04:59.
// Add, remove, or rewrite lines freely — keep at least one per period.
const TIME_GREETINGS: Record<TimePeriod, string[]> = {
  morning: ['Good morning', 'Morning', 'Rise and shine'],
  afternoon: ['Good afternoon', "Hope the day's treating you well"],
  evening: ['Good evening', 'Winding down?'],
};

// The surprise pool — shown 30% of the time when funny greetings are enabled.
// 20 lines. Never repeats back-to-back. Add your own, remove what doesn't fit.
const SURPRISE_GREETINGS: string[] = [
  'Howdy, explorer',
  'The Arctic called. It says hi.',
  'Somewhere, a polar bear is watching.',
  "G'day, even if it isn't.",
  'Cold outside. Warm in here.',
  'Procrastination never looked this good.',
  'The ice is patient. Are you?',
  'Less emails, more glaciers.',
  'Just you, the ice, and your thoughts.',
  '404: productivity not found.',
  'Svalbard sends its regards.',
  "The aurora doesn't care about your inbox.",
  'No signal out here. Just the wind.',
  "The ice doesn't have notifications. Lucky ice.",
  "Nothing a good horizon can't fix.",
  'Even glaciers move. Eventually.',
  'The midnight sun never clocks out.',
  'Some things are worth the cold.',
  "Somewhere, it's -40°. You're doing great.",
  'The ice has seen things. So have you.',
];

// Given the current hour (0–23), return the right time-period greeting pool.
function getTimePool(hour: number): string[] {
  if (hour >= 5 && hour < 12) return TIME_GREETINGS.morning;
  if (hour >= 12 && hour < 17) return TIME_GREETINGS.afternoon;
  return TIME_GREETINGS.evening;
}

// Pick a random item from a list. Optionally pass an index to exclude,
// so the same item is never returned twice in a row.
function pickRandom(pool: string[], excludeIndex = -1): { text: string; index: number } {
  if (pool.length === 1) return { text: pool[0], index: 0 };
  let index: number;
  do {
    index = Math.floor(Math.random() * pool.length);
  } while (index === excludeIndex);
  return { text: pool[index], index };
}

// The one function called by the rest of the app.
// Pass in the current hour and whether funny greetings are on; get back a string.
// The last surprise index is stored in sessionStorage so it's never repeated in the same session.
export function getGreeting(hour: number, funnyEnabled = true): string {
  if (funnyEnabled && Math.random() < 0.30) {
    const lastIdx = parseInt(sessionStorage.getItem('lastSurpriseIdx') ?? '-1', 10);
    const { text, index } = pickRandom(SURPRISE_GREETINGS, lastIdx);
    sessionStorage.setItem('lastSurpriseIdx', String(index));
    return text;
  }
  const pool = getTimePool(hour);
  return pickRandom(pool).text;
}
