#!/usr/bin/env node
/**
 * scripts/replenish-photos.js
 *
 * Brings the photo library up to standard in one pass:
 *   1. Replaces 6 flagged morning photos (user disliked during review)
 *   2. Replaces all null-location photos across all three periods
 *   3. Adds 10 unique Antarctica photos to afternoon
 *   4. Tops up afternoon to 40 photos total
 *   5. Adds 10 unique Antarctica photos to evening
 *   6. Tops up evening to 40 photos total
 *
 * Usage:
 *   UNSPLASH_KEY=your_access_key node scripts/replenish-photos.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const META_PATH = path.join(ROOT, 'images', 'fallback-meta.json');

const API_KEY = process.argv[2] || process.env.UNSPLASH_KEY;
const UTM = 'utm_source=arctic_scapes&utm_medium=referral';

if (!API_KEY) {
  console.error('\n  Error: Unsplash API key required.\n');
  console.error('  Usage: UNSPLASH_KEY=your_key node scripts/replenish-photos.js');
  process.exit(1);
}

// Morning photos flagged as unwanted during the design review
const FLAGGED_MORNING_IDS = new Set([
  'ol7KRNzBUMY', // sunrise over a mountain lake — icy rocks
  'pBB2s3z5MmI', // ice on body of water during sunset
  'l6EQHqhQAgQ', // river running through snow-covered valley
  'H52F-ELwhR0', // body of water surrounded by mountains
  '8enmIc7oriw', // sunrise over a glacier
  'FNN2yFYPTTs', // Antarctica — duplicate visual style
]);

const QUERIES = {
  morning: [
    'svalbard sunrise winter arctic',
    'lofoten norway sunrise winter',
    'iceland morning glacier golden light',
    'norway arctic sunrise mountains',
    'greenland sunrise iceberg fjord',
    'tromso norway arctic morning light',
    'svalbard polar sunrise winter',
    'norway lofoten winter dawn',
    'iceland jokulsarlon sunrise',
    'nordkapp norway arctic dawn',
  ],
  afternoon: [
    'svalbard arctic landscape winter daylight',
    'iceland fjord blue sky winter afternoon',
    'norway mountains winter clear afternoon',
    'greenland iceberg fjord daylight',
    'faroe islands landscape afternoon',
    'lofoten islands winter daylight',
    'iceland highland winter blue sky',
    'svalbard tundra winter afternoon',
    'norway fjord winter clear day',
    'iceland vatnajokull glacier afternoon',
  ],
  evening: [
    'aurora borealis dark night sky norway',
    'northern lights dark polar night reflection',
    'polar night aurora svalbard dark',
    'norway fjord sunset dusk dark orange sky',
    'iceland aurora borealis dark night mountains',
    'tromso northern lights dark winter night',
    'norway arctic sunset twilight dark water',
    'finland lapland aurora dark forest night',
    'greenland aurora borealis polar night dark',
    'norway lofoten northern lights dark reflection',
    'iceland kirkjufell aurora dark night',
    'svalbard polar night dark sky stars',
    'norway senja aurora borealis dark winter',
    'canada yukon aurora borealis dark night',
    'alaska northern lights dark landscape',
    'arctic sunset dusk dark orange purple sky',
    'scandinavia aurora borealis dark frozen lake',
  ],
  antarctica_afternoon: [
    'antarctica landscape glacier daylight',
    'south georgia island mountains',
    'antarctica iceberg turquoise water',
    'falkland islands coastal landscape',
    'antarctica peninsula mountains glacier',
    'antarctic ice shelf landscape',
    'antarctica drake passage landscape',
    'south georgia island scenery',
    'antarctica continental ice sheet',
    'polar ice cap landscape antarctica',
  ],
  antarctica_evening: [
    'aurora australis antarctica',
    'antarctica night sky milky way',
    'antarctica twilight dusk glacier',
    'south pole sunset ice landscape',
    'antarctica sunset pink sky',
    'antarctic ice shelf twilight',
    'south georgia island sunset',
    'antarctica dusk orange sky',
    'polar sunset ice antarctica',
    'antarctica evening glow glacier',
  ],
};

// ─── Rate limit tracking ─────────────────────────────────────────────────────

const rateLimit = { remaining: 50, windowStart: null };

async function waitForReset() {
  const elapsed = Date.now() - (rateLimit.windowStart ?? Date.now());
  const waitMs = Math.max(0, 3_600_000 - elapsed + 10_000); // wait to top of hour + 10s buffer
  const waitMin = Math.ceil(waitMs / 60_000);
  console.log(`\n  Rate limit reached. Waiting ${waitMin} min for reset — script will continue automatically.`);
  await new Promise((r) => setTimeout(r, waitMs));
  rateLimit.remaining = 50;
  rateLimit.windowStart = null;
  console.log('  Reset. Resuming...\n');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'ArcticScapes/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      // Track rate limit from every response
      const remaining = parseInt(res.headers['x-ratelimit-remaining'] ?? '-1', 10);
      if (remaining >= 0) {
        rateLimit.remaining = remaining;
        if (!rateLimit.windowStart) rateLimit.windowStart = Date.now();
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        if (res.headers['content-type']?.includes('application/json')) {
          try { resolve({ status: res.statusCode, json: JSON.parse(body.toString()) }); }
          catch { resolve({ status: res.statusCode, raw: body }); }
        } else {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
  });
}

function extractLocation(data) {
  const city = data.location?.city ?? null;
  const country = data.location?.country ?? null;
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  if (data.location?.name) return data.location.name;
  return null;
}

function normalizePhoto(data, filepath) {
  return {
    id: data.id,
    url: `./${filepath}`,
    photographer: data.user?.name ?? 'Unknown',
    photographerUrl: `${data.user?.links?.html ?? 'https://unsplash.com'}?${UTM}`,
    unsplashUrl: `${data.links?.html ?? 'https://unsplash.com'}?${UTM}`,
    location: extractLocation(data),
  };
}

async function searchPhotos(query) {
  // Pause before the request if we're close to the rate limit
  if (rateLimit.remaining <= 3) await waitForReset();

  // Use /photos/random?count=30 — returns richer metadata (including location)
  // than /search/photos which often omits location fields
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&count=30&client_id=${API_KEY}`;
  const { status, json } = await get(url);
  if (status !== 200) {
    if (status === 403) await waitForReset();
    else console.log(`  FAILED (${status}) for "${query}"`);
    return [];
  }
  if (json?.errors) {
    console.log(`  API ERROR: ${json.errors.join(', ')}`);
    await waitForReset();
    return [];
  }
  return Array.isArray(json) ? json : [];
}

async function downloadImage(url, dest) {
  const { raw } = await get(url);
  fs.writeFileSync(dest, raw);
}

async function gatherCandidates(queryList, needed, seen) {
  const candidates = [];
  let emptyStreak = 0;
  for (const query of queryList) {
    if (candidates.length >= needed * 2) break;
    // Stop if 3 consecutive queries return nothing — likely rate limited
    if (emptyStreak >= 3) {
      console.log('  Stopping early: 3 empty results in a row (possible rate limit)');
      break;
    }
    process.stdout.write(`    "${query}" … `);
    const results = await searchPhotos(query);
    let added = 0;
    for (const photo of results) {
      if (!seen.has(photo.id) && extractLocation(photo) !== null) {
        seen.add(photo.id);
        candidates.push(photo);
        added++;
      }
    }
    console.log(`${added} found (${candidates.length} total)`);
    emptyStreak = added === 0 ? emptyStreak + 1 : 0;
    await new Promise((r) => setTimeout(r, 400));
  }
  return candidates;
}

function nextFilename(period, existingUrls) {
  const nums = existingUrls.map((u) => {
    const m = u.match(/fallback-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  let next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return () => {
    const n = next++;
    return `images/${period}/fallback-${String(n).padStart(2, '0')}.jpg`;
  };
}

// ─── Replacement task (overwrites existing file slots) ──────────────────────

async function replaceSlots(meta, period, slots, queryKey, label, seen) {
  if (slots.length === 0) {
    console.log(`\n${label}: none to replace.`);
    return 0;
  }
  console.log(`\n── ${label} (${slots.length}) ──`);
  // Remove their IDs from seen so they don't block candidates
  slots.forEach(({ photo }) => seen.delete(photo.id));
  const candidates = await gatherCandidates(QUERIES[queryKey], slots.length, seen);
  let count = 0;
  for (let i = 0; i < Math.min(slots.length, candidates.length); i++) {
    const { index } = slots[i];
    const photo = candidates[i];
    const filepath = meta[period][index].url.replace(/^\.\//, '');
    const dest = path.join(ROOT, filepath);
    const imgUrl = `${photo.urls.raw}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
    process.stdout.write(`  [${i + 1}/${slots.length}] ${filepath} → ${photo.id} (${extractLocation(photo)}) … `);
    await downloadImage(imgUrl, dest);
    console.log('✓');
    meta[period][index] = normalizePhoto(photo, filepath);
    count++;
  }
  return count;
}

// ─── Addition task (appends new entries) ────────────────────────────────────

async function addPhotos(meta, period, queryKey, count, label, seen) {
  if (count <= 0) {
    console.log(`\n${label}: already at target, skipping.`);
    return 0;
  }
  console.log(`\n── ${label} (+${count}) ──`);
  const candidates = await gatherCandidates(QUERIES[queryKey], count, seen);
  const toAdd = candidates.slice(0, count);
  const getFilename = nextFilename(period, meta[period].map((p) => p.url));
  let added = 0;
  for (let i = 0; i < toAdd.length; i++) {
    const photo = toAdd[i];
    const filepath = getFilename();
    const dest = path.join(ROOT, filepath);
    const imgUrl = `${photo.urls.raw}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
    process.stdout.write(`  [${i + 1}/${toAdd.length}] ${filepath} (${extractLocation(photo)}) … `);
    await downloadImage(imgUrl, dest);
    console.log('✓');
    meta[period].push(normalizePhoto(photo, filepath));
    added++;
  }
  return added;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));

  // Global dedup set — no photo ID appears in more than one period
  const seen = new Set([
    ...meta.morning.map((p) => p.id),
    ...meta.afternoon.map((p) => p.id),
    ...meta.evening.map((p) => p.id),
  ]);

  let total = 0;

  // 1. Replace flagged morning photos
  const flaggedSlots = meta.morning
    .map((p, i) => ({ index: i, photo: p }))
    .filter(({ photo }) => FLAGGED_MORNING_IDS.has(photo.id));
  total += await replaceSlots(meta, 'morning', flaggedSlots, 'morning', 'MORNING FLAGGED', seen);

  // 2. Replace null-location photos in all three periods
  for (const period of ['morning', 'afternoon', 'evening']) {
    const queryKey = period === 'evening' ? 'evening' : period === 'afternoon' ? 'afternoon' : 'morning';
    const nullSlots = meta[period]
      .map((p, i) => ({ index: i, photo: p }))
      .filter(({ photo }) => photo.location === null);
    total += await replaceSlots(meta, period, nullSlots, queryKey, `${period.toUpperCase()} NULL LOCATIONS`, seen);
  }

  // 3. Add 10 Antarctica photos to afternoon
  total += await addPhotos(meta, 'afternoon', 'antarctica_afternoon', 10, 'AFTERNOON ANTARCTICA', seen);

  // 4. Top up afternoon to 40
  total += await addPhotos(meta, 'afternoon', 'afternoon', Math.max(0, 40 - meta.afternoon.length), 'AFTERNOON FILL TO 40', seen);

  // 5. Add 10 Antarctica photos to evening
  total += await addPhotos(meta, 'evening', 'antarctica_evening', 10, 'EVENING ANTARCTICA', seen);

  // 6. Top up evening to 40
  total += await addPhotos(meta, 'evening', 'evening', Math.max(0, 40 - meta.evening.length), 'EVENING FILL TO 40', seen);

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done. ${total} photos updated/added.`);
  console.log(`  morning: ${meta.morning.length} | afternoon: ${meta.afternoon.length} | evening: ${meta.evening.length}`);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
