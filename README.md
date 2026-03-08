# Arctic Scapes

Arctic Scapes replaces Chrome's default new tab page with a full-screen arctic landscape photograph. Every time you open a new tab you get a different image — aurora borealis, Norwegian fjords, Greenland icebergs, Antarctic ice shelves. On top of the photo: a live clock, a time-of-day greeting, a location pin, and a photographer credit. Clean, minimal, no distractions.

---

## How it works

On each new tab, `api.js` serves the next photo from the bundled library — 150 hand-picked arctic and polar images, 50 each for morning, afternoon, and evening, selected based on the current time of day. The next photo is preloaded in the background so there's no visible wait between tabs.

The clock ticks live in the browser. The greeting is time-of-day aware (morning / afternoon / evening pools) with a 30% chance of a surprise one-liner from a separate pool of 20. Settings — clock visibility, greeting visibility, location pin visibility — persist across tabs via `storage.js`.

---

## Architecture

```
arctic-scapes-chrome-extension/
│
├── manifest.json          Chrome Manifest V3 — permissions, CSP, file references
├── newtab.html            New tab page markup
├── newtab.css             All styles for the new tab page
├── newtab.js              Main entry point — clock, greeting, image, settings panel
│
├── api.js                 Cycles fallback photos by time of day; handles preloading
├── greetings.js           Time-of-day and surprise greeting logic
├── settings.js            Read/write user preferences via the storage abstraction
├── storage.js             Wraps chrome.storage (extension) and localStorage (localhost)
│
├── images/
│   ├── morning/           50 bundled JPEGs for 05:00–12:00
│   ├── afternoon/         50 bundled JPEGs for 12:00–17:00
│   ├── evening/           50 bundled JPEGs for 17:00–05:00
│   └── fallback-meta.json Photographer names, attribution links, and location tags
│
├── icons/                 Extension icons at 16×16, 48×48, and 128×128
├── options/               Settings page (clock format, seconds, funny greetings)
├── scripts/               Dev scripts for downloading and replenishing the photo library
└── .github/workflows/     CI/CD — lint + test → zip → publish to Chrome Web Store
```

---

## Photo library

Photos are organised into three time-of-day folders. All 150 are arctic or polar locations (Norway, Iceland, Greenland, Svalbard, Antarctica, Faroe Islands) with real location data and photographer attribution stored in `fallback-meta.json`. No photos without a location tag are included.

The library was manually curated: each photo was verified for location, checked for cross-period duplicates, and screened for the banned-country list before being placed.
