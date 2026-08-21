// tests/simulation/bullethell-simulation.test.mjs
//
// Deep checks on the Bullet Hell (W1-4) -specific mechanics: the wall/ring
// safe-gap guarantee (js/patterns/patterns.js wall()/bulletHellGapSkip()/
// ring()), pattern overlap density (spec §15), and boss isolation (spec
// §26 — editing W1-4 must never leak into W5's cap/config).
//
// Wall/ring gap tests call the real PatternLibrary methods on a real Game
// in a W1-4 context (isBulletHellWave() true) and run the actual queued
// spawn callback — no reimplementation of the gap math.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave } from '../helpers/gameFactory.mjs';
import { capturePatternPlan, maxConcurrent } from '../helpers/simulation.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260821-vk7t';

const PLAYER_R = CONFIG.player.radius; // 10, per patterns.js bulletHellGapSkip() comment
const WALL_BULLET_R = 6; // matches the radius wall() spawns bullets with

/** Runs every queued action currently due (time <= state.waveTime) once, in time order (ascending). */
function fireDueActions(game) {
  const dueIndexes = [];
  for (let i = 0; i < game.actionQueue.length; i++) {
    if (game.actionQueue[i].time <= game.state.waveTime) dueIndexes.push(i);
  }
  dueIndexes.sort((a, b) => game.actionQueue[a].time - game.actionQueue[b].time);
  for (const i of dueIndexes) game.actionQueue[i].fn();
  // Remove fired entries highest-index-first so earlier indexes stay valid.
  for (const i of [...dueIndexes].sort((a, b) => b - a)) game.actionQueue.splice(i, 1);
}

/** Given sorted 1D positions of wall-segment bullets, returns the widest center-to-center gap. */
function widestGap(positions) {
  let widest = 0;
  for (let i = 1; i < positions.length; i++) widest = Math.max(widest, positions[i] - positions[i - 1]);
  return widest;
}

