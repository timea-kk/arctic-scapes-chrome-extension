/**
 * newtab.ts
 *
 * The main script for the new tab page. It runs every time you open a new tab
 * and is responsible for wiring everything together:
 *
 *   1. Starting the clock (and keeping it ticking every second)
 *   2. Applying the user's settings (show/hide clock, greeting, location; 24h/AM-PM format)
 *   3. Fetching the next photo and fading it in once it's loaded
 *   4. Showing the photo's location and photographer credit
 *   5. Displaying the greeting once everything is in place
 *
 * The clock and greeting are kept invisible until both are ready to show,
 * which prevents a visual jump caused by the greeting appearing after the clock.
 */

import { getNextImage } from './api.js';
import { getGreeting } from './greetings.js';
import { getSetting, setSetting } from './settings.js';
import { formatTime } from './clock.js';
import type { Photo } from './types.js';

// ─── DOM references ───────────────────────────────────────────────────────────
// Grab all the elements we'll need to update. These are the HTML elements
// defined in newtab.html, selected by their id or class name.

const clockEl       = document.getElementById('clock') as HTMLTimeElement;
const greetingEl    = document.getElementById('greeting') as HTMLParagraphElement;
const centerBlockEl = document.querySelector('.center-block') as HTMLDivElement;
const locationEl    = document.getElementById('location') as HTMLParagraphElement;
const creditEl      = document.getElementById('credit') as HTMLParagraphElement;
const bgCurrent     = document.getElementById('bg-current') as HTMLDivElement;

// ─── Clock ────────────────────────────────────────────────────────────────────
// _clockFormat is kept at module level so the settings toggle can update it
// instantly without restarting the clock interval.
// formatTime() lives in clock.ts so it can be tested independently.

let _clockFormat = '24h';

