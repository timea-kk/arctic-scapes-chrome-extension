/**
 * settings.ts
 *
 * Reads and writes the seven user preferences. Any part of the app
 * that needs a user setting calls getSetting(); any part that needs
 * to save a new value calls setSetting(). That's the whole API.
 *
 * Settings are stored with a "setting_" prefix (e.g. "setting_clockFormat")
 * to keep them grouped and easy to identify in storage.
 */

import storage from './storage.js';
import type { Settings, SettingKey, SettingValue } from './types.js';

// What every setting is set to when the extension is freshly installed.
// getSetting returns the value from this object if the user hasn't changed it yet,
// so the extension always works correctly out of the box.
const DEFAULTS: Settings = {
  clockFormat: '24h',
  showSeconds: false,
  funnyGreetings: true,
  unsplashApiKey: '',
  showClock: true,
  showGreeting: true,
  showLocation: true,
};

// Read one setting. Returns the user's saved value, or the default if nothing's been saved.
// The <K extends SettingKey> is TypeScript's way of making the return type exact —
// ask for 'clockFormat' and you get back '12h' | '24h', not just a vague string.
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const value = await storage.get(`setting_${key}`);
  return (value !== null ? value : DEFAULTS[key]) as SettingValue<K>;
}

// Save one setting. TypeScript ensures the value matches what that setting allows —
// you can't accidentally save a number where a boolean is expected.
export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> {
  await storage.set(`setting_${key}`, value);
}

// Export the defaults so other files can reference the baseline values directly if needed.
export { DEFAULTS };
