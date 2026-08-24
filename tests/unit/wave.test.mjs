// tests/unit/wave.test.mjs
//
// Static structure checks for WaveSystem (js/systems/waveSystem.js) and the
// PatternLibrary contract (js/patterns/patterns.js). These call the real
// build()/buildBoss() methods directly — no bullet simulation needed here,
// since build() only *schedules* future spawns (see patterns.js header
// comment); it's fully synchronous and deterministic on its own.

import { TestSuite, assert, assertNoNaN, assertEqual, warn } from '../helpers/assertions.mjs';
import { createGame } from '../helpers/gameFactory.mjs';
import { capturePatternPlan } from '../helpers/simulation.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260824-oi05';
import { PatternLibrary } from '../../js/patterns/patterns.js?v=20260824-oi05';

// Every pattern method in js/systems/waveSystem.js's PATTERN GUIDE header
// comment (the canonical list this project documents for AI editors),
// mapped to the real PatternLibrary method it wraps. If waveSystem.js's own
// header comment changes, update this list to match — it is intentionally
// read from the doc comment's contract, not invented independently.
const DOCUMENTED_NORMAL_PATTERNS = ['aimed', 'ring', 'wall', 'spiral', 'cross', 'laserBarrage', 'homing', 'splitter', 'bouncer'];
const DOCUMENTED_BOSS_PATTERNS = ['bossAimed', 'bossRing', 'bossSpiral', 'bossHoming'];

export async function run() {
  await ready; // ensure warmup() has populated createGameSync._cache before any test below uses it
  const s = new TestSuite('STRUCTURE: Wave & Pattern Registry');

  s.test('every documented normal pattern exists as a PatternLibrary method', () => {
    const { game } = createGameSync();
    for (const name of DOCUMENTED_NORMAL_PATTERNS) {
      assert(typeof game.patterns[name] === 'function', `PatternLibrary.${name}() is missing`, {
        likely: 'js/patterns/patterns.js',
        expected: `${name}() to be a function`,
        actual: typeof game.patterns[name],
      });
    }
  });

  s.test('every documented boss pattern exists as a PatternLibrary method', () => {
    const { game } = createGameSync();
    for (const name of DOCUMENTED_BOSS_PATTERNS) {
      assert(typeof game.patterns[name] === 'function', `PatternLibrary.${name}() is missing`, {
        likely: 'js/patterns/patterns.js',
      });
    }
  });

  s.test('W1-W4 all have a build() definition (Bullet Hell tier)', () => {
    const { game } = createGameSync();
    for (let n = 1; n <= 4; n++) {
      const label = game.waveSystem.build(n);
      assert(typeof label === 'string' && label.length > 0, `WaveSystem.build(${n}) returned no label`, {
        likely: 'js/systems/waveSystem.js switch(n) case ' + n,
      });
    }
  });

  s.test('W5, W10, W15 all have a boss build() definition', () => {
    const { game } = createGameSync();
    for (const n of [5, 10, 15]) {
      assert(game.isBossWave(n), `Wave ${n} should be classified as a boss wave (n % 5 === 0)`);
      const label = game.waveSystem.buildBoss(n);
      assert(typeof label === 'string' && label.length > 0, `WaveSystem.buildBoss(${n}) returned no label`, {
        likely: 'js/systems/waveSystem.js buildBoss()',
      });
    }
  });

  s.test('W6+ (non-Bullet-Hell, non-listed) still has a build() definition, including the default case', () => {
    const { game } = createGameSync();
    const emptyLabelWaves = [];
    for (const n of [6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 21, 37]) {
      if (game.isBossWave(n)) continue;
      const label = game.waveSystem.build(n);
      assert(typeof label === 'string', `WaveSystem.build(${n}) must return a string label`, {
        expected: 'string',
        actual: typeof label,
        likely: 'js/systems/waveSystem.js switch(n) default case',
      });
      if (label.length === 0) emptyLabelWaves.push(n);
    }
    if (emptyLabelWaves.length) {
      // Structurally fine (build() ran without throwing and every pattern
      // still queued), but these waves show no banner subtitle in-game
      // because their case block calls PatternLibrary methods directly
      // (this.p.xxx) instead of the wrapped local closures that call
      // labels.add(...) — see waveSystem.js build(). Might be intentional
      // for these "new pattern set" waves; flagged for a human/AI to confirm.
      return warn(`Wave(s) ${emptyLabelWaves.join(', ')} produce an empty banner subtitle — confirm intentional (see js/systems/waveSystem.js build(), the labels Set).`);
    }
  });

  s.test('build() does not throw for a large arbitrary wave number (default case is safe indefinitely)', () => {
    const { game } = createGameSync();
    for (const n of [50, 100, 999]) {
      if (game.isBossWave(n)) continue;
      game.waveSystem.build(n); // throws on failure -> test FAILs
    }
  });

  s.test('WaveSystem.duration(n) returns a positive number for every wave 1-20', () => {
    const { game } = createGameSync();
    for (let n = 1; n <= 20; n++) {
      const d = game.waveSystem.duration(n);
      assertNoNaN(d, `WaveSystem.duration(${n})`);
      assert(d > 0, `WaveSystem.duration(${n}) must be > 0`, { actual: d });
    }
  });

  s.test('pattern-method argument sanity: aimed()/ring()/wall()/spiral()/cross() never queue a NaN speed', () => {
    const events = [];
    const game = makeQueueCapturingGame(events);
    const patterns = new PatternLibrary(game);
    patterns.aimed(0, 5, 0.2, 2.5, '#fff');
    patterns.ring(0, 640, 360, 8, 2.5, '#fff');
    patterns.wall(0, 3.0, '#fff', true, 0.06);
    patterns.spiral(0, 2, 3, 2.0, '#fff');
    patterns.cross(0, 4, 2.5, '#fff');
    for (const e of events) e.fn(); // run every queued spawn callback now
    assert(game.spawnedBullets.length > 0, 'Expected at least one bullet to have been spawned by the smoke patterns');
    for (const b of game.spawnedBullets) {
      assertNoNaN(b.vx, `spawned bullet vx (pattern smoke test)`);
      assertNoNaN(b.vy, `spawned bullet vy (pattern smoke test)`);
      assertNoNaN(b.x, `spawned bullet x`);
      assertNoNaN(b.y, `spawned bullet y`);
      assertNoNaN(b.r, `spawned bullet radius`);
    }
  });

  // --- Pattern coverage baseline (spec §14: catch e.g. "Splitter silently
  // removed from W1") -----------------------------------------------------
  const baseline = await readBaselineJson();
  for (let n = 1; n <= 4; n++) {
    await s.testAsync(`W${n} pattern coverage matches the recorded baseline`, async () => {
      const plan = await capturePatternPlan(n);
      const expected = baseline.waves[`wave${n}`]?.patterns ?? [];
      const actual = plan.patterns;
      const missing = expected.filter((p) => !actual.includes(p));
      const added = actual.filter((p) => !expected.includes(p));
      assert(missing.length === 0 && added.length === 0,
        `W${n} pattern set changed vs baseline`,
        {
          expected: expected.join(', '),
          actual: actual.join(', '),
          likely: missing.length
            ? `js/systems/waveSystem.js case ${n} — a pattern call (${missing.join(', ')}) may have been removed`
            : `js/systems/waveSystem.js case ${n} — a new pattern (${added.join(', ')}) was added; update tests/fixtures/balance-baseline.json intentionally (see tests/README.md "Balance Baseline Policy")`,
        }
      );
    });
  }

  return s;
}

