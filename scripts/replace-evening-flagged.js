#!/usr/bin/env node
/**
 * scripts/replace-evening-flagged.js
 *
 * Replaces 13 specific evening photos flagged during design review:
 *   too bright, city shots, people, or bad quality.
 *
 * All replacements use strictly dark-sky queries:
 *   sunset, dusk, polar night, aurora borealis only.
 *
 * Usage:
 *   UNSPLASH_KEY=your_access_key node scripts/replace-evening-flagged.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const META_PATH = path.join(ROOT, 'images', 'photos.json');

const API_KEY = process.argv[2] || process.env.UNSPLASH_KEY;
const UTM = 'utm_source=arctic_scapes&utm_medium=referral';

if (!API_KEY) {
  console.error('\n  Error: Unsplash API key required.\n');
  process.exit(1);
}

// 1-based photo numbers flagged during review → 0-based indices
const FLAGGED_PHOTO_NUMBERS = [17, 20, 22, 24, 25, 26, 27, 30, 32, 33, 34, 35, 36];
const FLAGGED_INDICES = FLAGGED_PHOTO_NUMBERS.map((n) => n - 1);

// Dark-sky only queries — no daylight, no bright landscapes
const DARK_QUERIES = [
  'aurora borealis dark night sky norway',
  'northern lights dark polar night reflection',
  'polar night aurora svalbard dark',
  'norway fjord sunset dusk dark orange sky',
  'iceland aurora borealis dark night mountains',
  'tromso northern lights dark winter night',
  'aurora australis antarctica dark night sky',
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
];

// ─── Rate limit tracking ─────────────────────────────────────────────────────

const rateLimit = { remaining: 50, windowStart: null };

async function waitForReset() {
  const elapsed = Date.now() - (rateLimit.windowStart ?? Date.now());
  const waitMs = Math.max(0, 3_600_000 - elapsed + 10_000);
  const waitMin = Math.ceil(waitMs / 60_000);
  console.log(`\n  Rate limit reached. Waiting ${waitMin} min for reset — script will continue automatically.`);
  await new Promise((r) => setTimeout(r, waitMs));
  rateLimit.remaining = 50;
  rateLimit.windowStart = null;
  console.log('  Reset. Resuming...\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'ArcticScapes/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
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
  if (rateLimit.remaining <= 3) await waitForReset();
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

async function gatherCandidates(needed, seen) {
  const candidates = [];
  let emptyStreak = 0;
  for (const query of DARK_QUERIES) {
    if (candidates.length >= needed * 2) break;
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));

  const seen = new Set([
    ...meta.morning.map((p) => p.id),
    ...meta.afternoon.map((p) => p.id),
    ...meta.evening.map((p) => p.id),
  ]);

  const slots = FLAGGED_INDICES.map((i) => ({ index: i, photo: meta.evening[i] }));

  console.log(`\n── EVENING FLAGGED REPLACEMENTS (${slots.length}) ──`);
  console.log('  Reason: too bright / city shots / people / bad quality');
  console.log('  Queries: dark sky, aurora, sunset/dusk only\n');

  // Remove flagged IDs from seen so they don't block candidates
  slots.forEach(({ photo }) => seen.delete(photo.id));

  const candidates = await gatherCandidates(slots.length, seen);

  let count = 0;
  for (let i = 0; i < Math.min(slots.length, candidates.length); i++) {
    const { index } = slots[i];
    const photo = candidates[i];
    const filepath = meta.evening[index].url.replace(/^\.\//, '');
    const dest = path.join(ROOT, filepath);
    const imgUrl = `${photo.urls.raw}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
    process.stdout.write(`  [${i + 1}/${slots.length}] photo ${index + 1} ${filepath} → ${photo.id} (${extractLocation(photo)}) … `);
    await downloadImage(imgUrl, dest);
    console.log('✓');
    meta.evening[index] = normalizePhoto(photo, filepath);
    count++;
  }

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done. ${count}/${slots.length} photos replaced.`);
  console.log(`  evening: ${meta.evening.length} total`);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
