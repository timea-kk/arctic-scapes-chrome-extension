/**
 * settings.js
 *
 * Reads and writes the user's preferences (clock format, toggles, etc.).
 *
 * Settings are stored with a "setting_" prefix so they're easy to identify
 * in storage and won't accidentally clash with other saved data.
 * Example: the clock format is stored under the key "setting_clockFormat".
 *
 * DEFAULTS holds what each setting should be if the user has never changed it.
 */

import storage from './storage.js';

const DEFAULTS = {
  clockFormat:   '24h',   // '24h' or '12h'
  showSeconds:   false,   // whether to show seconds in the clock
  funnyGreetings: true,   // whether surprise greetings can appear
  showClock:     true,    // whether the clock is visible
  showGreeting:  true,    // whether the greeting is visible
  showLocation:  true,    // whether the photo location tag is visible
};

// Read a single setting. Returns the saved value, or the default if not set yet.
export async function getSetting(key) {
  const value = await storage.get(`setting_${key}`);
  return value !== null ? value : DEFAULTS[key];
}

// Save a single setting.
export async function setSetting(key, value) {
  await storage.set(`setting_${key}`, value);
}

