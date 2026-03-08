/**
 * greetings.js
 *
 * Generates the greeting text shown below the clock.
 *
 * Most of the time (70%) it shows a straightforward time-of-day greeting
 * like "Good morning" or "Good evening". The other 30% of the time it picks
 * a surprise line from the pool below — something a bit more unexpected.
 *
 * It also remembers which surprise was shown last so it won't repeat
 * the same one twice in a row.
 */

// Standard greetings, grouped by time of day.
const TIME_GREETINGS = {
  morning:   ['Good morning', 'Morning', 'Rise and shine'],
  afternoon: ['Good afternoon', "Hope the day's treating you well"],
  evening:   ['Good evening', 'Winding down?'],
};

// The surprise pool — shown 30% of the time when surprise greetings are enabled.
const SURPRISE_GREETINGS = [
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

// Returns the right pool of time greetings for a given hour (0–23).
function getTimePool(hour) {
  if (hour >= 5 && hour < 12) return TIME_GREETINGS.morning;
  if (hour >= 12 && hour < 17) return TIME_GREETINGS.afternoon;
  return TIME_GREETINGS.evening;
}

// Picks a random item from a list, optionally avoiding the last-used index.
function pickRandom(pool, excludeIndex = -1) {
  if (pool.length === 1) return { text: pool[0], index: 0 };
  let index;
  do {
    index = Math.floor(Math.random() * pool.length);
  } while (index === excludeIndex);
  return { text: pool[index], index };
}

/**
 * Returns a greeting string for the given hour.
 * @param {number} hour - 0–23
 * @param {boolean} funnyEnabled - whether surprise greetings are on
 */
export function getGreeting(hour, funnyEnabled = true) {
  // 30% chance of a surprise greeting (when the feature is enabled).
  if (funnyEnabled && Math.random() < 0.30) {
    // Avoid repeating the same surprise back-to-back by remembering the last one.
    const lastIdx = parseInt(sessionStorage.getItem('lastSurpriseIdx') ?? '-1', 10);
    const { text, index } = pickRandom(SURPRISE_GREETINGS, lastIdx);
    sessionStorage.setItem('lastSurpriseIdx', String(index));
    return text;
  }
  // Otherwise, pick a standard time-of-day greeting.
  const pool = getTimePool(hour);
  return pickRandom(pool).text;
}
