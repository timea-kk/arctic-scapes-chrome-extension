# Arctic Scapes

Arctic Scapes replaces Chrome's default new tab page with a full-screen arctic landscape photograph. Every time you open a new tab you get a different image — aurora borealis, Norwegian fjords, Greenland icebergs, Antarctic ice shelves. On top of the photo: a live clock, a time-of-day greeting, a location pin, and a photographer credit. Clean, minimal, no distractions.

---

## How it works

- On each new tab, the app picks the next photo from the bundled library — 150 hand-picked arctic images, 50 each for morning, afternoon, and evening — based on the current time of day.
- The next photo is silently preloaded in the background so there's no visible wait when you open the next tab.
- Settings (clock, greeting, location pin) are saved across browser sessions. The greeting has a 30% chance of swapping in a dry one-liner instead of the usual time-of-day message.

---

## Architecture

The codebase is written in **TypeScript** — a version of JavaScript that adds type safety, which catches mistakes before the code ever runs in the browser. Source files live in `src/` and compile to `.js` files at the project root (those are what Chrome actually loads). You edit `.ts` files; the browser runs the compiled `.js` files.

```
arctic-scapes-chrome-extension/
│
├── src/                       TypeScript source — edit these files
│   ├── types.ts               Shared data shapes (what a Photo looks like, what settings exist)
│   ├── storage.ts             The one place the app reads/writes saved data
│   ├── settings.ts            Reads and writes user preferences (clock format, toggles)
│   ├── greetings.ts           Picks the right greeting based on the time of day
│   ├── api.ts                 Decides which photo to show next; handles preloading
│   ├── newtab.ts              Wires everything together on the new tab page
│   └── options/
│       └── options.ts         Powers the settings page UI
│
├── manifest.json              Tells Chrome what the extension is and what it's allowed to do
├── newtab.html                The new tab page's HTML skeleton
├── newtab.css                 All visual styles for the new tab page
│
├── images/
│   ├── morning/               50 bundled JPEGs for 05:00–12:00
│   ├── afternoon/             50 bundled JPEGs for 12:00–17:00
│   ├── evening/               50 bundled JPEGs for 17:00–05:00
│   └── fallback-meta.json     Photographer names, Unsplash links, and location tags
│
├── options/
│   └── options.html           The settings page HTML
│
├── icons/                     Extension icons at 16×16, 48×48, and 128×128
├── scripts/                   Dev scripts for downloading and replenishing the photo library
├── tests/                     Automated tests (run with `npm test`)
└── .github/workflows/         CI/CD — lint + test → zip → publish to Chrome Web Store
```

---

## Make it your own

The photos and greetings are completely decoupled from the extension logic. Fork this, swap them out, and you have a fully different extension — same architecture, your aesthetic.

This is built for designers working with AI coding tools. The intended workflow is: clone the repo, open it in Cursor or Claude Code, and use the prompts below to do the heavy lifting.

---

## Before you start

**Read the source files.** Every `.ts` file in `src/` has been written with plain English comments throughout. Each section explains what it does and why, in language that doesn't assume you're a developer. If you want to understand how any part of the extension works before changing it, just open the file and read top to bottom. Here's a quick map:

## `src/types.ts` — The shared vocabulary
> Think of this as a dictionary that defines the shape of information used across the whole app.

- Defines what a `Photo` object looks like: url, photographer name, location, etc. Every other file that deals with photos uses this definition — so they're always speaking the same language.
- Defines the `Settings` type: all the user preferences and their allowed values (e.g. `clockFormat` can only be `'12h'` or `'24h'`, never a typo like `'12hour'`).
- Contains no running code — only type definitions. The compiled `types.js` file is intentionally empty.

## `src/storage.ts` — The memory
> Think of this as a single drawer where the app stores and retrieves everything it needs to remember.

- Wraps two different browser storage systems (`chrome.storage` when running as an extension, `localStorage` when previewing on localhost) behind one simple interface: `get`, `set`, `remove`.
- Every other file that needs to save or read data calls this — never the browser APIs directly. That's the rule.
- Returns a typed `unknown` value so callers are forced to say what type they expect, preventing silent mistakes.

## `src/settings.ts` — User preferences
> Think of this as the app's preferences panel under the hood.

- Reads and writes the seven user preferences (clock format, show seconds, funny greetings, Unsplash API key, show clock, show greeting, show location).
- Every preference is stored under a `setting_` prefix in storage (e.g. `setting_clockFormat`) to keep them grouped and easy to find.
- Falls back to a sensible default when a setting has never been saved — so the extension works correctly on a fresh install without any setup.

