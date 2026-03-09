/**
 * newtab.ts
 * Main entry point for the new tab page. Wires together the clock,
 * greeting, background image, and photo credit.
 */
import { getNextImage, REVIEW_PERIOD } from './api.js';
import { getGreeting } from './greetings.js';
import { getSetting, setSetting } from './settings.js';
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
    await preloadImage(photo.url);
    bgCurrent.style.backgroundImage = `url('${photo.url}')`;
    // Force a reflow so the CSS transition fires from opacity 0
    bgCurrent.getBoundingClientRect();
    bgCurrent.style.opacity = '1';
    if (photo.location) {
        locationEl.textContent = `📍 ${photo.location}`;
        locationEl.classList.add('visible');
    }
    else {
        locationEl.classList.remove('visible');
    }
    creditEl.innerHTML =
        `Photo by <a href="${photo.photographerUrl}" target="_blank" rel="noopener noreferrer">${photo.photographer}</a>` +
            ` on <a href="${photo.unsplashUrl}" target="_blank" rel="noopener noreferrer">Unsplash</a>`;
}
// ─── Settings panel ───────────────────────────────────────────────────────
function applyVisibility(type, visible) {
    if (visible)
        document.body.removeAttribute(`data-hide-${type}`);
    else
        document.body.setAttribute(`data-hide-${type}`, '');
}
async function initSettings() {
    const [showClock, showGreetingVal, showLocation] = await Promise.all([
        getSetting('showClock'),
        getSetting('showGreeting'),
        getSetting('showLocation'),
    ]);
    applyVisibility('clock', showClock);
    applyVisibility('greeting', showGreetingVal);
    applyVisibility('location', showLocation);
    const wrap = document.getElementById('settings-wrap');
    const dropdown = document.getElementById('settings-dropdown');
    document.getElementById('settings-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.classList.toggle('open');
    });
    dropdown.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => wrap.classList.remove('open'));
    const toggleMap = [
        ['toggle-clock', 'showClock', 'clock', showClock],
        ['toggle-greeting', 'showGreeting', 'greeting', showGreetingVal],
        ['toggle-location', 'showLocation', 'location', showLocation],
    ];
    for (const [id, key, type, initial] of toggleMap) {
        const toggle = document.getElementById(id);
        toggle.setAttribute('aria-checked', String(initial));
        toggle.addEventListener('click', async () => {
            const newVal = toggle.getAttribute('aria-checked') !== 'true';
            toggle.setAttribute('aria-checked', String(newVal));
            await setSetting(key, newVal);
            applyVisibility(type, newVal);
        });
    }
}
// ─── Init ─────────────────────────────────────────────────────────────────
async function init() {
    const [hour] = await Promise.all([
        startClock(),
        initSettings(),
    ]);
    const REVIEW_HOURS = { morning: 9, afternoon: 14, evening: 20 };
    if (!REVIEW_PERIOD)
        await showGreeting(hour);
    try {
        const photo = await getNextImage();
        if (REVIEW_PERIOD) {
            const reviewPeriod = photo._period ?? REVIEW_PERIOD;
            await showGreeting(REVIEW_HOURS[reviewPeriod] ?? hour);
            if (reviewCounterEl) {
                reviewCounterEl.textContent = `REVIEW: ${reviewPeriod} · photo ${(photo._index ?? 0) + 1} / 50`;
            }
        }
        await showPhoto(photo);
    }
    catch (err) {
        console.error('[Arctic Scapes] Could not load photo:', err);
        if (!REVIEW_PERIOD)
            return;
        await showGreeting(hour);
    }
}
init();
