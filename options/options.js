/**
 * options.ts
 * Loads and saves user settings for the Arctic Scapes options page.
 */
import { getSetting, setSetting } from '../settings.js';
const fmtRadios = document.querySelectorAll('input[name="clockFormat"]');
const showSecondsEl = document.getElementById('showSeconds');
const funnyGreetingsEl = document.getElementById('funnyGreetings');
const apiKeyEl = document.getElementById('unsplashApiKey');
const saveBtn = document.getElementById('btn-save');
const saveStatus = document.getElementById('save-status');
async function loadSettings() {
    const [format, seconds, funny, apiKey] = await Promise.all([
        getSetting('clockFormat'),
        getSetting('showSeconds'),
        getSetting('funnyGreetings'),
        getSetting('unsplashApiKey'),
    ]);
    fmtRadios.forEach((r) => { r.checked = r.value === format; });
    showSecondsEl.checked = seconds;
    funnyGreetingsEl.checked = funny;
    apiKeyEl.value = apiKey;
}
async function saveSettings() {
    const selectedFormat = [...fmtRadios].find((r) => r.checked)?.value ?? '24h';
    await Promise.all([
        setSetting('clockFormat', selectedFormat),
        setSetting('showSeconds', showSecondsEl.checked),
        setSetting('funnyGreetings', funnyGreetingsEl.checked),
        setSetting('unsplashApiKey', apiKeyEl.value.trim()),
    ]);
    saveStatus.classList.add('visible');
    setTimeout(() => saveStatus.classList.remove('visible'), 2000);
}
saveBtn.addEventListener('click', saveSettings);
loadSettings();
