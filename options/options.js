/**
 * options.js
 *
 * Controls the Settings page (accessible via the gear icon → "Options" in Chrome).
 *
 * On load: reads the user's saved preferences and fills in the form fields.
 * On save: writes the new values back to storage when the Save button is clicked.
 */

import { getSetting, setSetting } from '../settings.js';

// Grab the form elements by their id from options.html.
const fmtRadios       = document.querySelectorAll('input[name="clockFormat"]');
const showSecondsEl   = document.getElementById('showSeconds');
const funnyGreetingsEl = document.getElementById('funnyGreetings');
const saveBtn         = document.getElementById('btn-save');
const saveStatus      = document.getElementById('save-status');

// Read current settings from storage and apply them to the form.
async function loadSettings() {
  const [format, seconds, funny] = await Promise.all([
    getSetting('clockFormat'),
    getSetting('showSeconds'),
    getSetting('funnyGreetings'),
  ]);

  fmtRadios.forEach((r) => { r.checked = r.value === format; });
  showSecondsEl.checked    = seconds;
  funnyGreetingsEl.checked = funny;
}

// Write the current form values back to storage.
async function saveSettings() {
  const selectedFormat = [...fmtRadios].find((r) => r.checked)?.value ?? '24h';

  await Promise.all([
    setSetting('clockFormat',    selectedFormat),
    setSetting('showSeconds',    showSecondsEl.checked),
    setSetting('funnyGreetings', funnyGreetingsEl.checked),
  ]);

  // Briefly show "Saved!" feedback, then fade it out.
  saveStatus.classList.add('visible');
  setTimeout(() => saveStatus.classList.remove('visible'), 2000);
}

saveBtn.addEventListener('click', saveSettings);
loadSettings();
