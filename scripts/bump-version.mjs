// Rewrites every `?v=...` cache-busting query string in index.html,
// js/**/*.js, AND tests/**/*.mjs to a single new value, in one pass, so they
// can never drift out of sync (see check-versions.mjs for why that matters).
//
// tests/**/*.mjs is included deliberately: those files import js/**/*.js
// with the same `?v=` tag hard-coded (e.g.
// `import { CONFIG } from '../../js/core/config.js?v=...'`). Node's ESM
// loader treats a differently-tagged import specifier as a *different*
// module instance, so if this script only bumped index.html/js/** and left
// tests/** on the old tag, `CONFIG` (and anything else) imported by tests
// would no longer be reference-equal to the `CONFIG` used by the bumped
// source, breaking any test that does a reference/identity comparison —
// a false FAIL that has nothing to do with the actual code change. (Hit for
// real, see HANDOFF_LOG.md "Landmine found, not fixed" — this script is the
// fix.)
//
// Usage:
//   node scripts/bump-version.mjs              # auto-generates a value like 20260818a
//   node scripts/bump-version.mjs mytag123      # use an explicit value
//   npm run bump-version -- mytag123
//
// After running, `npm run check-versions` should report a single consistent
// version string, and `npm test` should still be all-PASS (no reference-
// equality FAILs from a stale tag in tests/**).

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

const files = [
  path.join(root, 'index.html'),
  ...listFiles(path.join(root, 'js'), ['.js']),
  ...listFiles(path.join(root, 'tests'), ['.mjs']),
];
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
