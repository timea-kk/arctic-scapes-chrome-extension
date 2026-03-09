/**
 * storage.ts
 *
 * The single place in the app that reads and writes saved data.
 * Everything that needs to persist — settings, the current photo index,
 * the preloaded next photo — goes through here.
 *
 * Why a wrapper instead of calling the browser directly?
 * Chrome extensions use chrome.storage, but the local dev server runs
 * in a plain browser tab where chrome.storage doesn't exist. This file
 * detects which environment it's in and picks the right one automatically,
 * so every other file can just call get/set/remove without caring.
 */

// One object with three methods: get, set, and remove.
// Each method is "async" — it returns a promise because storage reads
// and writes aren't instant; they happen in the background.
const storage = {

  // Read a saved value by name. Returns null if nothing's been saved there yet.
  async get(key: string): Promise<unknown> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      // Running as an installed Chrome extension — use the extension storage API
      return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => resolve(result[key] ?? null));
      });
    }
    // Running in a local browser preview — fall back to localStorage
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      // localStorage can only store strings, so we parse the string back to
      // the original value (number, boolean, object, etc.)
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },

  // Save a value under a name. Overwrites whatever was there before.
  async set(key: string, value: unknown): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
    // JSON.stringify converts any value (object, array, etc.) to a string
    // so localStorage can hold it
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Delete a saved value entirely.
  async remove(key: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(key, resolve);
      });
    }
    localStorage.removeItem(key);
  },

};

export default storage;
