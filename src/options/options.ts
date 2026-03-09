/**
 * options/options.ts
 *
 * Controls the Settings page (accessible via the gear icon → "Options" in Chrome).
 *
 * On load: reads the user's saved preferences and fills in the form fields.
 * On save: writes the new values back to storage when the Save button is clicked.
 */

import { getSetting, setSetting } from '../settings.js';

// Grab references to the form elements on the settings page.
const fmtRadios        = document.querySelectorAll<HTMLInputElement>('input[name="clockFormat"]');
const showSecondsEl    = document.getElementById('showSeconds') as HTMLInputElement;
const funnyGreetingsEl = document.getElementById('funnyGreetings') as HTMLInputElement;
const saveBtn          = document.getElementById('btn-save') as HTMLButtonElement;
const saveStatus       = document.getElementById('save-status') as HTMLElement;

// Read current settings from storage and apply them to the form.
// Uses Promise.all so all reads happen at the same time rather than sequentially.
async function loadSettings(): Promise<void> {
  const [format, seconds, funny] = await Promise.all([
    getSetting('clockFormat'),
    getSetting('showSeconds'),
    getSetting('funnyGreetings'),
  ]);

  // Select whichever radio button matches the saved clock format.
  fmtRadios.forEach((r) => { r.checked = r.value === format; });
  showSecondsEl.checked    = seconds;
  funnyGreetingsEl.checked = funny;
}

// Read the current state of every form field and save it all to storage.
// Called when the user clicks the Save button.
async function saveSettings(): Promise<void> {
  // Find the selected clock format radio button. Default to '24h' if none are checked.
  const selectedFormat = [...fmtRadios].find((r) => r.checked)?.value ?? '24h';

  // Save all three settings at the same time.
  await Promise.all([
    setSetting('clockFormat', selectedFormat as '12h' | '24h'),
    setSetting('showSeconds', showSecondsEl.checked),
    setSetting('funnyGreetings', funnyGreetingsEl.checked),
  ]);

  // Briefly show "Saved!" feedback, then fade it out.
  saveStatus.classList.add('visible');
  setTimeout(() => saveStatus.classList.remove('visible'), 2000);
}

saveBtn.addEventListener('click', saveSettings);
loadSettings();
