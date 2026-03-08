# Arctic Scapes

Every time you open a new tab, you get a different arctic landscape — Norwegian fjords, Greenland icebergs, Antarctic ice shelves, aurora borealis. A live clock, a greeting, a location pin, and a photographer credit sit on top. That's it. No feeds, no widgets, no noise.

---

## How it works

The extension ships with 150 hand-picked photos split into three groups: morning, afternoon, and evening. It picks from the right group based on the time of day, cycles through them in order, and quietly preloads the next one in the background so there's never a wait when you open a tab.

The greeting is time-aware — it knows whether it's morning or evening — with a 30% chance of something a bit more unexpected from a pool of 20 surprise one-liners. Settings (clock format, 24h/AM-PM toggle, visibility toggles) are saved per-browser via Chrome's built-in storage.

---

## Architecture

```
arctic-scapes-chrome-extension/
│
├── manifest.json          Chrome extension config — name, permissions, file references
├── newtab.html            New tab page markup
├── newtab.css             All styles for the new tab page
├── newtab.js              Main entry point — clock, greeting, image, settings panel
│
├── api.js                 Picks the next photo by time of day; handles preloading
├── clock.js               Formats the time string (24h / AM-PM / seconds)
├── greetings.js           Time-of-day and surprise greeting logic
├── settings.js            Read/write user preferences via the storage abstraction
├── storage.js             Wraps chrome.storage (extension) and localStorage (dev)
│
├── images/
│   ├── morning/           JPEGs shown 5 am – 12 pm   (morning-01.jpg … morning-50.jpg)
│   ├── afternoon/         JPEGs shown 12 pm – 5 pm   (afternoon-01.jpg … afternoon-50.jpg)
│   ├── evening/           JPEGs shown 5 pm – 5 am    (evening-01.jpg … evening-50.jpg)
│   └── photos.json        Location tags, photographer names, and attribution links
│
├── icons/                 Extension icons at 16×16, 48×48, and 128×128
├── options/               Settings page (24h/AM-PM format, seconds, surprise greetings)
└── scripts/               Dev scripts for downloading photos from Unsplash
```

---

## Make it your own

The photos and greetings are completely decoupled from the extension logic. Fork this, swap them out, and you have a fully different extension — same architecture, your aesthetic.

