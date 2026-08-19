// Verifies that every `?v=...` cache-busting query string in index.html,
// js/**/*.js, AND tests/**/*.mjs is identical. The game ships as plain ES
// modules with no build step (see README "Running locally"), so
// cache-busting is done by hand: every <script src="...?v=X"> and every
// `import '...js?v=X'` must carry the same version string, or the browser
// can end up loading a stale copy of one module against a fresh copy of
// another after a deploy.
//
// tests/**/*.mjs is included because those files import js/**/*.js with a
// hard-coded `?v=` tag of their own — if that tag falls out of sync with
// index.html/js/**, Node's ESM loader treats the two import specifiers as
// different module instances, breaking any test that relies on reference
// equality of a shared import (e.g. `CONFIG`). See bump-version.mjs's
// header comment and HANDOFF_LOG.md for the false-FAIL this caused before
// this script (and bump-version.mjs) covered tests/**.
//
// Run with: node scripts/check-versions.mjs   (also: npm run check-versions)
// Exits 1 if any file has a version string that doesn't match the rest, or
// if a JS import inside js/ or tests/ is missing one entirely.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function listFiles(dir, extensions) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, extensions));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

const files = [
  path.join(root, 'index.html'),
  ...listFiles(path.join(root, 'js'), ['.js']),
  ...listFiles(path.join(root, 'tests'), ['.mjs']),
];

const versionRe = /\?v=([A-Za-z0-9_.-]+)/g;
const found = []; // { file, version }
const missing = []; // js files that import a sibling module with no ?v= at all

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  for (const m of text.matchAll(versionRe)) {
    found.push({ file: rel, version: m[1] });
  }

  if (file.endsWith('.js') || file.endsWith('.mjs')) {
    // Local relative imports of a `.js` file (./foo.js or ../foo.js, from
    // either a .js or a test .mjs file) should carry a ?v=. Bare/package
    // imports (e.g. 'three') and imports of sibling .mjs test helpers
    // (which aren't part of the cache-busted js/** surface) are out of
    // scope for this check.
    const importRe = /from\s+['"](\.\.?\/[^'"]+\.js)(\?[^'"]*)?['"]/g;
    for (const m of text.matchAll(importRe)) {
      const [, specifier, query] = m;
      if (!query || !query.includes('v=')) {
        missing.push(`${rel}: import '${specifier}' has no ?v= cache-bust string`);
      }
    }
  }
}

const versions = new Set(found.map((f) => f.version));
let failed = false;

if (versions.size > 1) {
  failed = true;
  console.log(`FAIL - found ${versions.size} different version strings, expected 1:`);
  for (const v of versions) {
    const files = found.filter((f) => f.version === v).map((f) => f.file);
    console.log(`  ${v}  (${files.length} occurrence${files.length === 1 ? '' : 's'}: ${[...new Set(files)].join(', ')})`);
  }
} else if (versions.size === 1) {
  console.log(`PASS - single consistent version string: ${[...versions][0]} (${found.length} occurrences across ${new Set(found.map((f) => f.file)).size} files)`);
} else {
  console.log('WARN - no ?v= cache-bust strings found anywhere; nothing to check.');
}

if (missing.length) {
  failed = true;
  console.log(`FAIL - ${missing.length} local import(s) missing a ?v= cache-bust string:`);
  for (const line of missing) console.log(`  ${line}`);
}

process.exit(failed ? 1 : 0);
