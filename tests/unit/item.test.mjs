// tests/unit/item.test.mjs
//
// Item pickup tests (js/systems/itemSystem.js) run against a real Game
// (ItemSystem calls back into game.activePlayers()/particles/addSkillEffect/
// spawnScorePopup). Uses a seeded RNG only where spawn position/type is
// randomized; pickup/expiry/effect logic itself is deterministic.

import { TestSuite, assert, assertEqual, assertNoNaN } from '../helpers/assertions.mjs';
import { createGame, jumpToWave } from '../helpers/gameFactory.mjs';
import { withSeededRandom } from '../helpers/seededRandom.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260822-zyio';
import { ITEM_COLORS } from '../../js/systems/itemSystem.js?v=20260822-zyio';

export async function run() {
  const s = new TestSuite('ITEMS');

  s.test('ITEM_COLORS defines a color for every documented item type', () => {
    for (const type of ['heart', 'energy', 'shield', 'score', 'mystery']) {
      assert(typeof ITEM_COLORS[type] === 'string', `ITEM_COLORS.${type} is missing`, {
        likely: 'js/systems/itemSystem.js ITEM_COLORS',
      });
    }
  });

  await s.testAsync('trySpawn() creates an item with position inside the arena, valid type, and full ttl', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    withSeededRandom(42, () => game.itemSystem.trySpawn());
    assertEqual(game.itemSystem.items.length, 1, 'trySpawn() should add exactly one item when under maxActive');
    const item = game.itemSystem.items[0];
    assertNoNaN(item.x, 'item.x');
    assertNoNaN(item.y, 'item.y');
    assert(item.x >= 0 && item.x <= CONFIG.world.width, 'item.x should be within the arena');
    assert(item.y >= 0 && item.y <= CONFIG.world.height, 'item.y should be within the arena');
    assert(['heart', 'energy', 'shield', 'score', 'mystery'].includes(item.type), `item.type "${item.type}" is not a recognized type`, {
      likely: 'js/systems/itemSystem.js pickType()',
    });
    assertEqual(item.age, 0, 'a freshly spawned item should start at age 0');
    assertEqual(item.ttl, CONFIG.items.ttl, 'a freshly spawned item should get the configured ttl');
  });

  await s.testAsync('trySpawn() refuses once items.length >= maxActive', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    for (let i = 0; i < CONFIG.items.maxActive; i++) {
      withSeededRandom(100 + i, () => game.itemSystem.trySpawn());
    }
    assertEqual(game.itemSystem.items.length, CONFIG.items.maxActive, 'precondition: filled up to maxActive');
    withSeededRandom(999, () => game.itemSystem.trySpawn());
    assertEqual(game.itemSystem.items.length, CONFIG.items.maxActive, 'trySpawn() must not exceed CONFIG.items.maxActive', {
      likely: 'js/systems/itemSystem.js trySpawn() guard',
    });
  });

  await s.testAsync('a player walking onto an item collects it and the item is removed', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'score', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    const scoreBefore = player.score;
    game.itemSystem.update(1 / 60);
    assertEqual(game.itemSystem.items.length, 0, 'the item should be removed from the world once collected', {
      likely: 'js/systems/itemSystem.js update() collision loop',
    });
    assert(player.score > scoreBefore, 'collecting a score item should increase player.score', {
      likely: 'js/systems/itemSystem.js collect() case "score"',
    });
  });

  await s.testAsync('a player far from an item does not collect it', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.itemSystem.items.push({ x: player.x + 500, y: player.y, type: 'score', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60);
    assertEqual(game.itemSystem.items.length, 1, 'an item far outside the pickup radius must not be collected', {
      likely: 'js/systems/itemSystem.js update() collision radius (p.r + item.r + pickupPadding)',
    });
  });

  await s.testAsync('an item expires (removed) once age reaches its ttl even if never collected', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    // Park the item far from the player so only ttl expiry removes it.
    game.itemSystem.items.push({ x: (player.x + 900) % CONFIG.world.width, y: player.y, type: 'score', r: CONFIG.items.radius, age: 0, ttl: 1, bob: 0 });
    game.itemSystem.update(0.5);
    assertEqual(game.itemSystem.items.length, 1, 'precondition: item should still be alive before ttl elapses');
    game.itemSystem.update(0.6); // age now 1.1 >= ttl 1
    assertEqual(game.itemSystem.items.length, 0, 'an item must be removed once its age reaches ttl', {
      likely: 'js/systems/itemSystem.js update() ttl expiry branch',
    });
  });

  await s.testAsync("heart item restores 1 life below max, and gives no score at max life", async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    player.lives = CONFIG.lives.max - 1;
    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'heart', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60);
    assertEqual(player.lives, CONFIG.lives.max, 'a heart item below max lives should restore exactly 1 life');

    // Now at max lives: another heart should do nothing to score (score
    // only comes from the dedicated 'score' item type).
    const scoreBefore = player.score;
    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'heart', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60);
    assertEqual(player.lives, CONFIG.lives.max, 'lives must never exceed CONFIG.lives.max');
    assertEqual(player.score, scoreBefore, 'a heart collected at full life must not award any score', {
      likely: 'js/systems/itemSystem.js collect() case "heart" else-branch',
    });
  });

  await s.testAsync('energy item clears the current skill cooldown to 0', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    player.skillCooldown = 5;
    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'energy', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60);
    assertEqual(player.skillCooldown, 0, 'an energy item should clear skillCooldown to 0', {
      likely: 'js/systems/itemSystem.js collect() case "energy"',
    });
  });

  await s.testAsync('shield item grants a shield charge, capped at shieldMaxCharges', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    player.shieldCharges = 0;
    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'shield', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60);
    assertEqual(player.shieldCharges, CONFIG.items.shieldHits, 'a shield item should grant CONFIG.items.shieldHits charge(s)');

    // Picking up another shield while already at the cap must not exceed it.
    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'shield', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60);
    assertEqual(player.shieldCharges, CONFIG.items.shieldMaxCharges, 'shield charges must never exceed CONFIG.items.shieldMaxCharges', {
      likely: 'js/systems/itemSystem.js collect() case "shield"',
    });
  });

  await s.testAsync('a shield charge blocks exactly one hit (bullet still consumed), then reverts to normal damage', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    player.shieldCharges = 1;
    const livesBefore = player.lives;

    const blocked = game.hitPlayer(player);
    assert(blocked, 'a hit while shielded should still report as "handled" (bullet gets consumed)', {
      likely: 'js/systems/lifeSystem.js hit() shieldCharges branch',
    });
    assertEqual(player.lives, livesBefore, 'a shielded hit must not cost a life');
    assertEqual(player.shieldCharges, 0, 'the shield charge must be consumed by the hit');
    assertEqual(player.tookHitThisWave, false, 'a shielded hit must not count against the "No Hit" wave bonus');

    // Grace invuln from the shield block should prevent an immediate second
    // hit; clear it to confirm the NEXT hit now costs a real life.
    player.invulnerable = 0;
    const damaged = game.hitPlayer(player);
    assert(damaged, 'a hit with no shield charges left should be handled normally');
    assertEqual(player.lives, livesBefore - 1, 'once the shield charge is spent, the next hit should cost a real life');
    assertEqual(player.tookHitThisWave, true, 'a real (non-shielded) hit should count against the "No Hit" wave bonus');
  });

  await s.testAsync('items stop spawning during the wave-transition banner, but keep aging/collectible while draining', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.itemSystem.items.length = 0;

    game.state.wavePhase = 'transition';
    game.itemSystem.spawnTimer = 0; // would spawn immediately if allowed
    game.itemSystem.update(1 / 60);
    assertEqual(game.itemSystem.items.length, 0, 'no new items should spawn during the "transition" wave-announce banner', {
      likely: "js/systems/itemSystem.js update() `if (phase === 'transition') return;`",
    });

    // An already-live item should still age (and be collectible) while draining.
    game.state.wavePhase = 'draining';
    const player = game.players[0];
    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'score', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60);
    assertEqual(game.itemSystem.items.length, 0, 'an item should still be collectible (and age) during the "draining" phase', {
      likely: 'js/systems/itemSystem.js update() phase handling',
    });
  });

  await s.testAsync('pickType() only ever returns a recognized type across many rolls (weighted roll never falls off the end unexpectedly)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const seen = new Set();
    withSeededRandom(7, () => {
      for (let i = 0; i < 500; i++) seen.add(game.itemSystem.pickType());
    });
    for (const type of seen) {
      assert(['heart', 'energy', 'shield', 'score', 'mystery'].includes(type), `pickType() produced an unrecognized type "${type}"`, {
        likely: 'js/systems/itemSystem.js pickType()',
      });
    }
  });

  return s;
}
