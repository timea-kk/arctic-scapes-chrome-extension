/**
 * newtab.js
 * Main entry point for the new tab page. Wires together the clock,
 * greeting, background image, and photo credit.
 */

import { getNextImage, REVIEW_PERIOD } from './api.js';
import { getGreeting } from './greetings.js';
import { getSetting } from './settings.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────
const clockEl = document.getElementById('clock');
const greetingEl = document.getElementById('greeting');
const locationEl = document.getElementById('location');
const creditEl = document.getElementById('credit');
const bgCurrent = document.getElementById('bg-current');
const reviewCounterEl = document.getElementById('review-counter');

// ─── Clock ────────────────────────────────────────────────────────────────

function formatTime(date, format, showSeconds) {
  const h24 = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  if (format === '12h') {
    const h = h24 % 12 || 12;
    const period = h24 < 12 ? 'AM' : 'PM';
    return showSeconds ? `${h}:${m}:${s} ${period}` : `${h}:${m} ${period}`;
  }

  const h = String(h24).padStart(2, '0');
  return showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
}

async function startClock() {
  const [format, showSeconds] = await Promise.all([
    getSetting('clockFormat'),
    getSetting('showSeconds'),
  ]);

  function tick() {
    const now = new Date();
    clockEl.textContent = formatTime(now, format, showSeconds);
    clockEl.setAttribute('datetime', now.toISOString());
  }

  tick();
  setInterval(tick, 1000);
  return new Date().getHours();
}

// ─── Greeting ─────────────────────────────────────────────────────────────

async function showGreeting(hour) {
  const funnyEnabled = await getSetting('funnyGreetings');
  greetingEl.textContent = getGreeting(hour, funnyEnabled);
}

// ─── Background image ─────────────────────────────────────────────────────

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

async function showPhoto(photo) {
  // Wait for the image to fully load before fading in
  await preloadImage(photo.url);

  bgCurrent.style.backgroundImage = `url('${CSS.escape ? photo.url : photo.url}')`;
  // Force a reflow so the CSS transition fires from opacity 0
  bgCurrent.getBoundingClientRect();
  bgCurrent.style.opacity = '1';

  // Location tag
  if (photo.location) {
    locationEl.textContent = `\u{1F4CD} ${photo.location}`;
    locationEl.classList.add('visible');
  } else {
    locationEl.classList.remove('visible');
  }

  // Photographer credit — required by Unsplash attribution guidelines
  creditEl.innerHTML =
    `Photo by <a href="${photo.photographerUrl}" target="_blank" rel="noopener noreferrer">${photo.photographer}</a>` +
    ` on <a href="${photo.unsplashUrl}" target="_blank" rel="noopener noreferrer">Unsplash</a>`;

}

// ─── Init ─────────────────────────────────────────────────────────────────

async function init() {
  // Clock and greeting can run in parallel with image loading
  const [hour] = await Promise.all([
    startClock(),
  ]);

  const REVIEW_HOURS = { morning: 9, afternoon: 14, evening: 20 };
  await showGreeting(REVIEW_PERIOD ? REVIEW_HOURS[REVIEW_PERIOD] : hour);

  try {
    const photo = await getNextImage();
    await showPhoto(photo);
    if (REVIEW_PERIOD && reviewCounterEl) {
      reviewCounterEl.textContent = `REVIEW: ${REVIEW_PERIOD} · photo ${photo._index + 1} / 50`;
    }
  } catch (err) {
    console.error('[Arctic Scapes] Could not load photo:', err);
    // Leave the dark background — still functional
  }
}

init();
