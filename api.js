/**
 * api.js
 *
 * Decides which photo to show on each new tab.
 *
 * The 150 curated photos are split into three groups — morning, afternoon,
 * and evening — and the extension picks from the right group based on the
 * current time of day. Photos cycle in order, so every photo gets seen
 * before any repeat.
 *
 * To speed things up, the extension also "preloads" the next photo in the
 * background while the current one is being shown. That way, when you open
 * a new tab, the photo is already ready and there's no waiting.
 *
 * Time boundaries:
 *   Morning   — 5 am to 12 pm
 *   Afternoon — 12 pm to 5 pm
 *   Evening   — 5 pm onwards (and midnight to 5 am)
 */

import storage from './storage.js';

// ─── Load photo metadata ──────────────────────────────────────────────────────
// photos.json holds the list of all 150 photos with their locations,
// photographer names, and file paths. We cache it after the first load
// so we don't re-fetch it on every tab open.

let _photoCache = null;

async function getPhotoMeta() {
  if (_photoCache) return _photoCache;

  // The path needs to be resolved differently depending on whether we're
  // running as an installed extension or locally during development.
  const base = typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('images/photos.json')
    : './images/photos.json';

  const res = await fetch(base);
  _photoCache = await res.json();
  return _photoCache;
}

// Returns the time-of-day period for a given hour.
export function getPeriod(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

// ─── Pick the next photo ──────────────────────────────────────────────────────
// Reads the current position in the photo list, returns the photo at that
// position, then advances the counter so the next call gets the next photo.

async function getNextPhoto() {
  const meta = await getPhotoMeta();
  const period = getPeriod(new Date().getHours());
  const photos = meta[period];
  const key = `photoIndex_${period}`;
  const index = (await storage.get(key)) ?? 0;
  const photo = photos[index % photos.length];
  await storage.set(key, (index + 1) % photos.length);
  return photo;
}

// ─── Preloading ───────────────────────────────────────────────────────────────
// After serving a photo, we quietly fetch the metadata for the next one
// and save it. When the user opens a new tab, that saved photo is served
// immediately instead of waiting for a fresh lookup.

async function preloadNextImage() {
  try {
    const photo = await getNextPhoto();
    await storage.set('preloadedPhoto', photo);
  } catch (err) {
    console.warn('[Arctic Scapes] Preload failed:', err.message);
  }
}

// ─── Public: get the next image to display ────────────────────────────────────
// This is the only function called from outside this file.
// It returns the photo to display, then kicks off preloading the next one.

export async function getNextImage() {
  // Serve the preloaded photo if one is ready, then preload the next.
  const preloaded = await storage.get('preloadedPhoto');
  if (preloaded) {
    await storage.remove('preloadedPhoto');
    preloadNextImage(); // fire-and-forget: runs in background, doesn't block
    return preloaded;
  }

  // No preloaded photo yet (e.g. very first tab ever opened).
  const photo = await getNextPhoto();
  preloadNextImage();
  return photo;
}
