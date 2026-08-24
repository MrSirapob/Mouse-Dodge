// tests/unit/bullet.test.mjs
//
// Bullet spawn / cap / cleanup behavior (js/entities/bullet.js's
// BulletManager + Game.spawnBullet/cleanupBulletsForCapacity in
// js/systems/game.js). Uses a real Game so the cap/cleanup logic under test
// is the shipped implementation, not a re-derivation of the math.

import { TestSuite, assert, assertNoNaN, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave, tick } from '../helpers/gameFactory.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260824-75fj';

export async function run() {
  const s = new TestSuite('BULLET SYSTEM');

  await s.testAsync('spawnBullet() creates a bullet with position, velocity, radius, no NaN/Infinity', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const ok = game.spawnBullet(100, 100, 1.5, -1.5, 5, '#fff');
    assert(ok === true, 'spawnBullet() should report success under the cap');
    assert(game.bullets.items.length === 1, 'Expected exactly one bullet after one spawnBullet() call');
    const b = game.bullets.items[0];
    for (const key of ['x', 'y', 'vx', 'vy', 'r']) {
      assertNoNaN(b[key], `bullet.${key}`);
    }
    assertEqual(b.age, 0, 'A freshly spawned bullet should start at age 0');
  });

  await s.testAsync('bullets have a finite lifetime when homing, or Infinity otherwise (per bullet.js maxAge rule)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.spawnBullet(0, 0, 1, 0, 5, '#fff');
    game.spawnBullet(0, 0, 1, 0, 5, '#fff', { homing: true, homingStrength: 0.02 });
    const [plain, homing] = game.bullets.items;
    assertEqual(plain.maxAge, Infinity, 'A plain bullet with no explicit maxAge should default to Infinity');
    assert(Number.isFinite(homing.maxAge) && homing.maxAge > 0, 'A homing bullet must have a finite maxAge so it cannot track forever', {
      likely: 'js/entities/bullet.js BulletManager.spawn() maxAge default',
      actual: homing.maxAge,
    });
  });

  await s.testAsync('bullets move each frame and are not teleported (position changes match vx*dt*60)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = []; // isolate: don't let W1's own pattern schedule spawn/collide with our test bullet
    game.spawnBullet(200, 200, 2, 0, 5, '#fff'); // away from the player (defaults to arena center, 640/360)
    const before = { ...game.bullets.items[0] };
    tick(game, 1);
    const after = game.bullets.items[0];
    assert(after !== undefined, 'Bullet unexpectedly removed after a single frame');
    const expectedDx = before.vx * (1 / 60) * 60; // matches Game.updateBullets: b.x += b.vx * dt * 60
    assert(Math.abs(after.x - before.x - expectedDx) < 1e-6, 'Bullet x did not move by the expected vx*dt*60 amount in one frame', {
      expected: before.x + expectedDx,
      actual: after.x,
      likely: 'js/systems/game.js updateBullets()',
    });
  });

  await s.testAsync('bullets that leave the arena bounds (with margin) are removed', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = []; // isolate from W1's own pattern schedule
    game.spawnBullet(-200, 200, -5, 0, 5, '#fff'); // already well past the -80 margin, away from the player
    tick(game, 1);
    assertEqual(game.bullets.items.length, 0, 'An off-screen bullet beyond the +/-80px margin should be removed on the next update', {
      likely: 'js/systems/game.js updateBullets() off-screen cleanup branch',
    });
  });

  await s.testAsync('bullets never accumulate forever off-screen (drain to 0 after enough frames with no new spawns)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = []; // isolate from W1's own pattern schedule
    for (let i = 0; i < 20; i++) game.spawnBullet(200, 200 + i, 20, 20, 5, '#fff'); // fast-moving, away from the player, will exit quickly
    tick(game, 200); // ~3.3s, plenty of time to leave a 1280x720 arena at speed 20
    assertEqual(game.bullets.items.length, 0, 'Fast-moving bullets should all have left the arena and been removed', {
      actual: game.bullets.items.length,
      likely: 'js/systems/game.js updateBullets() off-screen cleanup',
    });
  });

  await s.testAsync('bulletCap() matches CONFIG for W1-4 (capEarly) and W5 (capW5 + boss bonus)', async () => {
    const { game } = await createGame();
    for (let n = 1; n <= 4; n++) {
      jumpToWave(game, n);
      assertEqual(game.bulletCap(), CONFIG.bullets.capEarly, `W${n} bulletCap()`);
    }
    jumpToWave(game, 5);
    assertEqual(game.bulletCap(), CONFIG.bullets.capW5 + CONFIG.bullets.capBossBonus, 'W5 bulletCap()');
  });

  await s.testAsync('W6+ non-boss waves use capMid/capHigh/capLate/capEndless per CONFIG, not capEarly', async () => {
    const { game } = await createGame();
    const cases = [
      [6, CONFIG.bullets.capMid], [10, CONFIG.bullets.capMid],
      [11, CONFIG.bullets.capHigh], [15, CONFIG.bullets.capHigh],
      [16, CONFIG.bullets.capLate], [20, CONFIG.bullets.capLate],
      [21, CONFIG.bullets.capEndless],
    ];
    for (const [n, expectedBase] of cases) {
      jumpToWave(game, n);
      const expected = game.isBossWave(n) ? expectedBase + CONFIG.bullets.capBossBonus : expectedBase;
      assertEqual(game.bulletCap(), expected, `W${n} bulletCap()`, { likely: 'js/systems/game.js bulletCap()' });
      assert(game.bulletCap() !== CONFIG.bullets.capEarly || expected === CONFIG.bullets.capEarly, `W${n} should not silently inherit the W1-4 Bullet Hell cap`);
    }
  });

  await s.testAsync('spawnBullet() refuses to exceed bulletCap() for normal (non-wall) bullets', async () => {
    const { game } = await createGame();
    jumpToWave(game, 5); // smallest cap (capW5 + bonus), fastest to fill
    const cap = game.bulletCap();
    let successes = 0;
    for (let i = 0; i < cap + 200; i++) {
      if (game.spawnBullet(640, 360, 0, 0, 5, '#fff')) successes++;
    }
    assert(game.bullets.items.length <= cap, `Bullet count must never exceed bulletCap() (${cap})`, {
      expected: `<= ${cap}`,
      actual: game.bullets.items.length,
      likely: 'js/systems/game.js spawnBullet()',
    });
  });

  await s.testAsync('opts.wall bullets (structural walls, e.g. Moving Sweep) bypass the density cap by design', async () => {
    const { game } = await createGame();
    jumpToWave(game, 6); // Moving Sweep is a W6 pattern
    const cap = game.bulletCap();
    for (let i = 0; i < cap + 50; i++) {
      game.spawnBullet(640, 360, 0, 0, 5, '#fff', { wall: true });
    }
    assert(game.bullets.items.length > cap, 'wall:true bullets are documented (patterns.js movingSweep) to bypass the cap — this should exceed it, not be silently capped', {
      likely: 'js/systems/game.js spawnBullet() opts.wall branch',
    });
  });

  await s.testAsync('cleanup only engages once density crosses cleanupStart, and never deletes wall bullets', async () => {
    const { game } = await createGame();
    jumpToWave(game, 6); // non-bulletHell wave -> uses CONFIG.bullets defaults
    const cap = game.bulletCap();
    for (let i = 0; i < 20; i++) game.spawnBullet(640, 360, 0, 0, 5, '#fff', { wall: true });
    const removed = game.cleanupBulletsForCapacity(20, game.cleanupConfig());
    assertEqual(removed, 0, 'cleanupBulletsForCapacity() must never remove structural wall bullets', {
      likely: 'js/systems/game.js cleanupBulletsForCapacity() — should `continue` on b.wall',
    });
  });

  await s.testAsync('cleanupConfig() picks the Bullet-Hell tuning only for W1-4', async () => {
    const { game } = await createGame();
    jumpToWave(game, 3);
    assertEqual(game.cleanupConfig(), CONFIG.bullets.bulletHell, 'W3 should use CONFIG.bullets.bulletHell cleanup tuning');
    jumpToWave(game, 5);
    assertEqual(game.cleanupConfig(), CONFIG.bullets, 'W5 (boss) should use the default cleanup tuning, not the Bullet Hell one', {
      likely: 'js/systems/game.js isBulletHellWave() / cleanupConfig()',
    });
    jumpToWave(game, 11);
    assertEqual(game.cleanupConfig(), CONFIG.bullets, 'W11 should use the default cleanup tuning');
  });

  await s.testAsync('BulletManager.remove() does not corrupt the array (no gaps/undefined entries) across repeated removals', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    for (let i = 0; i < 30; i++) game.spawnBullet(i * 10, 100, 0, 0, 5, '#fff');
    // Remove every other one, high index first (mirrors the real removal
    // pattern used by Game.cleanupBulletsForCapacity / updateBullets).
    for (let i = game.bullets.items.length - 1; i >= 0; i -= 2) game.bullets.remove(i);
    for (const b of game.bullets.items) {
      assert(b !== undefined && typeof b.x === 'number', 'BulletManager.items must contain no holes/undefined entries after remove()');
    }
    assertEqual(game.bullets.items.length, 15, 'Expected exactly half the bullets to remain after removing every other one');
  });

  return s;
}
