/**
 * settings.ts
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
import type { SettingKey, SettingValue } from './types.js';

// The default value for each setting — used when the user hasn't changed it yet.
const DEFAULTS = {
  clockFormat:    '24h'  as const,
  showSeconds:    false,
  funnyGreetings: true,
  showClock:      true,
  showGreeting:   true,
  showLocation:   true,
};

// Read a single setting. Returns the saved value, or the default if not set yet.
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const value = await storage.get(`setting_${key}`);
  return (value !== null ? value : DEFAULTS[key]) as SettingValue<K>;
}

// Save a single setting.
export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> {
  await storage.set(`setting_${key}`, value);
}
