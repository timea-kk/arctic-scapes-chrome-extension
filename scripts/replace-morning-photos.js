#!/usr/bin/env node
/**
 * scripts/replace-morning-photos.js
 *
 * Replaces specific morning fallback photos with brighter arctic sunrise shots.
 * Slots to replace: 12, 19, 31 (currently dark/night photos).
 *
 * Usage:
 *   UNSPLASH_KEY=your_access_key node scripts/replace-morning-photos.js
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

const SLOTS_TO_REPLACE = [12, 19, 31];

// Bright arctic sunrise queries — specifically avoiding dark/night results
const QUERIES = [
  'arctic sunrise snow mountains bright',
  'svalbard sunrise golden light snow',
  'iceland glacier sunrise warm light',
  'norway fjord sunrise winter bright',
  'greenland dawn golden hour landscape',
];

if (!API_KEY) {
  console.error('\n  Error: Unsplash API key required.\n');
  console.error('  Usage: UNSPLASH_KEY=your_key node scripts/replace-morning-photos.js');
  process.exit(1);
}

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'ArcticScapes/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
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

function normalizePhoto(data, filepath) {
  const city = data.location?.city ?? null;
  const country = data.location?.country ?? null;
  let location = null;
  if (city && country) location = `${city}, ${country}`;
  else if (city) location = city;
  else if (country) location = country;
  else if (data.location?.name) location = data.location.name;

  return {
    id: data.id,
    url: `./${filepath}`,
    photographer: data.user?.name ?? 'Unknown',
    photographerUrl: `${data.user?.links?.html ?? 'https://unsplash.com'}?${UTM}`,
    unsplashUrl: `${data.links?.html ?? 'https://unsplash.com'}?${UTM}`,
    location,
  };
}

async function fetchSearchResults(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&order_by=relevant&per_page=20&client_id=${API_KEY}`;
  const { status, json } = await get(url);
  if (status !== 200) {
    console.log(`  FAILED (${status}) for "${query}"`);
    return [];
  }
  return json.results ?? [];
}

async function downloadImage(url, dest) {
  const { raw } = await get(url);
  fs.writeFileSync(dest, raw);
}

async function run() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  const existingIds = new Set(meta.morning.map((p) => p.id));

  console.log(`\nReplacing morning slots: ${SLOTS_TO_REPLACE.join(', ')}`);
  console.log(`Excluding ${existingIds.size} existing photo IDs.\n`);

  // Gather candidates across queries
  const seen = new Set(existingIds);
  const candidates = [];

  for (const query of QUERIES) {
    if (candidates.length >= SLOTS_TO_REPLACE.length * 3) break;
    process.stdout.write(`  Searching: "${query}" … `);
    const results = await fetchSearchResults(query);
    let added = 0;
    for (const photo of results) {
      if (!seen.has(photo.id)) {
        seen.add(photo.id);
        candidates.push(photo);
        added++;
      }
    }
    console.log(`${added} new (${candidates.length} total)`);
    await new Promise((r) => setTimeout(r, 500));
  }

  if (candidates.length < SLOTS_TO_REPLACE.length) {
    console.error(`\n  Error: only found ${candidates.length} candidates, need ${SLOTS_TO_REPLACE.length}. Try different queries.\n`);
    process.exit(1);
  }

  console.log(`\nDownloading ${SLOTS_TO_REPLACE.length} replacement photos…`);

  for (let i = 0; i < SLOTS_TO_REPLACE.length; i++) {
    const slot = SLOTS_TO_REPLACE[i];
    const photo = candidates[i];
    const filename = `morning-${String(slot).padStart(2, '0')}.jpg`;
    const filepath = `images/morning/${filename}`;
    const dest = path.join(ROOT, 'images', 'morning', filename);
    const imgUrl = `${photo.urls.raw}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;

    process.stdout.write(`  [${i + 1}/${SLOTS_TO_REPLACE.length}] slot ${slot} → ${photo.id} (${photo.user?.name}) … `);
    await downloadImage(imgUrl, dest);
    console.log('✓');

    // Update metadata in place
    meta.morning[slot - 1] = normalizePhoto(photo, filepath);
  }

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log('\nDone. photos.json updated.');
  console.log('Replaced slots:', SLOTS_TO_REPLACE.map((s) => `morning-${String(s).padStart(2, '0')}.jpg`).join(', '));
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
