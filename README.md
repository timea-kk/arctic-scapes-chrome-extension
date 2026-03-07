# Arctic Scapes

Arctic Scapes replaces Chrome's default new tab page with a full-screen arctic landscape photograph. Every time you open a new tab you get a different image — aurora borealis, Norwegian fjords, alpine glaciers, Banff in winter. On top of the photo: a live clock, a greeting, a location tag, and a photographer credit. That's it. Clean, minimal, and easy on the eyes.

---

## Running the local preview

```bash
npm install
npm start
```

This opens `newtab.html` at `http://localhost:3000/newtab.html` in your default browser. The page works fully without an Unsplash API key — it cycles through 120 bundled landscape photos (40 each for morning, afternoon, and evening).

---

## Getting a free Unsplash API key

The bundled photos are great for getting started, but adding your own Unsplash API key unlocks fresh images pulled directly from Unsplash every time you open a tab.

1. Go to [unsplash.com/developers](https://unsplash.com/developers)
2. Sign up or log in
3. Click **New Application**
4. Fill in the form (name, description — anything is fine)
5. Accept the API guidelines and click **Create application**
6. Copy the **Access Key** (not the Secret Key)
7. Open Arctic Scapes settings in Chrome, paste the key into the API key field, and save

The free tier allows 50 requests per hour, which is more than enough for personal use.

---

## Loading the extension into Chrome

These steps are for loading the extension manually from your local files. You only need to do this once — after that Chrome will remember it.

1. Open Chrome and go to `chrome://extensions` in the address bar
2. Turn on **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. In the file picker, navigate to the `arctic-scapes-chrome-extension` folder and click **Select** (or **Open**)
5. Arctic Scapes will appear in your extensions list and your next new tab will use it
6. If you make changes to the code, click the refresh icon on the extension card to reload it

---

## What each file does

| File / Folder | Purpose |
|---|---|
| `manifest.json` | Chrome extension configuration — permissions, file references, and content security policy |
| `newtab.html` | The new tab page markup |
| `newtab.css` | All styles for the new tab page |
| `newtab.js` | Main entry point — wires up the clock, greeting, and background image |
| `api.js` | Image sourcing: uses Unsplash API when a key is set, otherwise cycles fallback images. Handles batch caching and preloading |
| `greetings.js` | Time-of-day and surprise greeting logic |
| `settings.js` | Read/write user preferences (clock format, seconds, API key, etc.) |
| `storage.js` | Thin wrapper that uses `chrome.storage` inside the extension and `localStorage` on localhost — never use storage APIs directly |
| `images/` | Bundled fallback landscape photos and their metadata (`fallback-meta.json`) |
| `icons/` | Extension icons at 16×16, 48×48, and 128×128 |
| `options/` | Settings page — clock format, seconds toggle, funny greetings toggle, API key input |
| `scripts/download-fallbacks.js` | Downloads fresh fallback images from Unsplash with proper attribution metadata |
| `scripts/replenish-photos.js` | Replaces flagged/null-location photos and fills each period up to the target count |
| `scripts/replace-evening-flagged.js` | Targeted replacement for manually flagged photos; uses dark-sky-only queries for evening |
| `.github/workflows/ci.yml` | CI/CD pipeline: lint + test → package extension zip → publish to Chrome Web Store |
| `README.md` | This file |
| `PROJECT_JOURNEY.md` | Running log of development milestones and decisions |

---

## Updating the fallback images

The bundled images are organised into three time-of-day folders — `images/morning/`, `images/afternoon/`, and `images/evening/` — with 40 photos each. All photos have real photographer attribution stored in `fallback-meta.json`.

To replenish the library (replace flagged photos, fill to target counts, add new regions):

```bash
UNSPLASH_KEY=your_access_key npm run replenish-photos
```

The script is self-managing: it tracks the Unsplash rate limit from response headers and waits automatically if needed. You can leave it running unattended.
