// tests/unit/score.test.mjs
//
// Score / graze / combo tests, run against a real Game (js/systems/game.js
// updateBullets() graze block + updateScore()) — the actual scoring math,
// not a reimplementation.

import { TestSuite, assert, assertEqual, assertNoNaN, assertClose } from '../helpers/assertions.mjs';
import { createGame, jumpToWave, tick } from '../helpers/gameFactory.mjs';
import { CONFIG, GRAZE_REWARD } from '../../js/core/config.js?v=20260821-vk7t';

export async function run() {
  const s = new TestSuite('COMBAT: Score / Graze / Combo');

  await s.testAsync('a bullet passing near (not overlapping) the player registers exactly one graze', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    // circleNear(b, p, 16): grazes when distance < r_sum + 16 but circleHit
    // (distance < r_sum) is false, i.e. "close but not touching".
    const r = 5;
    const gap = (player.r + r) + 8; // inside the +16 graze band, outside r_sum
    game.spawnBullet(player.x + gap, player.y, 0, 0, r, '#fff');
    assertEqual(player.grazeCount, 0, 'precondition: no grazes yet');
    tick(game, 1);
    assertEqual(player.grazeCount, 1, 'a bullet within the graze band should register exactly one graze', {
      likely: 'js/systems/game.js updateBullets() circleNear(b, p, 16) branch',
    });
  });

  await s.testAsync('a bullet far from the player does not graze', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    game.spawnBullet(player.x + 300, player.y, 0, 0, 5, '#fff');
    tick(game, 1);
    assertEqual(player.grazeCount, 0, 'a bullet well outside the graze band must not register a graze', {
      likely: 'js/systems/game.js updateBullets() circleNear() radius',
    });
  });

  await s.testAsync('the same bullet can only graze once (grazedBy guard)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    const r = 5;
    const gap = (player.r + r) + 8;
    game.spawnBullet(player.x + gap, player.y, 0, 0, r, '#fff'); // stationary, stays in the graze band every frame
    tick(game, 10);
    assertEqual(player.grazeCount, 1, 'a single bullet sitting in the graze band across multiple frames must only graze once', {
      likely: 'js/systems/game.js updateBullets() `if (!b.grazedBy && ...)` guard',
    });
  });

  await s.testAsync('grazing increments both grazeCount and combo, and starts the combo timer', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    const r = 5;
    const gap = (player.r + r) + 8;
    game.spawnBullet(player.x + gap, player.y, 0, 0, r, '#fff');
    tick(game, 1);
    assertEqual(player.combo, 1, 'combo should increment by 1 on graze');
    assertClose(player.comboTimer, GRAZE_REWARD.comboWindow, 1 / 30, 'comboTimer should (re)start at GRAZE_REWARD.comboWindow on graze');
  });

  await s.testAsync('grazing adds score, scaled up by combo multiplier (1 + min(combo,10)*0.12)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    const r = 5;
    const gap = (player.r + r) + 8;

    const scoreBefore1 = player.score;
    game.spawnBullet(player.x + gap, player.y, 0, 0, r, '#fff');
    tick(game, 1);
    const gained1 = player.score - scoreBefore1;
    // First graze: combo becomes 1 -> mult = 1 + 1*0.12 = 1.12 -> gained = 56
    // (updateScore's continuous 100*dt trickle also runs the same frame; account for it)
    const trickle = 100 * (1 / 60);
    assertClose(gained1 - trickle, 50 * 1.12, 0.5, 'first graze should award 50 * (1 + 1*0.12) score, on top of the passive time score', {
      likely: 'js/systems/game.js updateBullets() graze scoring: const mult / const gained',
    });
  });

  await s.testAsync('combo resets to 0 once comboTimer runs out with no further grazes', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    const r = 5;
    const gap = (player.r + r) + 8;
    game.spawnBullet(player.x + gap, player.y, 0, 0, r, '#fff');
    tick(game, 1); // graze once, combo=1, comboTimer starts
    assert(player.combo > 0, 'precondition: combo should be > 0 right after a graze');
    // Remove all bullets so nothing else can graze, then let the combo window expire.
    game.bullets.items.length = 0;
    tick(game, Math.ceil((GRAZE_REWARD.comboWindow + 0.5) * 60));
    assertEqual(player.combo, 0, 'combo should reset to 0 once comboTimer elapses with no new graze', {
      likely: 'js/systems/game.js updateScore() comboTimer countdown',
    });
    assertEqual(player.comboTimer, 0, 'comboTimer should floor at 0, not go negative');
  });

  await s.testAsync('graze cooldown recovery only ever subtracts from skillCooldown, capped at maxReduction of the base cooldown', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    game.state.skill = 'pulse';
    game.skillSystem.use(player); // put pulse on cooldown, sets skillBaseCooldown
    const baseCooldown = player.skillBaseCooldown;
    assert(baseCooldown > 0, 'precondition: skill should be on cooldown after use');

    const r = 5;
    const gap = (player.r + r) + 8;
    // Spawn many grazeable bullets in sequence (one per frame, each freshly ungrazed) to
    // drive grazeCooldownReduced up toward its cap. (Note: pulse's own brief
    // invulnerability delays the first few grazes — irrelevant here, we only
    // care about the eventual plateau.)
    for (let i = 0; i < 60; i++) {
      game.bullets.items.length = 0;
      game.spawnBullet(player.x + gap, player.y, 0, 0, r, '#fff');
      tick(game, 1);
    }
    const cap = baseCooldown * GRAZE_REWARD.maxReduction;
    assert(player.skillCooldown >= 0, 'skillCooldown must never go negative from graze recovery', { actual: player.skillCooldown });
    // Check the graze-attributed portion directly (player.grazeCooldownReduced),
    // not the total skillCooldown delta — that delta also includes ordinary
    // time-based decay from Player.tick(), which is separate from graze recovery.
    assert(player.grazeCooldownReduced <= cap + 1e-6, `graze-driven cooldown recovery must never exceed maxReduction (${GRAZE_REWARD.maxReduction}) of the base cooldown`, {
      expected: `<= ${cap}`,
      actual: player.grazeCooldownReduced,
      likely: 'js/systems/game.js updateBullets() graze recovery budget/allowed calc',
    });
    assert(player.grazeCooldownReduced > cap * 0.8, 'expected grazeCooldownReduced to have actually plateaued near its cap after 60 repeated grazes (test setup check)', {
      actual: player.grazeCooldownReduced,
    });
  });

  await s.testAsync('score is never NaN and never decreases from grazing/passive scoring alone', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    let last = player.score;
    for (let i = 0; i < 120; i++) {
      tick(game, 1);
      assertNoNaN(player.score, `player.score at tick ${i}`);
      assert(player.score >= last, 'score should be monotonically non-decreasing under normal play (no damage taken)', {
        actual: player.score,
        expected: `>= ${last}`,
        likely: 'js/systems/game.js updateScore() / updateBullets() graze scoring',
      });
      last = player.score;
    }
  });

  await s.testAsync('teamScore() is player 1 score alone in solo mode, and the sum of both in coop', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'solo' });
    game.players[0].score = 500;
    game.players[1].score = 999; // should be ignored in solo
    assertEqual(game.teamScore(), 500, 'teamScore() in solo mode should equal only player 1 score', {
      likely: 'js/systems/game.js teamScore()',
    });

    jumpToWave(game, 1, { mode: 'coop' });
    game.players[0].score = 500;
    game.players[1].score = 300;
    assertEqual(game.teamScore(), 800, 'teamScore() in coop mode should equal the sum of both players', {
      likely: 'js/systems/game.js teamScore()',
    });
  });

  await s.testAsync('a direct hit consumes the bullet, reduces lives by 1, and does not also register a graze', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    const livesBefore = player.lives;
    const grazeBefore = player.grazeCount;
    game.spawnBullet(player.x, player.y, 0, 0, 5, '#fff'); // dead center overlap -> direct hit
    tick(game, 1);
    assertEqual(player.lives, livesBefore - 1, 'a direct overlapping hit should reduce lives by exactly 1', {
      likely: 'js/systems/lifeSystem.js hit()',
    });
    assertEqual(game.bullets.items.length, 0, 'the bullet that hit the player should be consumed/removed');
    assertEqual(player.grazeCount, grazeBefore, 'a bullet that lands a direct hit must not also count as a graze on the same frame', {
      likely: 'js/systems/game.js updateBullets() hit/graze ordering (break after damage)',
    });
  });

  return s;
}
