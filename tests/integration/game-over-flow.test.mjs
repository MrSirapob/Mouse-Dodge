// tests/integration/game-over-flow.test.mjs
//
// End-to-end game-over flow: taking real hits from real bullets through to
// death, COOP revive mechanics, best-stat persistence (localStorage shim),
// and a clean restart — all driven through Game.update()/hitPlayer(), not
// by calling lifeSystem.hit() directly except where noted.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave, tick } from '../helpers/gameFactory.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260824-88u1';

export async function run() {
  const s = new TestSuite('INTEGRATION: Game Over Flow');

  await s.testAsync('a real bullet colliding with the player over several frames drives lives to 0 and ends the run (SOLO)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    let hits = 0;
    for (let i = 0; i < CONFIG.lives.max; i++) {
      player.invulnerable = 0; // let the next bullet actually connect
      game.bullets.clear();
      game.spawnBullet(player.x, player.y, 0, 0, 5, '#fff'); // dead-center overlap
      tick(game, 1);
      hits++;
      if (game.state.state === 'game-over') break;
    }
    assertEqual(player.lives, 0, 'player should be at 0 lives after enough direct hits');
    assertEqual(game.state.state, 'game-over', 'the run should have ended in Game Over once lives reached 0', {
      likely: 'js/systems/lifeSystem.js hit() -> game.gameOver()',
    });
    assert(hits <= CONFIG.lives.max, `should not take more than CONFIG.lives.max (${CONFIG.lives.max}) hits to end the run`, { actual: hits });
  });

  await s.testAsync('hit-invulnerability prevents a second immediate hit from the same/another overlapping bullet', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    game.spawnBullet(player.x, player.y, 0, 0, 5, '#fff');
    game.spawnBullet(player.x, player.y, 0, 0, 5, '#fff'); // a second overlapping bullet, same frame
    const livesBefore = player.lives;
    tick(game, 1);
    assertEqual(player.lives, livesBefore - 1, 'only ONE life should be lost even with two overlapping bullets on the same frame', {
      likely: 'js/systems/lifeSystem.js hit() -> player.invulnerable = CONFIG.lives.hitInvulnerability, and player.canBeHit() checked per-bullet',
    });
  });

  await s.testAsync('in COOP, one player going down does not end the run while the other is still up', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'coop' });
    game.actionQueue = [];
    const p1 = game.players[0];
    for (let i = 0; i < CONFIG.lives.max; i++) {
      p1.invulnerable = 0;
      game.hitPlayer(p1);
    }
    assert(p1.down, 'player 1 should be down after losing all lives');
    assertEqual(game.state.state, 'playing', 'the run must continue while player 2 is still up in COOP', {
      likely: 'js/systems/game.js allPlayersDown()',
    });
  });

  await s.testAsync('a downed COOP player can be revived by a nearby ally, restoring 1 life and clearing `down`', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'coop' });
    const p1 = game.players[0];
    const p2 = game.players[1];
    for (let i = 0; i < CONFIG.lives.max; i++) {
      p1.invulnerable = 0;
      game.hitPlayer(p1);
    }
    assert(p1.down, 'precondition: player 1 is down');
    p2.x = p1.x; p2.y = p1.y; // stand right next to the downed ally (within CONFIG.revive.radius)

    const ticksNeeded = Math.ceil((CONFIG.revive.duration + 0.2) * 60);
    tick(game, ticksNeeded);

    assertEqual(p1.down, false, 'a downed player standing near an ally for CONFIG.revive.duration should be revived', {
      likely: 'js/systems/lifeSystem.js updateRevive()',
    });
    assertEqual(p1.lives, 1, 'a revived player should come back with exactly 1 life');
  });

  await s.testAsync('a downed COOP player left alone (ally too far) does not revive and reviveProgress decays back to 0', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'coop' });
    const p1 = game.players[0];
    const p2 = game.players[1];
    for (let i = 0; i < CONFIG.lives.max; i++) {
      p1.invulnerable = 0;
      game.hitPlayer(p1);
    }
    p2.x = p1.x + CONFIG.revive.radius * 10; // far away
    p2.y = p1.y;

    tick(game, 120); // 2s, enough time it WOULD have revived if the ally were close
    assertEqual(p1.down, true, 'a downed player should stay down if no ally is within revive radius', {
      likely: 'js/systems/lifeSystem.js updateRevive()',
    });
    assertEqual(p1.reviveProgress, 0, 'reviveProgress should decay back to (and floor at) 0 when no ally is nearby', {
      likely: 'js/systems/lifeSystem.js updateRevive() decay branch',
    });
  });

  await s.testAsync('Game Over persists best score/wave/time/graze to the (shimmed) localStorage and exposes them via ui.setBest', async () => {
    const { game, ui } = await createGame();
    jumpToWave(game, 1);
    game.state.elapsed = 42;
    game.players[0].score = 777;
    game.gameOver();

    assertEqual(game.bestScore, 777, 'gameOver() should update bestScore for a new high score');
    assertEqual(game.bestTime, 42, 'gameOver() should update bestTime for a new best time');
    const setBestCalls = ui.calls.filter((c) => c.name === 'setBest');
    assert(setBestCalls.length > 0, 'gameOver() should call ui.setBest() so the UI reflects the new bests', {
      likely: 'js/systems/game.js gameOver()',
    });
  });

  await s.testAsync('a lower-scoring run after Game Over does not overwrite a previously recorded best', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.players[0].score = 5000;
    game.gameOver();
    const bestAfterFirst = game.bestScore;
    assertEqual(bestAfterFirst, 5000, 'precondition: best recorded from the first run');

    game.reset('solo', 'pulse', 'pulse');
    jumpToWave(game, 1);
    game.players[0].score = 100; // a much worse run
    game.gameOver();
    assertEqual(game.bestScore, bestAfterFirst, 'a lower score on a later run must not overwrite the recorded best', {
      likely: 'js/systems/game.js gameOver(): `if (finalScore > this.bestScore)`',
    });
  });

  await s.testAsync('restarting after Game Over (reset()) returns to PLAYING with a clean slate', async () => {
    const { game } = await createGame();
    jumpToWave(game, 5, { mode: 'solo' });
    game.players[0].score = 999;
    game.players[0].lives = 0;
    game.players[0].down = true;
    game.gameOver();
    assertEqual(game.state.state, 'game-over', 'precondition: game over');

    game.reset('solo', 'pulse', 'pulse');
    assertEqual(game.state.state, 'playing', 'reset() after Game Over should return to PLAYING');
    assertEqual(game.state.wave, 1, 'reset() should return to wave 1');
    assertEqual(game.players[0].lives, CONFIG.lives.max, 'reset() should restore full lives');
    assertEqual(game.players[0].down, false, 'reset() should clear the down flag');
    assertEqual(game.players[0].score, 0, 'reset() should zero the score');
  });

  return s;
}