function createGameSync() {
  // Everything build()/buildBoss() touch is synchronous DOM-free logic, but
  // createGame() itself is async (dynamic import). Tests in this file that
  // need it synchronously pre-warm a module-level cache.
  if (!createGameSync._cache) throw new Error('createGameSync() called before warmup(); see run()');
  return createGameSync._cache;
}

async function warmup() {
  createGameSync._cache = await createGame();
}

async function readBaselineJson() {
  const fs = await import('node:fs/promises');
  const url = new URL('../fixtures/balance-baseline.json', import.meta.url);
  const text = await fs.readFile(url, 'utf8');
  return JSON.parse(text);
}

/** Minimal game-like object for isolated PatternLibrary smoke tests (records queued spawns). */
function makeQueueCapturingGame(events) {
  const spawnedBullets = [];
  return {
    spawnedBullets,
    state: { waveTime: 0 },
    ringWarnings: [],
    lasers: [],
    boss: { x: 640, y: 360 },
    isBulletHellWave() { return false; },
    activePlayers() { return [{ x: 640, y: 360, isAlive: () => true }]; },
    dangerAssistDelay() { return false; },
    queue(time, fn) { events.push({ time, fn }); },
    spawnBullet(x, y, vx, vy, r, color) {
      spawnedBullets.push({ x, y, vx, vy, r, color });
      return true;
    },
    renderer: null,
    bullets: { items: [], spawn() {} },
  };
}

// Ensure warmup runs before the exported run() uses createGameSync().
const _warmupPromise = warmup();
export const ready = _warmupPromise;
