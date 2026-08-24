// tests/unit/player.test.mjs
//
// Direct unit tests for js/entities/player.js (no Game needed — Player has
// no DOM/game dependencies beyond CONFIG).

import { TestSuite, assert, assertNoNaN, assertEqual, assertClose } from '../helpers/assertions.mjs';
import { Player } from '../../js/entities/player.js?v=20260824-gaom';
import { CONFIG } from '../../js/core/config.js?v=20260824-gaom';

export function run() {
  const s = new TestSuite('LOGIC: Player');

  s.test('reset() gives full lives, is alive, and can be hit', () => {
    const p = new Player('p1', '#fff');
    assertEqual(p.lives, CONFIG.lives.max, 'Player should start with CONFIG.lives.max lives');
    assert(p.isAlive(), 'A freshly reset player should be alive');
    assert(p.canBeHit(), 'A freshly reset player (no invulnerability/shield/down) should be hittable');
  });

  s.test('updateMouse(direct=true) snaps exactly to the target (touch input, no lag)', () => {
    const p = new Player('p1', '#fff');
    p.updateMouse(999, 111, 1 / 60, true, 1);
    assertEqual(p.x, 999, 'direct=true should set x exactly to targetX');
    assertEqual(p.y, 111, 'direct=true should set y exactly to targetY');
  });

  s.test('updateMouse(direct=false) moves toward the target but does not overshoot in one small step', () => {
    const p = new Player('p1', '#fff');
    p.x = 0; p.y = 0;
    p.updateMouse(1000, 0, 1 / 60, false, 1);
    assertNoNaN(p.x, 'player.x after updateMouse');
    assert(p.x > 0 && p.x < 1000, 'A single small-dt mouse-follow step should move partway to the target, not teleport or stay put', {
      expected: '(0, 1000)',
      actual: p.x,
      likely: 'js/entities/player.js updateMouse()',
    });
  });

  s.test('updateMouse() converges to the target over many frames', () => {
    const p = new Player('p1', '#fff');
    p.x = 0; p.y = 0;
    for (let i = 0; i < 120; i++) p.updateMouse(500, 300, 1 / 60, false, 1);
    assertClose(p.x, 500, 1, 'player.x should have converged close to the target after 2s of follow');
    assertClose(p.y, 300, 1, 'player.y should have converged close to the target after 2s of follow');
  });

  s.test('updateKeyboard() moves at constant speed regardless of diagonal direction (normalized)', () => {
    const straight = new Player('p1', '#fff');
    straight.x = 0; straight.y = 0;
    straight.updateKeyboard({ x: 1, y: 0 }, 1 / 60);
    const diagonal = new Player('p2', '#fff');
    diagonal.x = 0; diagonal.y = 0;
    diagonal.updateKeyboard({ x: 1, y: 1 }, 1 / 60);
    const straightDist = Math.hypot(straight.x, straight.y);
    const diagonalDist = Math.hypot(diagonal.x, diagonal.y);
    assertClose(straightDist, diagonalDist, 1e-9, 'Diagonal movement must be normalized to the same speed as axis-aligned movement (no diagonal speed boost)', {
      likely: 'js/entities/player.js updateKeyboard()',
    });
  });

  s.test('clamp() keeps the player fully inside [0,world] minus its radius', () => {
    const p = new Player('p1', '#fff');
    const world = { width: 1280, height: 720 };
    p.x = -500; p.y = -500;
    p.clamp(world);
    assertEqual(p.x, p.r, 'Player clamped at the left edge should sit exactly at x=radius');
    assertEqual(p.y, p.r, 'Player clamped at the top edge should sit exactly at y=radius');
    p.x = 99999; p.y = 99999;
    p.clamp(world);
    assertEqual(p.x, world.width - p.r, 'Player clamped at the right edge should sit exactly at width-radius');
    assertEqual(p.y, world.height - p.r, 'Player clamped at the bottom edge should sit exactly at height-radius');
  });

  s.test('clamp() respects a tighter custom `bounds` rect (e.g. split-screen co-op)', () => {
    const p = new Player('p2', '#fff');
    const world = { width: 1280, height: 720 };
    const bounds = { left: 640, right: 1280, top: 0, bottom: 720 };
    p.x = 0; p.y = 0;
    p.clamp(world, bounds);
    assertEqual(p.x, bounds.left + p.r, 'Player should be clamped to the custom bounds.left, not world 0', {
      likely: 'js/entities/player.js clamp()',
    });
  });

  s.test('tick() counts down invulnerable/hitFlash/skillCooldown/shieldTimer and floors at 0', () => {
    const p = new Player('p1', '#fff');
    p.invulnerable = 0.01;
    p.hitFlash = 0.01;
    p.skillCooldown = 0.01;
    p.shieldTimer = 0.01;
    p.tick(1); // a full second, far more than the 0.01 remaining
    assertEqual(p.invulnerable, 0, 'invulnerable must floor at 0, not go negative');
    assertEqual(p.hitFlash, 0, 'hitFlash must floor at 0, not go negative');
    assertEqual(p.skillCooldown, 0, 'skillCooldown must floor at 0, not go negative');
    assertEqual(p.shieldTimer, 0, 'shieldTimer must floor at 0, not go negative');
  });

  s.test('canBeHit() is false while invulnerable, shielded, or down; true otherwise', () => {
    const p = new Player('p1', '#fff');
    assert(p.canBeHit(), 'baseline: should be hittable');
    p.invulnerable = 1;
    assert(!p.canBeHit(), 'should NOT be hittable while invulnerable > 0');
    p.invulnerable = 0;
    p.shieldTimer = 1;
    assert(!p.canBeHit(), 'should NOT be hittable while shieldTimer > 0');
    p.shieldTimer = 0;
    p.down = true;
    assert(!p.canBeHit(), 'should NOT be hittable while down (already defeated)');
  });

  s.test('isAlive() is false once lives reach 0 or the player is down', () => {
    const p = new Player('p1', '#fff');
    assert(p.isAlive(), 'baseline: should be alive with full lives');
    p.lives = 0;
    assert(!p.isAlive(), 'should NOT be alive with 0 lives');
    p.lives = 1;
    p.down = true;
    assert(!p.isAlive(), 'should NOT be alive while down, even with lives remaining');
  });

  s.test('trail buffer never grows past 14 entries', () => {
    const p = new Player('p1', '#fff');
    for (let i = 0; i < 100; i++) p.updateKeyboard({ x: 1, y: 0 }, 1 / 60);
    assert(p.trail.length <= 14, 'player.trail should be capped at 14 entries to avoid unbounded growth', {
      expected: '<= 14',
      actual: p.trail.length,
      likely: 'js/entities/player.js updateKeyboard()/updateMouse() trail.shift() guard',
    });
  });

  return s;
}
