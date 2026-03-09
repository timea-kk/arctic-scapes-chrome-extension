/**
 * settings.ts
 * Read and write user preferences via the storage abstraction.
 */
import storage from './storage.js';
const DEFAULTS = {
    clockFormat: '24h',
    showSeconds: false,
    funnyGreetings: true,
    unsplashApiKey: '',
    showClock: true,
    showGreeting: true,
    showLocation: true,
};
export async function getSetting(key) {
    const value = await storage.get(`setting_${key}`);
    return (value !== null ? value : DEFAULTS[key]);
}
export async function setSetting(key, value) {
    await storage.set(`setting_${key}`, value);
}
export { DEFAULTS };
