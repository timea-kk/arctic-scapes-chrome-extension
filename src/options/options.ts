/**
 * options/options.ts
 *
 * Powers the settings page — the page that opens when you click
 * "Extension options" from the Chrome toolbar.
 *
 * On load: reads the saved settings and fills in the form.
 * On save: writes all four settings at once and flashes a confirmation.
 */

import { getSetting, setSetting } from '../settings.js';

// Grab references to every form element on the settings page.
const fmtRadios = document.querySelectorAll<HTMLInputElement>('input[name="clockFormat"]');
const showSecondsEl = document.getElementById('showSeconds') as HTMLInputElement;
const funnyGreetingsEl = document.getElementById('funnyGreetings') as HTMLInputElement;
const apiKeyEl = document.getElementById('unsplashApiKey') as HTMLInputElement;
const saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
const saveStatus = document.getElementById('save-status') as HTMLElement;

// Read all four settings from storage and pre-fill the form with the current values.
// Uses Promise.all so all four reads happen at the same time rather than sequentially.
async function loadSettings(): Promise<void> {
  const [format, seconds, funny, apiKey] = await Promise.all([
    getSetting('clockFormat'),
    getSetting('showSeconds'),
    getSetting('funnyGreetings'),
    getSetting('unsplashApiKey'),
  ]);

  // Select whichever radio button matches the saved clock format.
  fmtRadios.forEach((r) => { r.checked = r.value === format; });
  showSecondsEl.checked = seconds;
  funnyGreetingsEl.checked = funny;
  apiKeyEl.value = apiKey;
}

// Read the current state of every form field and save it all to storage.
// Called when the user clicks the Save button.
async function saveSettings(): Promise<void> {
  // Find the selected clock format radio button. Default to '24h' if none are checked.
  const selectedFormat = [...fmtRadios].find((r) => r.checked)?.value ?? '24h';

  // Save all four settings at the same time.
  await Promise.all([
    setSetting('clockFormat', selectedFormat as '12h' | '24h'),
    setSetting('showSeconds', showSecondsEl.checked),
    setSetting('funnyGreetings', funnyGreetingsEl.checked),
    // .trim() removes any accidental spaces the user may have typed around the key.
    setSetting('unsplashApiKey', apiKeyEl.value.trim()),
  ]);

  // Flash "Saved!" for two seconds so the user knows it worked.
  saveStatus.classList.add('visible');
  setTimeout(() => saveStatus.classList.remove('visible'), 2000);
}

// Wire the Save button to the save function.
saveBtn.addEventListener('click', saveSettings);

// Load the current settings as soon as the page opens.
loadSettings();
