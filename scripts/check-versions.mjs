// Verifies that every `?v=...` cache-busting query string in index.html and
// js/**/*.js is identical. The game ships as plain ES modules with no build
// step (see README "Running locally"), so cache-busting is done by hand:
// every <script src="...?v=X"> and every `import '...js?v=X'` must carry the
// same version string, or the browser can end up loading a stale copy of
// one module against a fresh copy of another after a deploy.
//
// Run with: node scripts/check-versions.mjs   (also: npm run check-versions)
// Exits 1 if any file has a version string that doesn't match the rest, or
// if a JS import inside js/ is missing one entirely.

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

const files = [path.join(root, 'index.html'), ...listJsFiles(path.join(root, 'js'))];

const versionRe = /\?v=([A-Za-z0-9_.-]+)/g;
const found = []; // { file, version }
const missing = []; // js files that import a sibling module with no ?v= at all

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  for (const m of text.matchAll(versionRe)) {
    found.push({ file: rel, version: m[1] });
  }

  if (file.endsWith('.js')) {
    // Local relative imports (./foo.js or ../foo.js) should carry a ?v=.
    // Bare/package imports (e.g. 'three') are out of scope for this check.
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
