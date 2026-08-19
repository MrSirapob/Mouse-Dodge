// tests/helpers/simulation.mjs
//
// Deterministic, browser-free simulation of a single wave. Drives the real
// Game.update(dt) loop (js/systems/game.js) at a fixed timestep with a
// seeded Math.random, and records metrics about what actually happened —
// no reimplementation of spawn/collision/cleanup logic.
//
// Used by tests/simulation/*.test.mjs for density/regression checks, and by
// scripts that regenerate tests/fixtures/balance-baseline.json.

import { createGame, jumpToWave } from './gameFactory.mjs';
import { withSeededRandomAsync } from './seededRandom.mjs';

const FIXED_DT = 1 / 60; // 60fps, matches the game's real frame-timing units (see bullet.js comments on "pixels per frame at 60fps")

// Hard safety guards (see AGENTS.md / spec §33 "Performance Safety") so a
// runaway-spawn regression fails fast instead of hanging `npm test`.
const MAX_TICKS = 60 * 60 * 5; // 5 simulated minutes, far beyond any real wave
const MAX_ACTIVE_BULLETS_SAFETY = 20000;

/**
 * Simulates wave `n` for up to `durationMs` of simulated time (default: the
 * wave's own configured duration), starting from a fresh game. Stops early
 * if the wave naturally clears/transitions, so metrics stay scoped to wave
 * `n` itself.
 *
 * Returns:
 *   {
 *     wave, cap, ticks, simulatedSeconds,
 *     spawnAttempts, spawned, dropped,     // dropped = attempts capped/refused
 *     cleanupRemoved,                       // bullets removed by the density cleaner
 *     activePeak, activeAverage,
 *     maxDensity,                           // activePeak / cap
 *   }
 */
export async function simulateWave(n, durationMs = null, { seed = 1000 + n, mode = 'solo' } = {}) {
  return withSeededRandomAsync(seed, async () => {
    const { game } = await createGame();
    jumpToWave(game, n, { mode });

    const cap = game.bulletCap();
    const targetMs = durationMs ?? game.state.waveDuration * 1000;
    const maxTicks = Math.min(MAX_TICKS, Math.ceil((targetMs / 1000) / FIXED_DT) + 60 * 30); // + up to 30s drain buffer

    // Instrument the real methods (not reimplementations) to count events.
    const originalSpawnBullet = game.spawnBullet.bind(game);
    let spawnAttempts = 0;
    let spawned = 0;
    game.spawnBullet = (...args) => {
      spawnAttempts++;
      const ok = originalSpawnBullet(...args);
      if (ok) spawned++;
      return ok;
    };

    const originalCleanup = game.cleanupBulletsForCapacity.bind(game);
    let cleanupRemoved = 0;
    game.cleanupBulletsForCapacity = (...args) => {
      const removed = originalCleanup(...args);
      cleanupRemoved += removed;
      return removed;
    };

    let activePeak = 0;
    let activeSum = 0;
    let ticks = 0;

    for (; ticks < maxTicks; ticks++) {
      game.update(FIXED_DT);

      const active = game.bullets.items.length;
      if (active > activePeak) activePeak = active;
      activeSum += active;

      if (active > MAX_ACTIVE_BULLETS_SAFETY) {
        throw new Error(
          `Projectile runaway detected during W${n} simulation: active=${active}, safety limit=${MAX_ACTIVE_BULLETS_SAFETY}. Likely cause: pattern scheduling / cleanup (see Game.spawnBullet / cleanupBulletsForCapacity).`
        );
      }

      const elapsedMs = (ticks + 1) * FIXED_DT * 1000;
      if (elapsedMs >= targetMs && game.state.wavePhase !== 'active') break;
      if (game.state.wave !== n) break; // wave transitioned onward — stop, metrics stay scoped to wave n
    }

    if (ticks >= MAX_TICKS - 1) {
      throw new Error(`W${n} simulation hit the hard tick safety limit (${MAX_TICKS}) without the wave ever clearing.`);
    }

    return {
      wave: n,
      cap,
      ticks,
      simulatedSeconds: ticks * FIXED_DT,
      spawnAttempts,
      spawned,
      dropped: spawnAttempts - spawned,
      cleanupRemoved,
      activePeak,
      activeAverage: ticks > 0 ? activeSum / ticks : 0,
      maxDensity: cap > 0 ? activePeak / cap : 0,
    };
  });
}

