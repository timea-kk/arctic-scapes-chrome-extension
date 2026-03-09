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

// The shape of every photo object as stored in images/photos.json.
export interface Photo {
  id: string;              // Unique ID from Unsplash
  url: string;             // Local file path (e.g. "./images/morning/morning-01.jpg")
  photographer: string;    // Display name of the photographer
  photographerUrl: string; // Link to their Unsplash profile
  unsplashUrl: string;     // Link to the photo page on Unsplash
  location: string | null; // "Tromsø, Norway" — or null if unknown
}

// The structure of images/photos.json — three arrays of photos, one per period.
export interface PhotoMeta {
  morning:   Photo[];
  afternoon: Photo[];
  evening:   Photo[];
}

// All user preferences, with their exact allowed types.
// clockFormat can ONLY be '12h' or '24h' — TypeScript catches any other value.
export interface Settings {
  clockFormat:    '12h' | '24h';
  showSeconds:    boolean;
  funnyGreetings: boolean;
  showClock:      boolean;
  showGreeting:   boolean;
  showLocation:   boolean;
}

// These two let getSetting/setSetting be fully typed — if you ask for 'clockFormat'
// you get back '12h' | '24h', not just a generic string.
export type SettingKey = keyof Settings;
export type SettingValue<K extends SettingKey> = Settings[K];
