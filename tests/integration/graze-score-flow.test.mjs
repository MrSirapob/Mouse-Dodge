// tests/integration/graze-score-flow.test.mjs
//
// End-to-end graze -> combo -> score pipeline: bullets fired from a
// pattern, moving naturally past the player over several frames (not
// hand-placed at exact graze distance like the unit tests), building a
// combo and cashing in score, exactly as real play would.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave, tick } from '../helpers/gameFactory.mjs';
import { withSeededRandom } from '../helpers/seededRandom.mjs';
import { GRAZE_REWARD } from '../../js/core/config.js?v=20260829-kt89';

export async function run() {
  const s = new TestSuite('INTEGRATION: Graze -> Combo -> Score');

  await s.testAsync('a stream of bullets passing near a stationary player builds a real multi-graze combo', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    game.state.waveDuration = 999;
    const player = game.players[0];
    player.x = 640;
    player.y = 360;

    // Fire 8 bullets in sequence (each spawned, allowed to fully cross the
    // player and exit the arena, then the next one fires) on a horizontal
    // line that grazes the player (passes just outside hit range) as it
    // travels left to right.
    const grazeY = player.y + player.r + 5 + 8; // inside the +16 graze band, outside r_sum
    for (let i = 0; i < 8; i++) {
      game.spawnBullet(-50, grazeY, 6, 0, 5, '#fff');
      tick(game, 250); // enough frames to cross the whole 1280+80+80 arena width at 6px/frame and be cleaned up
      assertEqual(game.bullets.items.length, 0, `bullet #${i} should have fully exited and been removed before the next is fired (test setup check)`);
    }

    assertEqual(player.grazeCount, 8, 'all 8 bullets on the graze line should have been grazed exactly once each', {
      likely: 'js/systems/game.js updateBullets() graze detection over multiple frames',
    });
    assert(player.score > 0, 'building a graze combo should have produced positive score');
  });

  await s.testAsync('spacing grazes further apart than the combo window resets the combo between them', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    const grazeY = player.y + player.r + 5 + 8;

    game.spawnBullet(player.x - 50, grazeY, 6, 0, 5, '#fff'); // approaches from the left, grazes as it crosses
    tick(game, 20);
    assertEqual(player.combo, 1, 'precondition: one graze registered, combo=1');

    // Let the combo window fully expire with no bullets present.
    tick(game, Math.ceil((GRAZE_REWARD.comboWindow + 0.5) * 60));
    assertEqual(player.combo, 0, 'combo should have reset to 0 after the window elapsed with no further grazes');

    game.spawnBullet(player.x - 50, grazeY, 6, 0, 5, '#fff');
    tick(game, 20);
    assertEqual(player.combo, 1, 'a graze after the window expired should start a fresh combo at 1, not continue the old one', {
      likely: 'js/systems/game.js updateScore() comboTimer reset logic',
    });
  });

  await s.testAsync('grazes packed within the combo window keep extending the same combo without resetting', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    const grazeY = player.y + player.r + 5 + 8;

    // Fire bullets spaced ~0.3s apart in real time (well inside the 1.0s
    // combo window), each independently grazing as it crosses the player.
    for (let batch = 0; batch < 5; batch++) {
      game.bullets.items.length = 0; // clear the previous (already-grazed, departed) bullet
      game.spawnBullet(player.x - 40, grazeY, 6, 0, 5, '#fff');
      tick(game, 18); // ~0.3s: enough to cross and graze, not enough to expire the combo window
    }
    assertEqual(player.combo, 5, 'five grazes spaced well within the combo window should accumulate to combo=5, not reset each time', {
      likely: 'js/systems/game.js updateBullets() graze branch: p.comboTimer = GRAZE_REWARD.comboWindow',
    });
  });

  await s.testAsync('a real Bullet Hell wave (W3) run for several seconds never produces NaN/negative score, grazeCount, or combo', async () => {
    await withSeededRandom(4242, async () => {
      const { game } = await createGame();
      jumpToWave(game, 3);
      const player = game.players[0];
      tick(game, 600); // 10 simulated seconds of real W3 pattern activity
      assert(Number.isFinite(player.score) && player.score >= 0, 'score must stay a finite, non-negative number through real gameplay', {
        actual: player.score,
        likely: 'js/systems/game.js updateScore() / updateBullets() graze scoring',
      });
      assert(Number.isInteger(player.grazeCount) && player.grazeCount >= 0, 'grazeCount must stay a non-negative integer', { actual: player.grazeCount });
      assert(Number.isInteger(player.combo) && player.combo >= 0, 'combo must stay a non-negative integer', { actual: player.combo });
      assert(Number.isFinite(game.state.teamScore), 'state.teamScore must stay finite', { actual: game.state.teamScore });
    });
  });

  return s;
}
