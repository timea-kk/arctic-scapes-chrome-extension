/**
 * greetings.js
 * Time-of-day greetings and a pool of fun surprise alternates.
 * 85% of the time shows a time-appropriate greeting; 15% a random surprise.
 * Never shows the same surprise twice in a row.
 */

const TIME_GREETINGS = {
  morning: ['Good morning', 'Morning', 'Rise and shine'],
  afternoon: ['Good afternoon', "Hope the day's treating you well"],
  evening: ['Good evening', 'Winding down?'],
};

const SURPRISE_GREETINGS = [
  'Howdy, explorer',
  'Ah, another tab. Bold move.',
  'The Arctic called. It says hi.',
  'Somewhere, a polar bear is watching.',
  'New tab, new you. Probably.',
  'Still here? Impressive.',
  "G'day, even if it isn't.",
  'You opened a new tab. Respect.',
  'Cold outside. Warm in here.',
  'Procrastination never looked this good.',
  'Tabs: the modern meditation.',
  'Eyes up, explorer.',
  'The ice is patient. Are you?',
  'Less emails, more glaciers.',
  'Breathe. Then close seventeen tabs.',
  'Just you, the ice, and your thoughts.',
  '404: productivity not found.',
  "This one's for the dreamers.",
  'Not all who wander open new tabs. But here you are.',
  'Stay curious. Stay a little lost.',
];

function getTimePool(hour) {
  if (hour >= 5 && hour < 12) return TIME_GREETINGS.morning;
  if (hour >= 12 && hour < 17) return TIME_GREETINGS.afternoon;
  return TIME_GREETINGS.evening;
}

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
  if (funnyEnabled && Math.random() < 0.15) {
    const lastIdx = parseInt(sessionStorage.getItem('lastSurpriseIdx') ?? '-1', 10);
    const { text, index } = pickRandom(SURPRISE_GREETINGS, lastIdx);
    sessionStorage.setItem('lastSurpriseIdx', String(index));
    return text;
  }
  const pool = getTimePool(hour);
  return pickRandom(pool).text;
}
