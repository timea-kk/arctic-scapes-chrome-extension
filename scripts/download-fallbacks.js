#!/usr/bin/env node
/**
 * scripts/download-fallbacks.js
 *
 * Downloads 40 images per time of day (120 total) from the Unsplash API
 * and writes images/photos.json with full photographer + location metadata.
 *
 * Images are saved to:
 *   images/morning/morning-01.jpg … morning-40.jpg
 *   images/afternoon/afternoon-01.jpg … afternoon-40.jpg
 *   images/evening/evening-01.jpg … evening-40.jpg
 *
 * Usage:
 *   UNSPLASH_KEY=your_access_key node scripts/download-fallbacks.js
 *
 * Get a free key at https://unsplash.com/developers
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images');

const API_KEY = process.argv[2] || process.env.UNSPLASH_KEY;
const UTM = 'utm_source=arctic_scapes&utm_medium=referral';
const TARGET = 40;

// Queries per time of day. Each query fetches up to PER_PAGE results.
// We collect all results, deduplicate, and take the first TARGET unique ones.
const PER_PAGE = 20;

const CATEGORIES = {
  morning: [
    'svalbard sunrise snow mountains',
    'iceland glacier dawn light',
    'norway fjord sunrise winter snow',
    'greenland dawn ice landscape',
    'antarctica sunrise ice snow',
    'arctic sunrise snow landscape',
    'norway arctic dawn mountains',
  ],
  afternoon: [
    'svalbard arctic daylight snow mountains',
    'iceland glacier blue sky snow',
    'norway arctic mountains snow',
    'greenland ice sheet snow landscape',
    'antarctica ice landscape',
    'arctic tundra snow landscape',
    'norway winter mountains snow clear sky',
  ],
  evening: [
    'northern lights norway snow mountains',
    'aurora borealis iceland snow',
    'arctic sunset snow landscape',
    'svalbard northern lights winter',
    'norway arctic night sky snow',
    'greenland northern lights',
    'iceland aurora night snow mountains',
  ],
};

if (!API_KEY) {
  console.error('\n  Error: Unsplash API key required.\n');
  console.error('  Usage: UNSPLASH_KEY=your_key node scripts/download-fallbacks.js');
  console.error('  Get a free key at https://unsplash.com/developers\n');
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

async function downloadImage(url, dest) {
  const { raw } = await get(url);
  fs.writeFileSync(dest, raw);
}

async function fetchSearchResults(query) {
  const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&order_by=relevant&per_page=${PER_PAGE}&client_id=${API_KEY}`;
  const { status, json } = await get(apiUrl);
  if (status !== 200) {
    console.log(`  FAILED (${status}) for "${query}"`);
    return [];
  }
  return json.results ?? [];
}

async function downloadCategory(name, queries) {
  console.log(`\n── ${name.toUpperCase()} ──`);
  const dir = path.join(IMAGES_DIR, name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    if (candidates.length >= TARGET * 2) break; // enough buffer, stop early
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

  const selected = candidates.slice(0, TARGET);
  console.log(`  Downloading ${selected.length} images…`);

  const meta = [];
  for (let i = 0; i < selected.length; i++) {
    const photo = selected[i];
    const filename = `${name}-${String(i + 1).padStart(2, '0')}.jpg`;
    const filepath = `images/${name}/${filename}`;
    const dest = path.join(IMAGES_DIR, name, filename);
    const imgUrl = `${photo.urls.raw}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
    process.stdout.write(`  [${i + 1}/${selected.length}] ${filename} … `);
    await downloadImage(imgUrl, dest);
    meta.push(normalizePhoto(photo, filepath));
    console.log('✓');
  }

  return meta;
}

async function run() {
  const result = {};

  for (const [name, queries] of Object.entries(CATEGORIES)) {
    result[name] = await downloadCategory(name, queries);
  }

  const metaPath = path.join(IMAGES_DIR, 'photos.json');
  fs.writeFileSync(metaPath, JSON.stringify(result, null, 2));

  const total = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\nDone. ${total} photos saved.`);
  console.log(`Metadata written to images/photos.json`);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