/**
 * Records which top-level PatternLibrary methods a wave's build() call
 * invokes, and a rough [start, start+duration] time window for each call —
 * used for pattern-coverage and pattern-overlap checks. This inspects the
 * real WaveSystem.build()/buildBoss() + PatternLibrary wiring; it does NOT
 * execute the queued spawn callbacks (those depend on live Math.random /
 * player position), so it is fully deterministic with no seeding needed.
 *
 * Duration is a heuristic derived from each pattern's own known call shape
 * (see comments inline) — good enough to detect *whether* patterns overlap,
 * not an exact hitbox-level timeline.
 */
export async function capturePatternPlan(n) {
  const { game } = await createGame();
  game.reset('solo', 'pulse', 'pulse');

  const events = [];
  const lib = game.patterns;
  const durationFor = {
    aimed: (args) => (args[1] - 1) * (args[2] ?? 0.3),
    ring: () => 0.95, // telegraph window; ring() itself fires instantly at `start`
    wall: () => 0.1,
    spiral: (args) => args[1] ?? 1, // args[1] is the real (non-inflated) duration
    cross: (args) => (args[1] - 1) * 0.15,
    laserBarrage: (args) => (args[1] - 1) * (args[2] ?? 0.9) + 0.95,
    homing: (args) => (args[1] - 1) * (args[2] ?? 0.45),
    splitter: (args) => (args[1] - 1) * (args[2] ?? 0.8),
    bouncer: (args) => (args[1] - 1) * (args[2] ?? 0.72),
    machineGunTop: (args) => (args[1] - 1) * (args[2] ?? 0.045),
    diagonalRain: (args) => (args[1] - 1) * (args[2] ?? 0.1),
    crossfire: (args) => (args[1] - 1) * (args[2] ?? 0.8),
    delayedBurst: (args) => (args[1] - 1) * (args[2] ?? 0.7) + (args[3] ?? 0),
    movingSweep: (args) => (args[1] - 1) * (args[2] ?? 1),
    ricochetField: (args) => (args[1] - 1) * (args[2] ?? 0.08),
    sineRain: (args) => (args[1] - 1) * (args[2] ?? 0.15),
    accelerateRain: (args) => (args[1] - 1) * (args[2] ?? 0.17),
    stopAndGo: (args) => (args[1] - 1) * (args[2] ?? 0.2),
    reverseRain: (args) => (args[1] - 1) * (args[2] ?? 0.17),
    orbitBurst: (args) => (args[1] - 1) * (args[2] ?? 0.12),
    curvingSplit: (args) => (args[1] - 1) * (args[2] ?? 0.4),
    explodeNearPlayer: (args) => (args[1] - 1) * (args[2] ?? 0.3),
    bossPerimeterCrossfire: (args) => args[1] ?? 3,
    bossRing: () => 1.1,
    bossSpiral: (args) => args[1] ?? 1,
    bossAimed: (args) => (args[1] - 1) * (args[2] ?? 0.2),
    bossHoming: (args) => (args[1] - 1) * (args[2] ?? 0.3),
  };

  const toWrap = Object.keys(durationFor);
  const originals = {};
  for (const name of toWrap) {
    if (typeof lib[name] !== 'function') continue;
    originals[name] = lib[name].bind(lib);
    lib[name] = (...args) => {
      const start = args[0];
      const duration = Math.max(0, durationFor[name](args) || 0);
      events.push({ name, start, end: start + duration, args });
      return originals[name](...args);
    };
  }

  const isBoss = game.isBossWave(n);
  const label = isBoss ? game.waveSystem.buildBoss(n) : game.waveSystem.build(n);

  for (const name of toWrap) {
    if (originals[name]) lib[name] = originals[name];
  }

  return { wave: n, isBoss, label, events, patterns: [...new Set(events.map((e) => e.name))].sort() };
}

/** Sweep-line max overlap count for a set of [start,end] events. */
export function maxConcurrent(events) {
  const points = [];
  for (const e of events) {
    points.push([e.start, 1]);
    points.push([e.end, -1]);
  }
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, max = 0;
  for (const [, delta] of points) {
    cur += delta;
    if (cur > max) max = cur;
  }
  return max;
}
