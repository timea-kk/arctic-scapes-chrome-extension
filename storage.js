/**
 * storage.js
 *
 * A single place to read and write saved data.
 *
 * When the extension is running inside Chrome, it uses Chrome's built-in
 * storage (chrome.storage.local), which persists across browser restarts
 * and works correctly in an extension context.
 *
 * When running in a plain browser tab during development (npm start),
 * Chrome's storage isn't available, so it falls back to localStorage instead.
 *
 * Every other file should import this and call storage.get / storage.set —
 * never use chrome.storage or localStorage directly anywhere else.
 */

const storage = {

  // Read a saved value by its key name. Returns null if nothing is saved yet.
  async get(key) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => resolve(result[key] ?? null));
      });
    }
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },

  // Save a value under a key name, overwriting whatever was there before.
  async set(key, value) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Delete a saved value entirely.
  async remove(key) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(key, resolve);
      });
    }
    localStorage.removeItem(key);
  },

};

export default storage;