async function startClock(): Promise<number> {
  const [format, showSeconds] = await Promise.all([
    getSetting('clockFormat'),
    getSetting('showSeconds'),
  ]);

  _clockFormat = format;

  function tick(): void {
    const now = new Date();
    const { time, period } = formatTime(now, _clockFormat, showSeconds);
    // AM/PM is wrapped in a smaller span; 24h mode renders plain text.
    clockEl.innerHTML = period
      ? `${time} <span class="clock-period">${period}</span>`
      : time;
    // The datetime attribute keeps the HTML semantically correct for accessibility tools.
    clockEl.setAttribute('datetime', now.toISOString());
  }

  tick(); // show immediately, then update every second
  setInterval(tick, 1000);
  return new Date().getHours(); // return the current hour for the greeting
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
// Fetches a greeting for the given hour and sets it on the page.
// Also marks the center block as ready, which makes it visible —
// this is intentionally delayed until both the clock and greeting are set
// so the layout is stable before anything appears on screen.

async function showGreeting(hour: number): Promise<void> {
  const funnyEnabled = await getSetting('funnyGreetings');
  greetingEl.textContent = getGreeting(hour, funnyEnabled);
  centerBlockEl.classList.add('ready'); // reveals clock + greeting together
}

// ─── Background photo ─────────────────────────────────────────────────────────
// Waits for a photo file to fully download before showing it.
// This prevents a half-loaded image from flashing on screen.

function preloadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

// Sets the background photo and updates the location and credit text.
async function showPhoto(photo: Photo): Promise<void> {
  await preloadImage(photo.url); // wait until the image is fully downloaded

  // Apply the image as the CSS background of the background layer div.
  bgCurrent.style.backgroundImage = `url('${photo.url}')`;

  // Force the browser to register the style change before starting the fade-in.
  // Without this, the transition from opacity 0 → 1 might not animate.
  bgCurrent.getBoundingClientRect();
  bgCurrent.style.opacity = '1';

  // Show the location pin if this photo has location data.
  if (photo.location) {
    locationEl.textContent = `📍 ${photo.location}`;
    locationEl.classList.add('visible');
  } else {
    locationEl.classList.remove('visible');
  }

  // Photographer credit — required by Unsplash's attribution guidelines.
  creditEl.innerHTML =
    `Photo by <a href="${photo.photographerUrl}" target="_blank" rel="noopener noreferrer">${photo.photographer}</a>` +
    ` on <a href="${photo.unsplashUrl}" target="_blank" rel="noopener noreferrer">Unsplash</a>`;
}

// ─── Settings panel ───────────────────────────────────────────────────────────
// Reads the user's visibility settings and applies them to the page,
// then wires up the toggle buttons in the settings dropdown.

function applyVisibility(type: string, visible: boolean): void {
  // Toggling a data attribute on <body> lets CSS show/hide each element.
  // e.g. body[data-hide-clock] .clock { display: none; }
  if (visible) document.body.removeAttribute(`data-hide-${type}`);
  else         document.body.setAttribute(`data-hide-${type}`, '');
}

async function initSettings(): Promise<void> {
  const [showClock, showGreetingVal, showLocation, clockFormat] = await Promise.all([
    getSetting('showClock'),
    getSetting('showGreeting'),
    getSetting('showLocation'),
    getSetting('clockFormat'),
  ]);

  applyVisibility('clock',    showClock);
  applyVisibility('greeting', showGreetingVal);
  applyVisibility('location', showLocation);

  const wrap     = document.getElementById('settings-wrap') as HTMLDivElement;
  const dropdown = document.getElementById('settings-dropdown') as HTMLDivElement;

  // Open/close the settings dropdown on gear icon click.
  (document.getElementById('settings-btn') as HTMLButtonElement).addEventListener('click', (e) => {
    e.stopPropagation();
    wrap.classList.toggle('open');
  });

  // Clicking inside the dropdown shouldn't close it.
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  // Clicking anywhere else on the page closes the dropdown.
  document.addEventListener('click', () => wrap.classList.remove('open'));

  // Wire up each toggle button: flip its state, save it, and update the page.
  const toggleMap: [string, 'showClock' | 'showGreeting' | 'showLocation', string, boolean][] = [
    ['toggle-clock',    'showClock',    'clock',    showClock],
    ['toggle-greeting', 'showGreeting', 'greeting', showGreetingVal],
    ['toggle-location', 'showLocation', 'location', showLocation],
  ];

  for (const [id, key, type, initial] of toggleMap) {
    const toggle = document.getElementById(id) as HTMLButtonElement;
    toggle.setAttribute('aria-checked', String(initial));
    toggle.addEventListener('click', async () => {
      const newVal = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(newVal));
      await setSetting(key, newVal);
      applyVisibility(type, newVal);
    });
  }

  // Clock format toggle: on = 24h, off = AM/PM.
  // Updates _clockFormat immediately so the clock display changes without a page reload.
  const clockFmtToggle = document.getElementById('toggle-clock-format') as HTMLButtonElement;
  const clockFmtRow = clockFmtToggle.closest('.settings-row') as HTMLElement;
  clockFmtToggle.setAttribute('aria-checked', String(clockFormat === '24h'));
  clockFmtRow.classList.toggle('disabled', !showClock);

  clockFmtToggle.addEventListener('click', async () => {
    const newIs24h = clockFmtToggle.getAttribute('aria-checked') !== 'true';
    clockFmtToggle.setAttribute('aria-checked', String(newIs24h));
    _clockFormat = newIs24h ? '24h' : '12h';
    await setSetting('clockFormat', _clockFormat as '24h' | '12h');
  });

  // Keep the format row in sync with the clock visibility toggle.
  // This listener is registered after the toggleMap one, so aria-checked already
  // holds the new value by the time this runs.
  (document.getElementById('toggle-clock') as HTMLButtonElement).addEventListener('click', () => {
    const clockVisible = (document.getElementById('toggle-clock') as HTMLButtonElement).getAttribute('aria-checked') === 'true';
    clockFmtRow.classList.toggle('disabled', !clockVisible);
  });
}

// ─── Initialise ───────────────────────────────────────────────────────────────
// Everything starts here. The clock and settings can load in parallel with
// the photo fetch, since they don't depend on each other.

async function init(): Promise<void> {
  const [hour] = await Promise.all([
    startClock(),
    initSettings(),
  ]);

  await showGreeting(hour);

  try {
    const photo = await getNextImage();
    await showPhoto(photo);
  } catch (err) {
    console.error('[Arctic Scapes] Could not load photo:', err);
  }
}

init();