## `src/greetings.ts` — The words on screen
> Think of this as a small writer that picks the right phrase based on the time of day.

- Has three pools of greetings: morning, afternoon, evening — and a separate pool of 20 dry one-liners for the 30% surprise rate.
- Never shows the same surprise greeting twice in a row (tracks the last one in `sessionStorage`).
- `getGreeting(hour, funnyEnabled)` is the only public function — one call, one string back.

## `src/api.ts` — The photo engine
> Think of this as a librarian who knows which photo to hand you next, and has already fetched the next one before you even ask.

- Cycles through the bundled 150 photos by time of day, keeping a separate counter per period (`fallbackIndex_morning`, etc.) so morning photos never bleed into evening.
- Preloads the next photo into storage after every tab load, so the following tab opens instantly with no network wait.
- Also supports the Unsplash live API when a key is configured — batches 10 photos at a time and refreshes the batch in the background before it runs out.

## `src/newtab.ts` — The page controller
> Think of this as the stage manager — it doesn't write the words or pick the photos, but it calls everyone else and puts everything in the right place on screen.

- Starts the clock, loads settings, and kicks off the photo fetch — all at the same time using `Promise.all` so nothing waits unnecessarily.
- Wires up the settings gear icon: opens the dropdown, applies the toggles, saves the preferences, and updates the page instantly without a reload.
- Handles the `REVIEW_PERIOD` development mode: shows which photo number and time period is being previewed, useful for curating the photo library.

## `src/options/options.ts` — The settings page
> Think of this as the form handler for the settings page that opens when you right-click the extension.

- Loads the current saved settings and fills in the form fields when the page opens.
- On save, writes all four settings (clock format, show seconds, funny greetings, API key) to storage in one go.
- Flashes a "Saved!" confirmation for two seconds so the user knows it worked.

---

**Read the project journey.** `PROJECT_JOURNEY.md` documents how this extension was built from scratch — the decisions made, the problems hit, how they were solved, and why things ended up the way they did. It's worth reading before you dive in. You'll understand the shape of the code much faster, and you'll have a clearer sense of what to change versus what to leave alone.

---

## Getting your photos

Unsplash is the recommended source — huge library, free, high quality, and every photo comes with built-in location and photographer metadata so you don't have to fill that in yourself.

To use it, create a free developer account at unsplash.com/developers, create an app, and grab your Access Key. The free tier gives you 50 downloads per hour, which is more than enough to curate a set. Claude Code will handle everything after that.

You can also bring your own photos from anywhere — as long as you have the rights to use them. Just drop them in the image folders and Claude Code will take care of the metadata.

---

## Prompts to get started

Open the project in Cursor or Claude Code and paste these in.

**1. Set up your photo library from Unsplash**

```
I want to populate this Chrome extension with my own photo set using the Unsplash API.
My Unsplash Access Key is: [paste your key here].
My theme is: [describe your theme — e.g. "Japanese forests in all four seasons",
"brutalist architecture at golden hour", "deep ocean photography"].

Please update the download script in scripts/ to search for photos matching my theme,
download 50 for each time period (morning, afternoon, evening), save them to the correct
image folders, and update images/fallback-meta.json with the real location, photographer
name, and attribution links from the API response.
```

**2. Swap in your own photos**

```
I have my own photos ready. I've placed them in images/morning/, images/afternoon/,
and images/evening/ following the naming convention (morning-01.jpg, etc.).
There are [X] in morning, [X] in afternoon, [X] in evening.

Please update images/fallback-meta.json to match. For each photo, use the filename as
the url, set the location to whatever's visible in the photo if you can tell, and use
my name ([your name]) and website ([your URL]) for the photographer credit.
```

**3. Rename the extension**

```
Please rename this extension from "Arctic Scapes" to "[your extension name]".
Update the name and description in manifest.json, the page title in newtab.html,
the heading in options/options.html, and any references to Arctic Scapes in src/greetings.ts.
```

**4. Rewrite the greetings**

```
Please rewrite the greetings in src/greetings.ts to fit the theme of my extension:
[describe your theme]. Keep the same structure — three time-of-day pools (morning,
afternoon, evening) with 2–3 options each, and a surprise pool of 20 lines shown
30% of the time. Tone: [calm / witty / poetic / dry — your call].
```

---

