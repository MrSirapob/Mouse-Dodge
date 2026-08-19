// tests/unit/devmode-docs.test.mjs
//
// Two lightweight static-analysis checks that don't need a live DOM:
//
// 1. Dev Mode command coverage (spec §27): every `data-dev="..."` button
//    rendered by DevMode.renderPanel() and every hotkey in its HOTKEYS map
//    must have a matching `if (type === '...')` branch in action(). This is
//    exactly the kind of thing that breaks silently after a refactor (e.g.
//    the historical HITBOX/GRAZE debug controls the spec calls out) — a
//    button that calls a since-removed action just does nothing, with no
//    error anywhere.
//
// 2. AI documentation files (spec §28): AGENTS.md / CLAUDE.md /
//    HANDOFF_LOG.md / CHANGELOG.md / README.md must exist, and CLAUDE.md
//    must point at AGENTS.md, and the test command must be documented
//    somewhere AI editors will actually read.
//
// Both are done via plain text reads of the real source, not the DOM — see
// tests/README.md for why devMode.js itself isn't imported/instantiated
// here (it touches window/document at module scope for its unlock IIFE).

import { TestSuite, assert, warn } from '../helpers/assertions.mjs';

const ROOT = new URL('../../', import.meta.url);

async function readText(relPath) {
  const fs = await import('node:fs/promises');
  return fs.readFile(new URL(relPath, ROOT), 'utf8');
}

async function fileExists(relPath) {
  const fs = await import('node:fs/promises');
  try {
    await fs.access(new URL(relPath, ROOT));
    return true;
  } catch {
    return false;
  }
}

export async function run() {
  const s = new TestSuite('DEV MODE & AI DOCUMENTATION');

  const devModeSrc = await readText('js/systems/devMode.js');

  s.test('every data-dev="..." button has a matching action() handler (no dead dev-panel buttons)', () => {
    const buttonTypes = [...devModeSrc.matchAll(/data-dev="([a-zA-Z]+)"/g)].map((m) => m[1]);
    assert(buttonTypes.length > 0, 'Expected to find at least one data-dev="..." button in devMode.js renderPanel()', {
      likely: 'js/systems/devMode.js renderPanel() — did the template change shape?',
    });
    const handledTypes = [...devModeSrc.matchAll(/if\s*\(\s*type\s*===\s*'([a-zA-Z]+)'\s*\)/g)].map((m) => m[1]);
    const dead = buttonTypes.filter((t) => !handledTypes.includes(t));
    assert(dead.length === 0, `Dev panel button(s) with no matching action() handler: ${dead.join(', ')}`, {
      expected: 'every data-dev value to have an `if (type === ...)` branch',
      actual: `unhandled: ${dead.join(', ')}`,
      likely: 'js/systems/devMode.js action() — a handler branch may have been removed during cleanup',
    });
  });

  s.test('every HOTKEYS entry has a matching action() handler (no dead hotkeys)', () => {
    const hotkeysBlockMatch = devModeSrc.match(/const HOTKEYS = \{([\s\S]*?)\};/);
    assert(hotkeysBlockMatch, 'Could not find the HOTKEYS map in devMode.js — has it been renamed/restructured?', {
      likely: 'js/systems/devMode.js HOTKEYS',
    });
    const hotkeyTargets = [...hotkeysBlockMatch[1].matchAll(/:\s*'([a-zA-Z]+)'/g)].map((m) => m[1]);
    const handledTypes = [...devModeSrc.matchAll(/if\s*\(\s*type\s*===\s*'([a-zA-Z]+)'\s*\)/g)].map((m) => m[1]);
    const dead = hotkeyTargets.filter((t) => !handledTypes.includes(t));
    assert(dead.length === 0, `Hotkey(s) mapped to a type with no matching action() handler: ${dead.join(', ')}`, {
      likely: 'js/systems/devMode.js action()',
    });
  });

  s.test('no leftover HITBOX/GRAZE debug references remain anywhere in js/ (spec §27 cleanup check)', () => {
    // This scans devMode.js only in this test (the historical cleanup this
    // check guards against); see the docs check below for a repo-wide scan.
    const found = devModeSrc.match(/HITBOX|dev\s*GRAZE|grazeDebug|hitboxDebug/i);
    assert(!found, `Found a possible dead HITBOX/GRAZE debug reference in devMode.js: "${found?.[0]}"`, {
      likely: 'js/systems/devMode.js — a removed debug control may have left a dangling reference',
    });
  });

  for (const doc of ['AGENTS.md', 'CLAUDE.md', 'HANDOFF_LOG.md', 'CHANGELOG.md', 'README.md']) {
    await s.testAsync(`${doc} exists at the project root`, async () => {
      assert(await fileExists(doc), `${doc} is missing from the project root`, { likely: `project root / ${doc}` });
    });
  }

  await s.testAsync('CLAUDE.md points to AGENTS.md (or restates its content) so AI editors find the real instructions', async () => {
    const claudeMd = await readText('CLAUDE.md');
    assert(/AGENTS\.md/.test(claudeMd) || claudeMd.length > 500, 'CLAUDE.md should reference AGENTS.md, or contain substantial instructions of its own', {
      likely: 'CLAUDE.md',
    });
  });

  await s.testAsync('HANDOFF_LOG.md has at least one dated entry with recognizable structure', async () => {
    const log = await readText('HANDOFF_LOG.md');
    assert(log.length > 100, 'HANDOFF_LOG.md looks empty/too short to contain a real entry');
    const hasDateLike = /\d{4}-\d{2}-\d{2}/.test(log) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(log);
    if (!hasDateLike) {
      return warn('HANDOFF_LOG.md does not appear to contain a recognizable date on any entry — confirm the log format is still being followed.');
    }
  });

  await s.testAsync('the test command (npm test) is documented somewhere an AI editor will read (AGENTS.md, CLAUDE.md, or README.md)', async () => {
    const [agents, claude, readme] = await Promise.all([
      readText('AGENTS.md').catch(() => ''),
      readText('CLAUDE.md').catch(() => ''),
      readText('README.md').catch(() => ''),
    ]);
    const mentioned = [agents, claude, readme].some((t) => /npm test/.test(t));
    assert(mentioned, '`npm test` should be documented in at least one of AGENTS.md / CLAUDE.md / README.md so an AI editor knows how to verify its own changes', {
      likely: 'AGENTS.md (or CLAUDE.md/README.md) — add a "before/after changes, run npm test" note',
    });
  });

  return s;
}
