/**
 * api.ts
 *
 * Decides which photo to show next and hands it to newtab.ts.
 * Two modes: bundled fallback library (default) or live Unsplash API (if a key is set).
 *
 * Preloading: after showing each photo, the next one is silently fetched and
 * stored so the following tab opens instantly with no visible wait.
 *
 * Batch caching (Unsplash mode only): fetches 10 photos at once, serves them
 * one per tab, and quietly refreshes the batch before it runs out.
 */

import storage from './storage.js';
import { getSetting } from './settings.js';
import type { Photo, TimePeriod, ReviewPeriod, FallbackMeta } from './types.js';

// Config values. BATCH_SIZE = how many Unsplash photos to fetch at once.
// REFRESH_THRESHOLD = start fetching a new batch when this many remain.
const UNSPLASH_API = 'https://api.unsplash.com';
const BATCH_SIZE = 10;
const REFRESH_THRESHOLD = 3;
// Required by Unsplash attribution guidelines — appended to every profile/photo link.
const UTM = 'utm_source=arctic_scapes&utm_medium=referral';

// The search terms used to pull photos from the Unsplash API.
// These are shuffled randomly each time a new batch is built.
const SEARCH_QUERIES: string[] = [
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

// Append Unsplash image parameters: 2560px wide, 85% quality, JPEG, cropped to fill.
function buildImageUrl(rawUrl: string): string {
  return `${rawUrl}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
}

// The shape of a raw photo response from the Unsplash API.
// Fields marked ? are optional — Unsplash doesn't always include them.
interface UnsplashPhotoData {
  id: string;
  urls: { raw: string };
  user?: { name?: string; links?: { html?: string } };
  links?: { html?: string };
  location?: { city?: string | null; country?: string | null; name?: string | null };
}

// Convert a raw Unsplash API response into the Photo shape the rest of the app uses.
// Assembles a readable location string from whatever fields Unsplash provides.
function normalizeUnsplashPhoto(data: UnsplashPhotoData): Photo {
  const city = data.location?.city ?? null;
  const country = data.location?.country ?? null;
  let location: string | null = null;
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

// Cache the photo metadata in memory so it's only fetched from disk once per session.
let _fallbackCache: FallbackMeta | null = null;

// Load fallback-meta.json from disk (or cache if already loaded).
// The URL differs between the installed extension and the local dev preview.
async function getFallbackMeta(): Promise<FallbackMeta> {
  if (_fallbackCache) return _fallbackCache;

  const base = typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('images/fallback-meta.json')
    : './images/fallback-meta.json';

  const res = await fetch(base);
  _fallbackCache = await res.json() as FallbackMeta;
  return _fallbackCache;
}

// REVIEW MODE — for curating photos before shipping.
// Set to 'morning', 'afternoon', 'evening' to review one period.
// Set to 'all' to cycle through all 150 photos in order (morning → afternoon → evening).
// Set to null to restore normal time-of-day behaviour before merging to main.
export const REVIEW_PERIOD: ReviewPeriod = 'all';

// Map the current hour to a time period. REVIEW_PERIOD overrides this when set.
function getPeriod(hour: number): TimePeriod {
  if (REVIEW_PERIOD && REVIEW_PERIOD !== 'all') return REVIEW_PERIOD;
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

// Get the next photo from the bundled fallback library.
// Each time period has its own counter in storage so photos cycle independently.
async function getNextFallback(): Promise<Photo> {
  const meta = await getFallbackMeta();

  // In 'all' review mode: treat the three arrays as one flat sequence of 150 photos.
  if (REVIEW_PERIOD === 'all') {
    const total = meta.morning.length + meta.afternoon.length + meta.evening.length;
    const key = 'fallbackIndex_all';
    const index = ((await storage.get(key)) as number | null) ?? 0;
    const i = index % total;
    let period: TimePeriod;
    let localIndex: number;
    // Determine which period and position within it the global index maps to.
    if (i < meta.morning.length) {
      period = 'morning';
      localIndex = i;
    } else if (i < meta.morning.length + meta.afternoon.length) {
      period = 'afternoon';
      localIndex = i - meta.morning.length;
    } else {
      period = 'evening';
      localIndex = i - meta.morning.length - meta.afternoon.length;
    }
    await storage.set(key, (i + 1) % total);
    return { ...meta[period][localIndex], _index: localIndex, _period: period };
  }

  // Normal mode: use the period matching the current time of day.
  const period = getPeriod(new Date().getHours());
  const photos = meta[period];
  const key = `fallbackIndex_${period}`;
  const index = ((await storage.get(key)) as number | null) ?? 0;
  const photo = photos[index % photos.length];
  // Advance the counter so the next tab gets the next photo. Wraps around at the end.
  await storage.set(key, (index + 1) % photos.length);
  return { ...photo, _index: index % photos.length, _period: period };
}

// ─── Unsplash live API ─────────────────────────────────────────────────────

// Fetch one random landscape photo from Unsplash for a given search term.
async function fetchRandomPhoto(apiKey: string, query: string): Promise<Photo> {
  const url = `${UNSPLASH_API}/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unsplash ${res.status}: ${res.statusText}`);
  return normalizeUnsplashPhoto(await res.json() as UnsplashPhotoData);
}

// Build a fresh batch of up to 10 photos by cycling through the search queries.
// The queries are shuffled first so each batch has a different mix.
async function buildNewBatch(apiKey: string): Promise<Photo[]> {
  const queries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
  const photos: Photo[] = [];

  for (const query of queries) {
    if (photos.length >= BATCH_SIZE) break;
    try {
      const photo = await fetchRandomPhoto(apiKey, query);
      // Skip duplicates — the same photo can appear under different search terms.
      if (!photos.find((p) => p.id === photo.id)) {
        photos.push(photo);
      }
    } catch (err) {
      console.warn(`[Arctic Scapes] Failed to fetch for "${query}":`, (err as Error).message);
    }
  }

  await storage.set('imageBatch', photos);
  await storage.set('batchIndex', 0);
  return photos;
}

// Serve the next photo from the stored batch. If the batch is nearly empty,
// kick off a background refresh so the next session doesn't have to wait.
async function getNextFromApi(apiKey: string): Promise<Photo> {
  let batch = ((await storage.get('imageBatch')) as Photo[] | null) ?? [];
  let index = ((await storage.get('batchIndex')) as number | null) ?? 0;

  const remaining = batch.length - index;

  // Quietly fetch a new batch in the background when running low.
  // The current tab still gets served from the existing batch.
  if (remaining < REFRESH_THRESHOLD) {
    buildNewBatch(apiKey).catch((err: Error) =>
      console.warn('[Arctic Scapes] Batch refresh failed:', err.message)
    );
  }

  // If the batch is completely exhausted, we have to wait for a fresh one.
  if (index >= batch.length) {
    batch = await buildNewBatch(apiKey);
    index = 0;
  }

  const photo = batch[index];
  await storage.set('batchIndex', index + 1);
  return photo;
}

// ─── Public API ────────────────────────────────────────────────────────────

// The one function called by newtab.ts. Returns the next photo to display.
// In normal mode: returns the preloaded photo (fetched by the previous tab),
// then silently preloads the one after that in the background.
// In review mode: always fetches fresh, never uses the preload cache.
export async function getNextImage(): Promise<Photo> {
  const preloaded = (await storage.get('preloadedPhoto')) as Photo | null;
  if (preloaded && !REVIEW_PERIOD) {
    await storage.remove('preloadedPhoto');
    void preloadNextImage();
    return preloaded;
  }
  if (REVIEW_PERIOD) await storage.remove('preloadedPhoto');
  const photo = await fetchNextPhoto();
  if (!REVIEW_PERIOD) void preloadNextImage();
  return photo;
}

// Route to either the Unsplash API or the bundled library depending on whether
// the user has saved an API key in settings.
async function fetchNextPhoto(): Promise<Photo> {
  const apiKey = await getSetting('unsplashApiKey');
  if (apiKey) {
    return getNextFromApi(apiKey);
  }
  return getNextFallback();
}

// Fetch the next photo and store it so the following tab can grab it instantly.
// Runs fire-and-forget in the background — errors are logged but not thrown.
async function preloadNextImage(): Promise<void> {
  try {
    const photo = await fetchNextPhoto();
    await storage.set('preloadedPhoto', photo);
  } catch (err) {
    console.warn('[Arctic Scapes] Preload failed:', (err as Error).message);
  }
}
