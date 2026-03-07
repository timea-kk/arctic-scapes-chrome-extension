#!/usr/bin/env node
/**
 * scripts/fill-missing-locations.js
 *
 * Finds all photos in fallback-meta.json that have no location tag,
 * replaces them with new photos that have confirmed location data,
 * downloads to the same filenames, and patches the metadata in place.
 *
 * Usage:
 *   UNSPLASH_KEY=your_access_key node scripts/fill-missing-locations.js
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
  console.error('  Usage: UNSPLASH_KEY=your_key node scripts/fill-missing-locations.js');
  process.exit(1);
}

// Queries per period — each returns results with Unsplash location metadata.
// We only accept results where location.city, location.country, or location.name is set.
const QUERIES = {
  morning: [
    'lofoten islands norway sunrise winter',
    'tromso norway sunrise aurora morning',
    'reykjavik iceland sunrise winter',
    'svalbard longyearbyen sunrise arctic',
    'greenland ilulissat sunrise iceberg',
    'norway lofoten dawn mountains snow',
    'iceland jokulsarlon glacier sunrise',
    'faroe islands torshavn morning',
    'tromsø norway winter sunrise mountains',
    'nordkapp norway arctic sunrise',
    'bergen norway winter morning',
    'akureyri iceland winter dawn',
  ],
  afternoon: [
    'lofoten islands norway winter afternoon',
    'iceland vatnajokull glacier blue sky',
    'svalbard spitsbergen arctic daylight',
    'greenland nuuk iceberg fjord',
    'norway bergen fjord winter',
    'faroe islands landscape afternoon',
    'iceland hallgrimskirkja winter day',
    'norway tromsø fjord winter afternoon',
    'iceland skaftafell glacier',
    'greenland disko bay iceberg',
    'norway flam railway winter',
    'iceland landmannalaugar mountains',
  ],
  evening: [
    'tromso norway northern lights',
    'lofoten islands norway aurora borealis',
    'iceland aurora borealis night',
    'svalbard northern lights winter night',
    'norway aurora night mountains',
    'greenland kangerlussuaq northern lights',
    'faroe islands night sky stars',
    'norway lyngenfjord aurora evening',
    'iceland kirkjufell northern lights',
    'norway senja aurora borealis',
    'iceland aurora night glacier',
    'norway nordkapp northern lights',
  ],
};

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

async function fetchSearchResults(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&order_by=relevant&per_page=30&client_id=${API_KEY}`;
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

async function gatherCandidates(period, needed, existingIds) {
  const queries = QUERIES[period];
  const seen = new Set(existingIds);
  const candidates = [];

  for (const query of queries) {
    if (candidates.length >= needed * 3) break;
    process.stdout.write(`    "${query}" … `);
    const results = await fetchSearchResults(query);
    let added = 0;
    for (const photo of results) {
      if (!seen.has(photo.id) && extractLocation(photo) !== null) {
        seen.add(photo.id);
        candidates.push(photo);
        added++;
      }
    }
    console.log(`${added} with location (${candidates.length} total)`);
    await new Promise((r) => setTimeout(r, 400));
    if (candidates.length >= needed * 3) break;
  }

  return candidates;
}

async function run() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));

  // Collect all existing IDs to avoid duplicates
  const allIds = new Set([
    ...meta.morning.map((p) => p.id),
    ...meta.afternoon.map((p) => p.id),
    ...meta.evening.map((p) => p.id),
  ]);

  let totalReplaced = 0;

  for (const period of ['morning', 'afternoon', 'evening']) {
    const nullSlots = meta[period]
      .map((p, i) => ({ index: i, photo: p }))
      .filter(({ photo }) => photo.location === null);

    if (nullSlots.length === 0) {
      console.log(`\n${period.toUpperCase()}: all photos have locations, skipping.`);
      continue;
    }

    console.log(`\n── ${period.toUpperCase()} ── (${nullSlots.length} to replace)`);
    console.log('  Searching for candidates with location data…');

    const candidates = await gatherCandidates(period, nullSlots.length, allIds);

    if (candidates.length < nullSlots.length) {
      console.error(`  ERROR: only found ${candidates.length} candidates, need ${nullSlots.length}. Skipping remaining.`);
    }

    const toUse = candidates.slice(0, nullSlots.length);

    for (let i = 0; i < toUse.length; i++) {
      const { index } = nullSlots[i];
      const photo = toUse[i];
      const existing = meta[period][index];

      // Derive filename from existing url field
      const filepath = existing.url.replace(/^\.\//, '');
      const dest = path.join(ROOT, filepath);
      const imgUrl = `${photo.urls.raw}&w=2560&q=85&fm=jpg&fit=crop&crop=entropy`;
      const loc = extractLocation(photo);

      process.stdout.write(`  [${i + 1}/${toUse.length}] ${filepath} → ${photo.id} (${loc}) … `);
      await downloadImage(imgUrl, dest);
      console.log('✓');

      meta[period][index] = normalizePhoto(photo, filepath);
      allIds.add(photo.id);
      totalReplaced++;
    }
  }

  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`\nDone. ${totalReplaced} photos replaced. fallback-meta.json updated.`);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