## Getting the project onto your computer

First, fork this repo on GitHub (button in the top right), then ask Claude Code or Cursor:

```
Please clone my fork of this repo, install dependencies, and get it ready to work on.
My fork URL is: [your GitHub fork URL]
```

That will download everything and run `npm install` for you.

---

## Running a local preview

To see the extension in a regular browser tab before loading it into Chrome, ask Claude Code:

```
Please start a local preview of this extension so I can see it in my browser.
```

It will open at `http://localhost:3000/newtab.html`. This is useful for quickly reviewing photos and layout — it's not a perfect replica of the installed extension, but close enough for most things.

---

## Loading it into Chrome

Once your changes are ready, you need to package the extension and load it. Give Claude Code or Cursor this prompt:

```
Please create a zip of this extension ready for loading into Chrome. Exclude node_modules/,
scripts/, .git/, and any dev files that shouldn't be in a Chrome extension package.
Name the zip after the extension name in manifest.json.
```

Then:

1. Unzip the zip file somewhere on your computer
2. Open Chrome and go to `chrome://extensions`
3. Turn on Developer mode (toggle, top right)
4. Click **Load unpacked** → select the unzipped folder
5. Open a new tab

For personal use you can skip the zip entirely — just click **Load unpacked** and point it directly at the project folder.

After making any changes to the code, hit the refresh icon next to your extension on `chrome://extensions` to reload it.

---

## Setting up test coverage with Codecov

This project already has a test suite in `tests/` — covering greeting logic in `src/greetings.ts`. Run them with `npm test`.

**What is Codecov?** Codecov is a free dashboard that shows you at a glance how much of your code is actually covered by tests — basically a confidence score that nothing is quietly broken. It hooks into your GitHub repo, so every time you push a change it automatically runs the tests and reports back.

As you make changes over time, things can accidentally break without you noticing — a greeting stops showing, a photo doesn't load, a setting doesn't save. Without tests, you only find out when a user does. With tests, the computer checks for you automatically.

To connect Codecov to your fork, ask Claude Code:

```
Please connect the existing tests in tests/ to Codecov. Set up a GitHub Actions workflow
that runs the tests on every push and reports coverage to Codecov. Walk me through creating
a free Codecov account and connecting it to this repo.
```

---

## Publishing to the Chrome Web Store

Once you're happy with your extension and want to share it publicly, you can publish it to the Chrome Web Store. This is optional — you can use it privately forever just by keeping it loaded unpacked.

**What you'll need before you start:**
- A Google account
- A one-time $5 developer registration fee (paid to Google, not recurring)
- A privacy policy (even if your extension collects nothing — Google requires it)
- At least one promotional screenshot at 1280×800 or 640×400
- Your extension icon at 128×128

**Step 1 — Create a developer account**

Go to the Chrome Web Store Developer Dashboard and sign in. Pay the $5 registration fee. When asked, select **non-trader** — this is for individuals publishing free extensions, not businesses selling goods or services.

**Step 2 — Prepare your privacy policy**

Google requires a privacy policy even if your extension collects no data. This project includes `PRIVACY.md` as a starting point. Host it somewhere publicly accessible — a GitHub Pages URL works fine. Ask Claude Code to help you adapt it to your extension name and contact details if needed.

**Step 3 — Make your ZIP**

Before zipping, make sure you've already run the rename prompt from the "Make it your own" section above — the extension name in `manifest.json`, the page title, and the greeting references should all reflect your new name before you package it.

Then ask Claude Code:

```
Please create a zip of this extension ready for Chrome Web Store submission.
Exclude node_modules/, scripts/, .git/, and any dev files.
Name the zip after the extension name in manifest.json.
```

**Step 4 — Create a new item in the dashboard**

In the developer dashboard, click **New item** and upload your ZIP. Google will parse the manifest and pre-fill the name and version. Fill in:

- A short description (132 characters max — used in search results)
- A longer description (what it does, why it's nice)
- Your privacy policy URL
- Category: **Productivity** works well for new tab extensions
- Your screenshot(s) and 128×128 icon

**Step 5 — Submit for review**

Click **Submit for review**. Google will review the extension manually. For a simple new tab extension with no permissions beyond storage, approval typically takes a few hours to a couple of days. You'll get an email when it goes live.

**After approval**

You'll get a Chrome Web Store URL to share. To push an update later, bump the version number in `manifest.json`, make a new ZIP, and upload it through the same dashboard. Updates go through the same review process.
