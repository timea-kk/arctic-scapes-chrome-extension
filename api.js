/**
 * api.js
 * Image sourcing logic. Uses Unsplash API when an API key is set;
 * otherwise cycles through the bundled fallback images.
 *
 * Batch caching: fetches 10 images at a time, refreshes when <3 remain.
 * Preloading: stores the next image so the following tab has zero wait.
 */

import storage from './storage.js';
import { getSetting } from './settings.js';

const UNSPLASH_API = 'https://api.unsplash.com';
const BATCH_SIZE = 10;
const REFRESH_THRESHOLD = 3;
const UTM = 'utm_source=arctic_scapes&utm_medium=referral';

const SEARCH_QUERIES = [
  'arctic landscape',
  'svalbard',
  'iceland wilderness',
  'greenland glacier',
  'norway fjord',
  'alaska tundra',
  'northern lights landscape',
  'frozen tundra',
  'canadian arctic',
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildImageUrl(rawUrl) {
  return `${rawUrl}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
}

function normalizeUnsplashPhoto(data) {
  const city = data.location?.city ?? null;
  const country = data.location?.country ?? null;
  let location = null;
  if (city && country) location = `${city}, ${country}`;
  else if (city) location = city;
  else if (country) location = country;
  else if (data.location?.name) location = data.location.name;

  return {
    id: data.id,
    url: buildImageUrl(data.urls.raw),
    photographer: data.user?.name ?? 'Unknown',
    photographerUrl: `${data.user?.links?.html ?? 'https://unsplash.com'}?${UTM}`,
    unsplashUrl: `${data.links?.html ?? 'https://unsplash.com'}?${UTM}`,
    location,
  };
}

// ─── Fallback images ───────────────────────────────────────────────────────

let _fallbackCache = null;

async function getFallbackMeta() {
  if (_fallbackCache) return _fallbackCache;

  // Resolve the path whether running locally (http-server) or as an extension
  const base = typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('images/fallback-meta.json')
    : './images/fallback-meta.json';

  const res = await fetch(base);
  _fallbackCache = await res.json();
  return _fallbackCache;
}

function getPeriod(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

async function getNextFallback() {
  const meta = await getFallbackMeta();
  const period = getPeriod(new Date().getHours());
  const photos = meta[period];
  const key = `fallbackIndex_${period}`;
  const index = (await storage.get(key)) ?? 0;
  const photo = photos[index % photos.length];
  await storage.set(key, (index + 1) % photos.length);
  return photo;
}

// ─── Unsplash API ──────────────────────────────────────────────────────────

async function fetchRandomPhoto(apiKey, query) {
  const url = `${UNSPLASH_API}/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unsplash ${res.status}: ${res.statusText}`);
  return normalizeUnsplashPhoto(await res.json());
}

async function buildNewBatch(apiKey) {
  const queries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
  const photos = [];

  for (const query of queries) {
    if (photos.length >= BATCH_SIZE) break;
    try {
      const photo = await fetchRandomPhoto(apiKey, query);
      // Deduplicate by id
      if (!photos.find((p) => p.id === photo.id)) {
        photos.push(photo);
      }
    } catch (err) {
      console.warn(`[Arctic Scapes] Failed to fetch for "${query}":`, err.message);
    }
  }

  await storage.set('imageBatch', photos);
  await storage.set('batchIndex', 0);
  return photos;
}

async function getNextFromApi(apiKey) {
  let batch = (await storage.get('imageBatch')) ?? [];
  let index = (await storage.get('batchIndex')) ?? 0;

  const remaining = batch.length - index;

  // Refresh batch when running low (but still serve from current batch)
  if (remaining < REFRESH_THRESHOLD) {
    // Fire-and-forget refresh so it doesn't block the current load
    buildNewBatch(apiKey).catch((err) =>
      console.warn('[Arctic Scapes] Batch refresh failed:', err.message)
    );
  }

  // If we've exhausted the batch, wait for a new one
  if (index >= batch.length) {
    batch = await buildNewBatch(apiKey);
    index = 0;
  }

  const photo = batch[index];
  await storage.set('batchIndex', index + 1);
  return photo;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Returns the next photo to display.
 * Uses the preloaded photo if available (set by the previous tab),
 * then queues up the next one in the background.
 */
export async function getNextImage() {
  const preloaded = await storage.get('preloadedPhoto');
  if (preloaded) {
    await storage.remove('preloadedPhoto');
    preloadNextImage();
    return preloaded;
  }
  const photo = await fetchNextPhoto();
  preloadNextImage();
  return photo;
}

async function fetchNextPhoto() {
  const apiKey = await getSetting('unsplashApiKey');
  if (apiKey) {
    return getNextFromApi(apiKey);
  }
  return getNextFallback();
}

async function preloadNextImage() {
  try {
    const photo = await fetchNextPhoto();
    await storage.set('preloadedPhoto', photo);
  } catch (err) {
    console.warn('[Arctic Scapes] Preload failed:', err.message);
  }
}
