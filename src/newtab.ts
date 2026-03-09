/**
 * newtab.ts
 *
 * The stage manager. This file doesn't contain any of the actual logic —
 * it imports from api.ts, greetings.ts, and settings.ts, then wires
 * everything together and puts it on screen.
 *
 * Execution order: clock + settings load in parallel → greeting → photo.
 */

import { getNextImage, REVIEW_PERIOD } from './api.js';
import { getGreeting } from './greetings.js';
import { getSetting, setSetting } from './settings.js';
import type { Photo } from './types.js';

// Grab references to the HTML elements this file needs to update.
// "as HTML___Element" is TypeScript's way of saying "trust me, this element exists
// and is of this type" — getElementById returns a generic type, so we're narrowing it.
const clockEl = document.getElementById('clock') as HTMLTimeElement;
const greetingEl = document.getElementById('greeting') as HTMLParagraphElement;
const locationEl = document.getElementById('location') as HTMLParagraphElement;
const creditEl = document.getElementById('credit') as HTMLParagraphElement;
const bgCurrent = document.getElementById('bg-current') as HTMLDivElement;
const reviewCounterEl = document.getElementById('review-counter') as HTMLDivElement | null;

// ─── Clock ────────────────────────────────────────────────────────────────

// Convert a Date object into a formatted time string based on user preferences.
// Handles both 12-hour (e.g. "9:41 AM") and 24-hour (e.g. "09:41") formats,
// with or without seconds.
function formatTime(date: Date, format: string, showSeconds: boolean): string {
  const h24 = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  if (format === '12h') {
    const h = h24 % 12 || 12; // Convert 0 → 12, 13 → 1, etc.
    const period = h24 < 12 ? 'AM' : 'PM';
    return showSeconds ? `${h}:${m}:${s} ${period}` : `${h}:${m} ${period}`;
  }

  const h = String(h24).padStart(2, '0');
  return showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
}

// Start the live clock. Reads the format and seconds settings, then updates
// the clock element every second. Returns the current hour so init() can use
// it for the greeting without reading the time again.
async function startClock(): Promise<number> {
  const [format, showSeconds] = await Promise.all([
    getSetting('clockFormat'),
    getSetting('showSeconds'),
  ]);

  function tick(): void {
    const now = new Date();
    clockEl.textContent = formatTime(now, format, showSeconds);
    clockEl.setAttribute('datetime', now.toISOString());
  }

  tick();
  setInterval(tick, 1000);
  return new Date().getHours();
}

// ─── Greeting ─────────────────────────────────────────────────────────────

// Pick and display a greeting for the given hour. Reads the funnyGreetings setting
// and delegates the actual selection to greetings.ts.
async function showGreeting(hour: number): Promise<void> {
  const funnyEnabled = await getSetting('funnyGreetings');
  greetingEl.textContent = getGreeting(hour, funnyEnabled);
}

// ─── Background image ─────────────────────────────────────────────────────

// Wait for an image to fully download before we display it.
// Returns a promise that resolves when the image is ready, or rejects on error.
// This prevents showing a half-loaded image during the fade-in.
function preloadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

// Apply a photo to the background and update the location and credit text.
async function showPhoto(photo: Photo): Promise<void> {
  // Wait for the image to be fully downloaded before fading it in.
  await preloadImage(photo.url);

  bgCurrent.style.backgroundImage = `url('${photo.url}')`;
  // Reading getBoundingClientRect() forces the browser to apply the new background
  // before we change opacity — without this, the CSS transition doesn't fire.
  bgCurrent.getBoundingClientRect();
  bgCurrent.style.opacity = '1';

  // Show the location pin if location data is available; hide it if not.
  if (photo.location) {
    locationEl.textContent = `📍 ${photo.location}`;
    locationEl.classList.add('visible');
  } else {
    locationEl.classList.remove('visible');
  }

  // Build the photographer credit links. Required by Unsplash attribution guidelines.
  creditEl.innerHTML =
    `Photo by <a href="${photo.photographerUrl}" target="_blank" rel="noopener noreferrer">${photo.photographer}</a>` +
    ` on <a href="${photo.unsplashUrl}" target="_blank" rel="noopener noreferrer">Unsplash</a>`;
}