This is built for designers working with AI coding tools. The intended workflow is: clone the repo, open it in [Cursor](https://cursor.com) or [Claude Code](https://claude.ai/code), and use the prompts below to do the heavy lifting.

---

## Before you start

**Read the source files.** Every `.js` file in this project — `api.js`, `clock.js`, `greetings.js`, `settings.js`, `storage.js`, `newtab.js` — has been written with plain English comments throughout. Each section explains what it does and why, in language that doesn't assume you're a developer. If you want to understand how any part of the extension works before changing it, just open the file and read top to bottom.

**Read the project journey.** `PROJECT_JOURNEY.md` documents how this extension was built from scratch — the decisions made, the problems hit, how they were solved, and why things ended up the way they did. It's worth reading before you dive in. You'll understand the shape of the code much faster, and you'll have a clearer sense of what to change versus what to leave alone.

---

### Getting your photos

[Unsplash](https://unsplash.com) is the recommended source — huge library, free, high quality, and every photo comes with built-in location and photographer metadata so you don't have to fill that in yourself.

To use it, create a free developer account at [unsplash.com/developers](https://unsplash.com/developers), create an app, and grab your Access Key. The free tier gives you 50 downloads per hour, which is more than enough to curate a set. Claude Code will handle everything after that.

You can also bring your own photos from anywhere — as long as you have the rights to use them. Just drop them in the image folders and Claude Code will take care of the metadata.

---

### Prompts to get started

Open the project in Cursor or Claude Code and paste these in.

**1. Set up your photo library from Unsplash**

> I want to populate this Chrome extension with my own photo set using the Unsplash API. My Unsplash Access Key is: [paste your key here]. My theme is: [describe your theme — e.g. "Japanese forests in all four seasons", "brutalist architecture at golden hour", "deep ocean photography"].
>
> Please update the download script in `scripts/` to search for photos matching my theme, download 50 for each time period (morning, afternoon, evening), save them to the correct image folders, and update `images/photos.json` with the real location, photographer name, and attribution links from the API response.

**2. Swap in your own photos**

> I have my own photos ready. I've placed them in `images/morning/`, `images/afternoon/`, and `images/evening/` following the naming convention (morning-01.jpg, morning-02.jpg, etc.). There are [X] in morning, [X] in afternoon, [X] in evening.
>
> Please update `images/photos.json` to match. For each photo, use the filename as the url, set the location to whatever's visible in the photo if you can tell, and use my name ([your name]) and website ([your URL]) for the photographer credit.

**3. Rename the extension**

> Please rename this extension from "Arctic Scapes" to "[your extension name]". Update the name and description in `manifest.json`, the page title in `newtab.html`, the heading in `options/options.html`, and any references to Arctic Scapes in `greetings.js`.

**4. Rewrite the greetings**

> Please rewrite the greetings in `greetings.js` to fit the theme of my extension: [describe your theme]. Keep the same structure — three time-of-day pools (morning, afternoon, evening) with 2–3 options each, and a surprise pool of 20 lines shown 30% of the time. Tone: [calm / witty / poetic / dry — your call].

---

### Getting the project onto your computer

First, fork this repo on GitHub (button in the top right), then ask Claude Code or Cursor:

> Please clone my fork of this repo, install dependencies, and get it ready to work on. My fork URL is: [your GitHub fork URL]

That will download everything and run `npm install` for you.

---

### Loading it into Chrome

Once your changes are ready, you need to package the extension and load it. Give Claude Code or Cursor this prompt:

> Please create a zip of this extension ready for loading into Chrome. Exclude `node_modules/`, `scripts/`, `.git/`, and any dev files that shouldn't be in a Chrome extension package. Name the zip after the extension name in `manifest.json`.

Then:

1. Unzip the zip file somewhere on your computer
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (toggle, top right)
4. Click **Load unpacked** → select the unzipped folder
5. Open a new tab

For personal use you can skip the zip entirely — just click **Load unpacked** and point it directly at the project folder.

After making any changes to the code, hit the refresh icon next to your extension on `chrome://extensions` to reload it.

---

### Publishing to the Chrome Web Store

Once you're happy with your extension and want to share it publicly, you can publish it to the Chrome Web Store. This is optional — you can use it privately forever just by keeping it loaded unpacked.

**What you'll need before you start:**
- A Google account
- A one-time $5 developer registration fee (paid to Google, not recurring)
- A privacy policy (even if your extension collects nothing — Google requires it)
- At least one promotional screenshot at 1280×800 or 640×400
- Your extension icon at 128×128

**Step 1 — Create a developer account**

Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) and sign in. Pay the $5 registration fee. When asked, select **non-trader** — this is for individuals publishing free extensions, not businesses selling goods or services.

**Step 2 — Prepare your privacy policy**

Google requires a privacy policy even if your extension collects no data. This project includes `PRIVACY.md` as a starting point. Host it somewhere publicly accessible — a GitHub Pages URL works fine. Ask Claude Code to help you adapt it to your extension name and contact details if needed.

**Step 3 — Make your ZIP**

Before zipping, make sure you've already run the rename prompt from the "Make it your own" section above — the extension name in `manifest.json`, the page title, and the greeting references should all reflect your new name before you package it.

Then ask Claude Code:

> Please create a zip of this extension ready for Chrome Web Store submission. Exclude `node_modules/`, `scripts/`, `.git/`, and any dev files. Name the zip after the extension name in `manifest.json`.

Make sure you run that from inside the project folder.

**Step 4 — Create a new item in the dashboard**

In the developer dashboard, click **New item** and upload your ZIP. Google will parse the manifest and pre-fill the name and version. Fill in:
- A short description (132 characters max — used in search results)
- A longer description (what it does, why it's nice)
- Your privacy policy URL
- Category: **Productivity** works well for new tab extensions
- Your screenshot(s) and 128×128 icon

**Step 5 — Submit for review**

Click **Submit for review**. Google will review the extension manually. For a simple new tab extension with no permissions beyond `storage`, approval typically takes a few hours to a couple of days. You'll get an email when it goes live.

**After approval**

You'll get a Chrome Web Store URL to share. To push an update later, bump the version number in `manifest.json`, make a new ZIP, and upload it through the same dashboard. Updates go through the same review process.

---

### Setting up test coverage with Codecov

This project already has a test suite in `tests/` — covering time formatting in `clock.js`, photo period selection in `api.js`, and settings read/write in `settings.js`. Run them with `npm test`.

**What is Codecov?** [Codecov](https://codecov.io) is a free dashboard that shows you at a glance how much of your code is actually covered by tests — basically a confidence score that nothing is quietly broken. It hooks into your GitHub repo, so every time you push a change it automatically runs the tests and reports back.

As you make changes over time, things can accidentally break without you noticing — a greeting stops showing, a photo doesn't load, a setting doesn't save. Without tests, you only find out when a user does. With tests, the computer checks for you automatically.

To connect Codecov to your fork, ask Claude Code:

> Please connect the existing tests in `tests/` to Codecov. Set up a GitHub Actions workflow that runs the tests on every push and reports coverage to Codecov. Walk me through creating a free Codecov account and connecting it to this repo.

---

## Running a local preview

To see the extension in a regular browser tab before loading it into Chrome, ask Claude Code:

> Please start a local preview of this extension so I can see it in my browser.

It will open at `http://localhost:3000/newtab.html`. This is useful for quickly reviewing photos and layout — it's not a perfect replica of the installed extension, but close enough for most things.