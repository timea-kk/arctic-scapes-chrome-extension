/**
 * replace-morning-flagged.js
 * Replaces specific flagged morning photos (too bright / wrong content).
 * Slots to replace: 35 (index 34), 45 (index 44)
 *
 * Usage: UNSPLASH_KEY=your_key node scripts/replace-morning-flagged.js
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const META_PATH = path.join(ROOT, 'images', 'photos.json');
const IMG_DIR = path.join(ROOT, 'images', 'morning');

const UNSPLASH_KEY = process.env.UNSPLASH_KEY;
if (!UNSPLASH_KEY) { console.error('Set UNSPLASH_KEY'); process.exit(1); }

const UTM = 'utm_source=arctic_scapes&utm_medium=referral';

// Slots to replace (0-indexed): photo 36
const FLAGGED_INDICES = [35];

const ARCTIC_COUNTRIES = new Set([
  'norway', 'iceland', 'greenland', 'svalbard',
  'canada', 'antarctica', 'faroe islands', 'jan mayen',
  'svalbard and jan mayen',
  // excluded: united states (not arctic), alaska (tagged as US), finland (too many trees), sweden, russia (never)
]);

// Morning queries: ice, snow, glaciers, fjords, icebergs, penguins — no trees, no tundra, no buildings
const MORNING_QUERIES = [
  'iceland glacier sunrise golden hour ice snow',
  'antarctica penguin ice sunrise dawn',
  'antarctic ice sheet sunrise golden light',
  'greenland glacier iceberg sunrise morning',
  'svalbard glacier ice snow sunrise golden',
  'norway fjord ice sunrise golden hour',
  'antarctica iceberg sunrise morning golden light',
  'arctic glacier sunrise pink sky ice',
  'penguin colony antarctica ice sunrise',
  'iceland iceberg glacier lagoon sunrise',
  'svalbard polar bear ice snow sunrise',
  'greenland iceberg glacier sunrise golden',
  'norway fjord snow ice sunrise morning',
  'antarctica ice shelf sunrise golden hour',
  'arctic sea ice sunrise golden light',
  'iceland snow glacier sunrise golden hour',
  'svalbard snow mountain glacier sunrise',
  'antarctica emperor penguin ice sunrise',
  'greenland ice sheet sunrise golden light',
  'norway glacier ice snow sunrise morning',
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept-Version': 'v1', 'Authorization': `Client-ID ${UNSPLASH_KEY}` } }, (res) => {
      const remaining = parseInt(res.headers['x-ratelimit-remaining'] ?? '50', 10);
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.status ?? res.statusCode, body, remaining }));
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeLocation(loc) {
  if (!loc) return null;
  const city = loc.city ?? null;
  const country = loc.country ?? null;
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return loc.name ?? null;
}

function isArctic(loc) {
  if (!loc) return false;
  const country = (loc.country ?? '').toLowerCase();
  const name = (loc.name ?? '').toLowerCase();
  return ARCTIC_COUNTRIES.has(country) || [...ARCTIC_COUNTRIES].some(c => name.includes(c));
}

async function fetchCandidate(query) {
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&count=10`;
  const { status, body, remaining } = await get(url);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  const photos = JSON.parse(body);
  // Return first with a location in an arctic country
  for (const p of photos) {
    if (!isArctic(p.location)) continue;
    const location = normalizeLocation(p.location);
    if (location) return { p, location, remaining };
  }
  return { p: null, location: null, remaining };
}

async function main() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  const morning = meta.morning;

  console.log(`\n── MORNING FLAGGED REPLACEMENTS (${FLAGGED_INDICES.length}) ──`);

  const usedIds = new Set(morning.map(p => p.id));
  let queryIndex = 0;
  let remaining = 50;

  for (let i = 0; i < FLAGGED_INDICES.length; i++) {
    const slot = FLAGGED_INDICES[i];
    const current = morning[slot];
    process.stdout.write(`  [${i + 1}/${FLAGGED_INDICES.length}] slot ${slot + 1} (${current.url}) → `);

    // Rate limit guard
    if (remaining < 3) {
      console.log('\n  Rate limit low — waiting 60s…');
      await sleep(60_000);
    }

    let found = null;
    for (let attempt = 0; attempt < MORNING_QUERIES.length; attempt++) {
      const query = MORNING_QUERIES[queryIndex % MORNING_QUERIES.length];
      queryIndex++;
      try {
        const { p, location, remaining: rem } = await fetchCandidate(query);
        remaining = rem;
        if (p && !usedIds.has(p.id) && location) {
          found = { p, location };
          break;
        }
      } catch (err) {
        console.warn(`\n    query failed: ${err.message}`);
      }
      await sleep(400);
    }

    if (!found) {
      console.log('✗ no suitable replacement found, skipping');
      continue;
    }

    const { p, location } = found;
    const destFile = path.basename(current.url);
    const destPath = path.join(IMG_DIR, destFile);

    // Download image
    const imgUrl = `${p.urls.raw}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
    await download(imgUrl, destPath);

    // Update metadata in place
    morning[slot] = {
      id: p.id,
      url: current.url, // keep the same filename
      photographer: p.user?.name ?? 'Unknown',
      photographerUrl: `${p.user?.links?.html ?? 'https://unsplash.com'}?${UTM}`,
      unsplashUrl: `${p.links?.html ?? 'https://unsplash.com'}?${UTM}`,
      location,
    };
    usedIds.add(p.id);
    usedIds.delete(current.id);

    console.log(`${p.id} (${location}) … ✓`);
    await sleep(400);
  }

  meta.morning = morning;
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`\nDone. morning: ${morning.length} total\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
