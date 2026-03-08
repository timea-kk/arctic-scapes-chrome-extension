#!/usr/bin/env node
/**
 * rename-to-slots.mjs
 *
 * Renames image files so the filename number matches the slot position in photos.json.
 * Slot 1 (index 0) → morning-01.jpg, slot 2 → morning-02.jpg, etc.
 *
 * Uses a two-pass rename (real name → temp name → final name) to avoid
 * collisions when files are swapping numbers with each other.
 *
 * Usage: node scripts/rename-to-slots.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const META_PATH = path.join(ROOT, 'images', 'photos.json');

const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));

for (const period of ['morning', 'afternoon', 'evening']) {
  const dir = path.join(ROOT, 'images', period);
  const photos = meta[period];

  console.log(`\n── ${period} (${photos.length} photos) ──`);

  // Pass 1: rename each file to a safe temp name to avoid collisions
  // e.g. morning-49.jpg → morning-tmp-0.jpg
  for (let i = 0; i < photos.length; i++) {
    const current = path.basename(photos[i].url); // e.g. morning-49.jpg
    const temp = `${period}-tmp-${i}.jpg`;
    const src = path.join(dir, current);
    const dst = path.join(dir, temp);
    if (current !== temp) {
      fs.renameSync(src, dst);
    }
  }

  // Pass 2: rename temp names to final slot-numbered names
  // e.g. morning-tmp-0.jpg → morning-01.jpg
  for (let i = 0; i < photos.length; i++) {
    const temp = `${period}-tmp-${i}.jpg`;
    const final = `${period}-${String(i + 1).padStart(2, '0')}.jpg`;
    const src = path.join(dir, temp);
    const dst = path.join(dir, final);
    fs.renameSync(src, dst);

    // Update photos.json URL
    const oldUrl = photos[i].url;
    const newUrl = `./images/${period}/${final}`;
    photos[i].url = newUrl;
    if (oldUrl !== newUrl) {
      console.log(`  slot ${i + 1}: ${path.basename(oldUrl)} → ${final}`);
    }
  }
}

fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
console.log('\nDone. photos.json updated.');
