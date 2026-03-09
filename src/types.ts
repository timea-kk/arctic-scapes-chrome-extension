/**
 * types.ts
 *
 * The shared vocabulary for the whole extension. TypeScript lets you define
 * the exact "shape" of your data before you use it — like drawing a template
 * before you fill it in. Every other file imports from here so they all agree
 * on what a photo looks like, what settings exist, and what values are allowed.
 *
 * None of this code actually runs. It's all erased before the browser sees it —
 * it only exists to help catch mistakes while you're writing.
 */

// The three time slots photos are organised into.
// TypeScript will refuse to accept any other string — no typos, no guessing.
export type TimePeriod = 'morning' | 'afternoon' | 'evening';

// The value of REVIEW_PERIOD in api.ts. 'all' cycles through every photo in order.
// null means normal time-of-day behaviour (what users see in production).
export type ReviewPeriod = TimePeriod | 'all' | null;

// The shape of every photo object — whether it came from the bundled library
// or from the Unsplash API. Every field that's always present is required;
// _index and _period are only attached in certain situations, so they're optional.
export interface Photo {
  id: string;             // Unique ID from Unsplash
  url: string;            // Direct image URL (or local path for bundled photos)
  photographer: string;   // Display name of the photographer
  photographerUrl: string; // Link to their Unsplash profile
  unsplashUrl: string;    // Link to the photo page on Unsplash
  location: string | null; // "Tromsø, Norway" — or null if unknown
  _index?: number;         // Position in its time-period array (used in review mode)
  _period?: TimePeriod;    // Which time period this photo belongs to (used in review mode)
}

// The structure of fallback-meta.json — three arrays of photos, one per period.
export interface FallbackMeta {
  morning: Photo[];
  afternoon: Photo[];
  evening: Photo[];
}

// All seven user preferences, with their exact allowed types.
// clockFormat can ONLY be '12h' or '24h' — TypeScript catches any other value.
export interface Settings {
  clockFormat: '12h' | '24h';
  showSeconds: boolean;
  funnyGreetings: boolean;
  unsplashApiKey: string;
  showClock: boolean;
  showGreeting: boolean;
  showLocation: boolean;
}

// These two let getSetting/setSetting be fully typed — if you ask for 'clockFormat'
// you get back '12h' | '24h', not just a generic string.
export type SettingKey = keyof Settings;
export type SettingValue<K extends SettingKey> = Settings[K];