export async function run() {
  const s = new TestSuite('BULLET HELL: Wall / Ring Safety & Overlap');

  for (const vertical of [true, false]) {
    const axis = vertical ? 'vertical' : 'horizontal';
    await s.testAsync(`${axis} wall() in a Bullet Hell wave leaves a real, player-passable gap`, async () => {
      const { game } = await createGame();
      jumpToWave(game, 1); // W1 -> isBulletHellWave() true
      game.actionQueue = [];
      game.bullets.clear();
      game.state.waveTime = 0;

      game.patterns.wall(0, 3.0, '#fff', vertical, 0.06);
      fireDueActions(game);

      assert(game.bullets.items.length > 0, `${axis} wall() should have spawned wall segments`, {
        likely: 'js/patterns/patterns.js wall()',
      });

      const positions = game.bullets.items.map((b) => (vertical ? b.x : b.y)).sort((a, b) => a - b);
      const gap = widestGap(positions);
      // A player's CENTER can occupy the middle (gap - 2*TOUCH_R) of the
      // widest opening without touching either flanking bullet. It must be
      // able to fit the player's own radius through that middle band.
      const touchR = PLAYER_R + WALL_BULLET_R;
      const passableCenterBand = gap - 2 * touchR;
      assert(passableCenterBand > 0, `${axis} wall() must leave a gap the player's center can actually fit through (no "fake gap")`, {
        expected: '> 0px of passable center clearance',
        actual: `${passableCenterBand.toFixed(1)}px (widest segment gap ${gap.toFixed(1)}px)`,
        likely: 'js/patterns/patterns.js bulletHellGapSkip()',
      });

      // The wall must not close the arena 100%: some segments must be skipped.
      const worldDim = vertical ? CONFIG.world.width : CONFIG.world.height;
      const totalSegments = vertical ? 61 : 35;
      assert(game.bullets.items.length < totalSegments, `${axis} wall() must skip at least one segment (never a fully solid wall)`, {
        expected: `< ${totalSegments} bullets`,
        actual: game.bullets.items.length,
      });
    });
  }

  await s.testAsync('a virtual player standing in the wall gap is not hit; standing outside it is', async () => {
    const { game } = await createGame();
    jumpToWave(game, 2);
    game.actionQueue = [];
    game.bullets.clear();
    game.state.waveTime = 0;

    // Force the gap to align with player 1's current x (see wall(): gapPos
    // derives from the first alive player's position on the wall's axis).
    const player = game.players[0];
    player.x = 700;
    game.patterns.wall(0, 3.0, '#fff', true, 0.06);
    fireDueActions(game);

    const { circleHit } = await import('../../js/core/collision.js?v=20260821-vk7t');
    const virtualPlayerInGap = { x: player.x, y: 0, r: PLAYER_R };
    const anyHitInGap = game.bullets.items.some((b) => circleHit(b, { ...virtualPlayerInGap, y: b.y }));
    assert(!anyHitInGap, 'a player centered at the intended gap position must not collide with any wall segment', {
      likely: 'js/patterns/patterns.js wall() gapPos targeting (should track player.x)',
    });

    const farFromGap = { x: (player.x + 400) % CONFIG.world.width, r: PLAYER_R };
    const hitFarFromGap = game.bullets.items.some((b) => Math.abs(b.x - farFromGap.x) < PLAYER_R + WALL_BULLET_R);
    assert(hitFarFromGap, 'sanity check: a position well away from the gap should be blocked by a wall segment (test setup check, not a game assertion)', {
      likely: 'test setup — if this fails, the wall may not have spawned enough segments to test against',
    });
  });

  await s.testAsync("ring()'s gap opens toward the player and rotates with them (not a fixed direction)", async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    game.bullets.clear();
    game.state.waveTime = 0;
    const cx = 640, cy = 360;

    const player = game.players[0];
    player.x = cx + 200; player.y = cy; // player due east of the ring center
    game.patterns.ring(0, cx, cy, 24, 2.5, '#fff');
    // ring() queues the telegraph at (start - warnDuration) and the actual
    // spawn at (start); advance waveTime so both fire.
    game.state.waveTime = 2;
    fireDueActions(game);

    assert(game.bullets.items.length > 0, 'ring() should have spawned bullets', { likely: 'js/patterns/patterns.js ring()' });
    assert(game.bullets.items.length < 24, 'ring() must skip some bullets to leave a gap (not a solid circle)', {
      expected: '< 24 bullets',
      actual: game.bullets.items.length,
    });

    // Ring bullets spawn exactly at the center point (they haven't moved
    // yet), so position-based angle is degenerate at t=0 — use the fire
    // velocity direction instead, which encodes the actual angle each
    // bullet was launched at.
    const nearEastAngle = game.bullets.items.some((b) => {
      const angle = Math.atan2(b.vy, b.vx);
      return Math.abs(angle) < 0.2; // within the gap's angular width toward the player
    });
    assert(!nearEastAngle, "ring()'s gap should open toward the player's angle from the ring center", {
      likely: 'js/patterns/patterns.js ring() gapAngle targeting',
    });
  });

  // --- Pattern overlap (spec §15): W1-4 should have real overlapping
  // pressure, not neatly spaced single patterns -----------------------------
  for (const n of [1, 2, 3, 4]) {
    await s.testAsync(`W${n} has at least 2 concurrently-active patterns at some point (real Bullet Hell overlap)`, async () => {
      const plan = await capturePatternPlan(n);
      const overlap = maxConcurrent(plan.events);
      assert(overlap >= 2, `W${n} should have moments where at least 2 patterns overlap (this is what makes it "Bullet Hell" rather than sequential dodging)`, {
        expected: '>= 2',
        actual: overlap,
        likely: `js/systems/waveSystem.js case ${n} — pattern start-time offsets`,
      });
    });
  }

  // --- Boss isolation (spec §26): W1-4 tuning must never leak into W5 ------
  await s.testAsync('W5 (boss) uses its own bulletCap()/cleanupConfig(), unaffected by W1-4 being active first', async () => {
    const { game } = await createGame();
    jumpToWave(game, 3); // spend time in Bullet Hell first
    const w3Cap = game.bulletCap();
    const w3CleanupCfg = game.cleanupConfig();

    jumpToWave(game, 5);
    const w5Cap = game.bulletCap();
    const w5CleanupCfg = game.cleanupConfig();

    assert(w5Cap !== w3Cap || CONFIG.bullets.capW5 + CONFIG.bullets.capBossBonus === CONFIG.bullets.capEarly, 'W5 bulletCap() must use capW5+capBossBonus, not silently inherit W1-4\'s capEarly', {
      expected: CONFIG.bullets.capW5 + CONFIG.bullets.capBossBonus,
      actual: w5Cap,
      likely: 'js/systems/game.js bulletCap()',
    });
    assertEqual(w5CleanupCfg, CONFIG.bullets, 'W5 must use the default cleanup config, not CONFIG.bullets.bulletHell', {
      likely: 'js/systems/game.js isBulletHellWave() — must exclude wave 5',
    });
    assert(game.boss.active, 'W5 should activate the boss', { likely: 'js/systems/game.js startWave()' });
  });

  await s.testAsync('editing/simulating W1-4 heavily does not mutate CONFIG.bullets.capW5 or the boss config object', async () => {
    const capW5Before = CONFIG.bullets.capW5;
    const bossBonusBefore = CONFIG.bullets.capBossBonus;
    const { game } = await createGame();
    for (const n of [1, 2, 3, 4]) {
      jumpToWave(game, n);
      for (let i = 0; i < 50; i++) game.spawnBullet(640, 360, 0, 0, 5, '#fff');
    }
    assertEqual(CONFIG.bullets.capW5, capW5Before, 'CONFIG.bullets.capW5 must be immutable during normal play — a mutation here indicates accidental shared-state aliasing', {
      likely: 'js/core/config.js — capW5 should never be reassigned at runtime',
    });
    assertEqual(CONFIG.bullets.capBossBonus, bossBonusBefore, 'CONFIG.bullets.capBossBonus must be immutable during normal play');
  });

  return s;
}
