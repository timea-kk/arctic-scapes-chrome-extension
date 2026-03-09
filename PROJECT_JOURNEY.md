# 🏔️ The story of Arctic Scapes
Build journey for the Arctic Scapes Chrome extension — what we built, what broke, and how we fixed it.

---

## 🎯 Where it started
- **Goal:** Replace the blank Chrome new tab with a full-viewport arctic landscape, live clock, greeting, and photographer credit.
- **Stack:** Vanilla JS (ES2022), no bundler, no framework. Chrome Manifest V3.
- **Images:** Unsplash API when a key is present; 12 bundled fallbacks when not.

---

## 📍 Milestone 1: The foundation

**What we built**
- New tab page with full-viewport image, live clock, time-of-day greeting (with surprise variants), location tag, and photographer credit
- `storage.js` — wraps `chrome.storage` / `localStorage` so the extension works identically in both environments
- `api.js` — image sourcing, batch caching, background preloading so there's no flash between tabs
- `greetings.js` — morning/afternoon/evening pools; 30% chance of a surprise; never repeats
- `settings.js` — reads/writes user prefs (clock format, seconds, funny greetings, API key)
- Options page with 12h/24h toggle, seconds toggle, funny greetings toggle, API key input
- `manifest.json` — Manifest V3, correct permissions, CSP for Google Fonts and Unsplash
- Plus Jakarta Sans via Google Fonts; `--font-primary` CSS variable at `:root`
- 12 fallback JPEGs in `images/` with `fallback-meta.json`; `npm start` for local preview

**What went wrong**
- No API key meant guessing Unsplash photo IDs — a pug, a tropical beach, and a pink escalator all slipped into the first pass before being caught
- `fallback-meta.json` has placeholder credits ("Unsplash Contributor") instead of real photographer names — needs the download script run with a real key to fix
- ImageMagick and `canvas` both unavailable, so icons were generated with a raw Python PNG encoder — clean but no snow detail

**What the agent learned**
- Never guess Unsplash photo IDs. The API exists for a reason.
- The `storage.js` abstraction paid off immediately — zero conditional logic anywhere in feature code.
- Preloading the next image is what makes the extension feel instant; worth getting right up front.
- `--font-primary` at `:root` makes brand changes a one-liner. Do this on every project.

**Outcome:** ✅ Full working extension — image cycling, clock, greeting, attribution, options page, localhost preview.

---

---

## 📍 Milestone 2: Photo library + CI/CD

**What we built**
- Expanded fallback library to 120 photos: 50 morning, 40 afternoon, 40 evening — all arctic/polar, all with real location data and attribution
- `replenish-photos.js` — one-pass script that replaces flagged/null-location photos, adds Antarctica batches, and tops each period to target count; fully self-managing rate limit handling (reads Unsplash response headers, sleeps automatically, resumes)
- CI/CD pipeline (`.github/workflows/ci.yml`): parallel lint + test jobs → package zip → publish to Chrome Web Store on merge to main
- Restored production time-of-day logic in `api.js` (per-period index tracking, preloading back on) after completing photo review

**What went wrong**
- First replenish run burned all 50 API requests getting 0 results — root cause: `/search/photos` returns minimal metadata and the rate limit was already hit by diagnostic curl calls before the script ran
- Evening "fill" queries pulled too-bright glacier shots and city photos — Unsplash ignores "dark" as a keyword; fixed by rewriting all evening queries to emphasise night/aurora/dusk explicitly

**What the agent learned**
- Use `/photos/random?count=30` not `/search/photos` — richer location metadata and fewer wasted requests
- For evening photos, query content beats query intent: "aurora borealis dark night sky" works; "dark landscape" does not
- Per-period fallback indices (`fallbackIndex_morning` etc.) are the right model — single index would mix periods when the clock crosses a boundary

**Outcome:** ✅ 120 curated photos live, all with locations. CI/CD pipeline ready to connect. Production image logic restored.

---

## 📍 Milestone 3: Photo curation + settings panel

**What we built**
- Manually curated all 150 photos (50 per period) via Unsplash links — verified location, checked cross-period duplicates via API before placing; banned countries enforced (Russia never, Finland/Sweden/USA removed)
- Settings gear icon (bottom-right) opens a frosted-glass dropdown to toggle clock, greeting, and location pin on/off; preferences persist in storage
- Review mode upgraded to `'all'` — cycles all 150 photos in sequence (morning → afternoon → evening) with period-aware counter and greeting; set `REVIEW_PERIOD = null` before shipping

**What went wrong**
- Unsplash free tier is 50 requests/hour and both random fetches and single-photo lookups count — hit the limit mid-session repeatedly; worked around by batching link checks and scheduling overnight cron runs
- Several country names in Unsplash metadata are in Spanish/German/Icelandic ("Islandia", "Island") — needed explicit normalisation to avoid rejecting valid arctic photos

**What the agent learned**
- User-curated workflow (paste Unsplash link → API check → download) is more reliable than scripted bulk fetches for quality control
- `data-hide-*` attributes on `<body>` with CSS selectors is the cleanest way to toggle visibility without conflicting with existing class-based show/hide logic

**Outcome:** ✅ 150 curated photos live, all with locations, no cross-period duplicates. Settings panel shipped. Review mode covers all periods in one pass.

---

---

## 📍 Milestone 4: TypeScript migration

**What we built**
- Rewrote all source files from JavaScript to TypeScript — `src/types.ts`, `src/storage.ts`, `src/settings.ts`, `src/greetings.ts`, `src/api.ts`, `src/newtab.ts`, `src/options/options.ts`
- Added `tsconfig.json` (compiles `src/` → project root), `tsconfig`-aware ESLint via `typescript-eslint`, and `npm run build` / `npm run typecheck` scripts
- Converted the test suite to TypeScript; all 4 tests pass with zero changes to test logic

**Why TypeScript is better than plain JavaScript here**
- TypeScript catches mistakes before the code runs — typos in setting keys, wrong photo shapes, missing null checks — all become build errors instead of silent runtime bugs
- The `Settings` type makes the settings system self-documenting: any developer (or AI) can see exactly which keys exist and what values are allowed, without reading through four files
- Shared interfaces in `src/types.ts` mean every file agrees on what a `Photo` looks like — no more guessing whether `location` can be `null` or just an empty string

**What went wrong**
- `moduleResolution: "NodeNext"` requires explicit `.js` extensions in all imports even though the source files are `.ts` — counterintuitive but correct; TypeScript resolves `./storage.js` to `./storage.ts` at compile time
- `types.js` compiles to an empty `export {}` shell (all TypeScript types are erased at build time) — harmless, but worth knowing it exists

**What the agent learned**
- `import type` is the right way to import interfaces — erased entirely at compile time, no runtime cost, no empty import left in the compiled output
- `outDir: "."` with `rootDir: "src"` keeps compiled `.js` files right where the HTML and manifest already reference them — no path changes needed anywhere else

**Outcome:** ✅ Full TypeScript codebase. Zero type errors. All tests pass. Build pipeline working.

---

## 📍 Where we are now
Extension: Milestone 4 complete. Full TypeScript, 150 curated photos, settings panel.
Icons: Plain mountain silhouette — designer to refine.
Next: Connect CI/CD secrets, submit to Chrome Web Store.

---

## ✏️ How to keep this doc useful
Add a new milestone when you start a new phase.
What we built / what went wrong / what I learned / outcome (always last).
Keep it scannable.
