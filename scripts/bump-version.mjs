// Rewrites every `?v=...` cache-busting query string in index.html and
// js/**/*.js to a single new value, in one pass, so they can never drift out
// of sync (see check-versions.mjs for why that matters).
//
// Usage:
//   node scripts/bump-version.mjs              # auto-generates a value like 20260818a
//   node scripts/bump-version.mjs mytag123      # use an explicit value
//   npm run bump-version -- mytag123
//
// After running, `npm run check-versions` should report a single consistent
// version string.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function autoVersion() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${suffix}`;
}

const newVersion = process.argv[2] || autoVersion();
if (!/^[A-Za-z0-9_.-]+$/.test(newVersion)) {
  console.error(`FAIL - version "${newVersion}" must match [A-Za-z0-9_.-]+`);
  process.exit(1);
}

const files = [path.join(root, 'index.html'), ...listJsFiles(path.join(root, 'js'))];
const versionRe = /\?v=[A-Za-z0-9_.-]+(&v=[A-Za-z0-9_.-]+)*/g;

let changedFiles = 0;
let changedOccurrences = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let count = 0;
  const next = text.replace(versionRe, () => {
    count++;
    return `?v=${newVersion}`;
  });
  if (count > 0) {
    fs.writeFileSync(file, next);
    changedFiles++;
    changedOccurrences += count;
  }
}

console.log(`Bumped ${changedOccurrences} version string(s) across ${changedFiles} file(s) to "${newVersion}".`);
console.log('Run `npm run check-versions` to confirm.');
