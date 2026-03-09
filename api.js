/**
 * api.ts
 * Image sourcing logic. Uses Unsplash API when an API key is set;
 * otherwise cycles through the bundled fallback images.
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
    if (city && country)
        location = `${city}, ${country}`;
    else if (city)
        location = city;
    else if (country)
        location = country;
    else if (data.location?.name)
        location = data.location.name;
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
    if (_fallbackCache)
        return _fallbackCache;
    const base = typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('images/fallback-meta.json')
        : './images/fallback-meta.json';
    const res = await fetch(base);
    _fallbackCache = await res.json();
    return _fallbackCache;
}
// REVIEW MODE: set to 'morning', 'afternoon', 'evening', or 'all' to review photos.
// 'all' cycles through all 150 photos in order (morning → afternoon → evening).
// Set to null to restore normal time-of-day behaviour before merging.
export const REVIEW_PERIOD = 'all';
function getPeriod(hour) {
    if (REVIEW_PERIOD && REVIEW_PERIOD !== 'all')
        return REVIEW_PERIOD;
    if (hour >= 5 && hour < 12)
        return 'morning';
    if (hour >= 12 && hour < 17)
        return 'afternoon';
    return 'evening';
}
async function getNextFallback() {
    const meta = await getFallbackMeta();
    if (REVIEW_PERIOD === 'all') {
        const total = meta.morning.length + meta.afternoon.length + meta.evening.length;
        const key = 'fallbackIndex_all';
        const index = (await storage.get(key)) ?? 0;
        const i = index % total;
        let period;
        let localIndex;
        if (i < meta.morning.length) {
            period = 'morning';
            localIndex = i;
        }
        else if (i < meta.morning.length + meta.afternoon.length) {
            period = 'afternoon';
            localIndex = i - meta.morning.length;
        }
        else {
            period = 'evening';
            localIndex = i - meta.morning.length - meta.afternoon.length;
        }
        await storage.set(key, (i + 1) % total);
        return { ...meta[period][localIndex], _index: localIndex, _period: period };
    }
    const period = getPeriod(new Date().getHours());
    const photos = meta[period];
    const key = `fallbackIndex_${period}`;
    const index = (await storage.get(key)) ?? 0;
    const photo = photos[index % photos.length];
    await storage.set(key, (index + 1) % photos.length);
    return { ...photo, _index: index % photos.length, _period: period };
}
// ─── Unsplash API ──────────────────────────────────────────────────────────
async function fetchRandomPhoto(apiKey, query) {
    const url = `${UNSPLASH_API}/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Unsplash ${res.status}: ${res.statusText}`);
    return normalizeUnsplashPhoto(await res.json());
}
async function buildNewBatch(apiKey) {
    const queries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
    const photos = [];
    for (const query of queries) {
        if (photos.length >= BATCH_SIZE)
            break;
        try {
            const photo = await fetchRandomPhoto(apiKey, query);
            if (!photos.find((p) => p.id === photo.id)) {
                photos.push(photo);
            }
        }
        catch (err) {
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
    if (remaining < REFRESH_THRESHOLD) {
        buildNewBatch(apiKey).catch((err) => console.warn('[Arctic Scapes] Batch refresh failed:', err.message));
    }
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
    const preloaded = (await storage.get('preloadedPhoto'));
    if (preloaded && !REVIEW_PERIOD) {
        await storage.remove('preloadedPhoto');
        void preloadNextImage();
        return preloaded;
    }
    if (REVIEW_PERIOD)
        await storage.remove('preloadedPhoto');
    const photo = await fetchNextPhoto();
    if (!REVIEW_PERIOD)
        void preloadNextImage();
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
    }
    catch (err) {
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
