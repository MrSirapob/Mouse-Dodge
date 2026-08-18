// Temporary verification script for the Bullet Cap / Wall Gap fix.
// Run with: node scripts/verify-bullethell-fix.mjs
//
// Imports the REAL game modules (not a re-implementation) so this checks
// the shipped behavior, not a copy of the math. Not wired into the game or
// any build step — delete freely once you're done trusting the fix.

import { CONFIG } from '../js/core/config.js';
import { PatternLibrary } from '../js/patterns/patterns.js';

let failures = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${label}`);
  if (!cond) failures++;
}

// ---------------------------------------------------------------------
// 1) Bullet Cap: W1-4 == capEarly (420), W5 == capW5 (pre-Bullet-Hell,
//    260), W6+ untouched.
// ---------------------------------------------------------------------
console.log('\n=== Bullet Cap ===');

function makeFakeGame(wave) {
  const game = {
    state: { wave },
    isBossWave(n) { return n % 5 === 0; },
  };
  // bulletCap() only reads this.state.wave / CONFIG / isBossWave — call the
  // real Game.prototype method unbound against our minimal fake so we're
  // testing the actual shipped logic.
  return game;
}

// Pull the real method off Game without needing the DOM-heavy constructor.
import fs from 'node:fs';
import vm from 'node:vm';
const gameSrc = fs.readFileSync(new URL('../js/systems/game.js', import.meta.url), 'utf8');
const bulletCapMatch = gameSrc.match(/bulletCap\(\)\s*\{[\s\S]*?\n  \}/);
if (!bulletCapMatch) throw new Error('Could not locate bulletCap() in game.js for testing');
// eslint-disable-next-line no-new-func
const bulletCapFn = new Function('CONFIG', `return function bulletCap() ${bulletCapMatch[0].replace(/^bulletCap\(\)\s*/, '')}`)(CONFIG);

for (let n = 1; n <= 6; n++) {
  const game = makeFakeGame(n);
  const cap = bulletCapFn.call(game);
  if (n >= 1 && n <= 4) {
    check(`W${n} cap === capEarly (420)`, cap === CONFIG.bullets.capEarly && cap === 420);
  } else if (n === 5) {
    check(`W5 cap === capW5 + boss bonus (pre-Bullet-Hell value)`, cap === CONFIG.bullets.capW5 + CONFIG.bullets.capBossBonus);
    check(`W5 cap is NOT capEarly (420)`, cap !== 420);
  } else if (n === 6) {
    check(`W6 cap === capMid (untouched)`, cap === CONFIG.bullets.capMid);
  }
}

// ---------------------------------------------------------------------
// 2) Wall Gap: visible gap === collision-passable gap, W1-4 only.
//    W5+/W6+ must use the exact original (unmodified) conversion.
// ---------------------------------------------------------------------
console.log('\n=== Wall Gap (W1-4 Bullet Hell) ===');

const PLAYER_R = 10;
const WALL_BULLET_R = 6;
const TOUCH_R = PLAYER_R + WALL_BULLET_R; // matches collision.js circleHit (a.r+b.r)

function spawnAndCollect(vertical, gap, wave, playerPos) {
  const spawned = [];
  const game = {
    isBulletHellWave() { return wave >= 1 && wave <= 4; },
    activePlayers() {
      return [{ x: vertical ? playerPos * 1280 : 640, y: vertical ? 360 : playerPos * 720, isAlive: () => true }];
    },
    spawnBullet(x, y, vx, vy, r, color) {
      spawned.push(vertical ? x : y);
    },
    queue(time, fn) { fn(); }, // run immediately for the test
  };
  const patterns = new PatternLibrary(game);
  patterns.wall(0, 3.0, '#fff', vertical, gap);
  spawned.sort((a, b) => a - b);
  return spawned;
}

// player-center-passable width of the widest gap between consecutive
// spawned bullets, and whether the gap "looks" the same as it collides.
function widestGapInfo(spawnedPositions) {
  let widest = 0;
  let leftAt = null, rightAt = null;
  for (let i = 1; i < spawnedPositions.length; i++) {
    const d = spawnedPositions[i] - spawnedPositions[i - 1];
    if (d > widest) { widest = d; leftAt = spawnedPositions[i - 1]; rightAt = spawnedPositions[i]; }
  }
  return { centerGap: widest, passable: widest - 2 * TOUCH_R, leftAt, rightAt };
}

const testGaps = [0.045, 0.05, 0.06, 0.07];
const testPositions = [0.08, 0.2, 0.37, 0.5, 0.63, 0.81, 0.92]; // varied grid alignment
let observedPassables = [];

for (const vertical of [true, false]) {
  for (const gap of testGaps) {
    const passablesForGap = [];
    for (const pos of testPositions) {
      const spawned = spawnAndCollect(vertical, gap, /*wave*/ 2, pos);
      const info = widestGapInfo(spawned);
      passablesForGap.push(info.passable);
      observedPassables.push(info.passable);
    }
    const min = Math.min(...passablesForGap);
    const max = Math.max(...passablesForGap);
    // The core bug fix: the passable width must be POSITIVE (a real, not
    // fake, opening) and must not vary wildly with gapPos alignment to the
    // segment grid (previously it swung ~11px-53px for the same gap value).
    check(
      `${vertical ? 'vertical' : 'horizontal'} gap=${gap}: passable > 0 for all positions (min=${min.toFixed(1)}px)`,
      min > 0
    );
    check(
      `${vertical ? 'vertical' : 'horizontal'} gap=${gap}: passable width consistent across gapPos (min=${min.toFixed(1)} max=${max.toFixed(1)})`,
      max - min < 1 // exact same k every time -> identical corridor
    );
  }
}

check(
  'All observed passable widths stay in a sane band (no runaway widening, no near-zero fake gaps)',
  observedPassables.every(p => p >= 25 && p <= 60)
);

// ---------------------------------------------------------------------
// 3) W5+/W6+ must be byte-for-byte the ORIGINAL conversion (untouched).
// ---------------------------------------------------------------------
console.log('\n=== Wall Gap (W5+/W6+ must be unchanged) ===');

function originalConversionCorridor(vertical, gap, playerPos) {
  const segments = vertical ? 61 : 35;
  const worldDim = vertical ? 1280 : 720;
  const gapSize = gap != null ? Math.max(2 / segments, gap * segments) : 2;
  const gapPos = Math.max(0.08, Math.min(0.92, playerPos));
  const kept = [];
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    if (Math.abs(t - gapPos) < gapSize / 2 / segments) continue;
    kept.push(t * worldDim);
  }
  return kept;
}

for (const wave of [5, 6, 11]) {
  for (const vertical of [true, false]) {
    const gap = 0.05;
    const pos = 0.5;
    const spawned = spawnAndCollect(vertical, gap, wave, pos);
    const expected = originalConversionCorridor(vertical, gap, pos);
    const same = spawned.length === expected.length && spawned.every((v, i) => Math.abs(v - expected[i]) < 1e-9);
    check(`W${wave} ${vertical ? 'vertical' : 'horizontal'} wall(): identical to original conversion`, same);
  }
}

// ---------------------------------------------------------------------
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