// ─── Settings panel ───────────────────────────────────────────────────────

// Show or hide a UI element by toggling a data attribute on <body>.
// CSS uses [data-hide-clock], [data-hide-greeting], [data-hide-location]
// to hide the corresponding elements.
function applyVisibility(type: string, visible: boolean): void {
  if (visible) document.body.removeAttribute(`data-hide-${type}`);
  else document.body.setAttribute(`data-hide-${type}`, '');
}

// Wire up the settings gear icon and the three toggle switches.
// Reads current settings on load so the toggles reflect the user's saved state.
async function initSettings(): Promise<void> {
  // Read all three visibility settings at the same time rather than one after another.
  const [showClock, showGreetingVal, showLocation] = await Promise.all([
    getSetting('showClock'),
    getSetting('showGreeting'),
    getSetting('showLocation'),
  ]);

  // Apply the saved visibility state immediately on load.
  applyVisibility('clock', showClock);
  applyVisibility('greeting', showGreetingVal);
  applyVisibility('location', showLocation);

  const wrap = document.getElementById('settings-wrap') as HTMLDivElement;
  const dropdown = document.getElementById('settings-dropdown') as HTMLDivElement;

  // The gear icon opens and closes the settings dropdown.
  // stopPropagation prevents the document click listener below from closing it immediately.
  (document.getElementById('settings-btn') as HTMLButtonElement).addEventListener('click', (e) => {
    e.stopPropagation();
    wrap.classList.toggle('open');
  });

  // Clicking inside the dropdown doesn't close it.
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  // Clicking anywhere outside the dropdown closes it.
  document.addEventListener('click', () => wrap.classList.remove('open'));

  // Wire each toggle to its corresponding setting and visibility.
  // Each row: [element id, settings key, data-hide type, current value]
  const toggleMap: [string, 'showClock' | 'showGreeting' | 'showLocation', string, boolean][] = [
    ['toggle-clock',    'showClock',    'clock',    showClock],
    ['toggle-greeting', 'showGreeting', 'greeting', showGreetingVal],
    ['toggle-location', 'showLocation', 'location', showLocation],
  ];

  for (const [id, key, type, initial] of toggleMap) {
    const toggle = document.getElementById(id) as HTMLButtonElement;
    // Set the initial visual state of the toggle.
    toggle.setAttribute('aria-checked', String(initial));
    toggle.addEventListener('click', async () => {
      // Flip the current value, save it, and update the page immediately.
      const newVal = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(newVal));
      await setSetting(key, newVal);
      applyVisibility(type, newVal);
    });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────

// Entry point. Runs when the new tab page opens.
async function init(): Promise<void> {
  // Start the clock and set up the settings panel at the same time.
  // Promise.all runs both in parallel — no waiting for one before the other starts.
  const [hour] = await Promise.all([
    startClock(),
    initSettings(),
  ]);

  // In review mode, hours are fixed per period so the greeting matches the photo's period.
  const REVIEW_HOURS: Record<string, number> = { morning: 9, afternoon: 14, evening: 20 };

  // In normal mode, show the greeting based on the current real time.
  if (!REVIEW_PERIOD) await showGreeting(hour);

  try {
    const photo = await getNextImage();
    // In review mode: show which period and photo number is on screen, and pick
    // the greeting that matches the photo's period rather than the clock.
    if (REVIEW_PERIOD) {
      const reviewPeriod = photo._period ?? REVIEW_PERIOD;
      await showGreeting(REVIEW_HOURS[reviewPeriod] ?? hour);
      if (reviewCounterEl) {
        reviewCounterEl.textContent = `REVIEW: ${reviewPeriod} · photo ${(photo._index ?? 0) + 1} / 50`;
      }
    }
    await showPhoto(photo);
  } catch (err) {
    // If the photo fails to load, log it and fall back to showing just the greeting.
    console.error('[Arctic Scapes] Could not load photo:', err);
    if (!REVIEW_PERIOD) return;
    await showGreeting(hour);
  }
}

// Kick everything off.
init();
