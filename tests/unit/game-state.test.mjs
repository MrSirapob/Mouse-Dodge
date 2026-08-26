// tests/unit/game-state.test.mjs
//
// GameState + Game reset/lifecycle tests: js/core/gameState.js and the
// reset()/startWave()/gameOver()/allPlayersDown() methods in
// js/systems/game.js. Covers life/death/restart (spec §24) and wave
// transition bookkeeping (spec §25) at the unit level; full drain-driven
// transitions are covered in tests/integration/wave-flow.test.mjs.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave, tick } from '../helpers/gameFactory.mjs';
import { GameState, GAME_STATES, GAME_MODES } from '../../js/core/gameState.js?v=20260826-k2vw';
import { CONFIG } from '../../js/core/config.js?v=20260826-k2vw';

export async function run() {
  const s = new TestSuite('LIFE / DEATH / RESTART / WAVE STATE');

  s.test('GameState.reset() gives a sane initial state (menu, wave 1, active phase, no score)', () => {
    const gs = new GameState();
    assertEqual(gs.state, GAME_STATES.MENU, 'a fresh GameState should start in MENU');
    assertEqual(gs.wave, 1, 'a fresh GameState should start at wave 1');
    assertEqual(gs.wavePhase, 'active', "a fresh GameState should start with wavePhase 'active'");
    assertEqual(gs.score, 0, 'a fresh GameState should start with score 0');
    assert(!gs.isPlaying(), 'isPlaying() should be false in MENU');
  });

  await s.testAsync('Game.reset() puts the game in PLAYING with full lives for every active player', async () => {
    const { game } = await createGame();
    game.reset(GAME_MODES.SOLO, 'pulse', 'pulse');
    assertEqual(game.state.state, GAME_STATES.PLAYING, 'reset() should transition state.state to PLAYING');
    assert(game.state.isPlaying(), 'isPlaying() should be true right after reset()');
    assertEqual(game.players[0].lives, CONFIG.lives.max, 'player 1 should start reset() with full lives');
    assertEqual(game.state.wave, 1, 'reset() should start at wave 1');
  });

  await s.testAsync('SOLO mode marks player 2 as down (not participating) so it cannot be hit or act', async () => {
    const { game } = await createGame();
    game.reset(GAME_MODES.SOLO, 'pulse', 'pulse');
    assertEqual(game.players[1].down, true, 'in SOLO mode, player 2 should be marked down from reset()', {
      likely: 'js/systems/game.js reset(): this.players[1].down = mode === GAME_MODES.SOLO',
    });
    assertEqual(game.activePlayers().length, 1, 'activePlayers() should only include player 1 in SOLO mode');
  });

  await s.testAsync('COOP mode has both players active and not down', async () => {
    const { game } = await createGame();
    game.reset(GAME_MODES.COOP, 'pulse', 'pulse');
    assertEqual(game.players[0].down, false, 'player 1 should not be down at the start of COOP');
    assertEqual(game.players[1].down, false, 'player 2 should not be down at the start of COOP', {
      likely: 'js/systems/game.js reset()',
    });
    assertEqual(game.activePlayers().length, 2, 'activePlayers() should include both players in COOP mode');
  });

  await s.testAsync('losing all lives sets player.down and triggers gameOver() in SOLO mode', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'solo' });
    const player = game.players[0];
    for (let i = 0; i < CONFIG.lives.max; i++) {
      player.invulnerable = 0; // allow the next hit immediately
      game.hitPlayer(player);
    }
    assertEqual(player.lives, 0, 'player should have 0 lives after losing exactly CONFIG.lives.max lives');
    assert(player.down, 'player.down should be true once lives reach 0', { likely: 'js/systems/lifeSystem.js hit()' });
    assertEqual(game.state.state, GAME_STATES.GAME_OVER, 'in SOLO mode, losing the only player should trigger Game Over', {
      likely: 'js/systems/lifeSystem.js hit() -> allPlayersDown() -> game.gameOver()',
    });
  });

  await s.testAsync('allPlayersDown() in COOP is only true once BOTH players are down', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'coop' });
    game.players[0].down = true;
    game.players[1].down = false;
    assert(!game.allPlayersDown(), 'allPlayersDown() must be false while player 2 is still up', {
      likely: 'js/systems/game.js allPlayersDown()',
    });
    game.players[1].down = true;
    assert(game.allPlayersDown(), 'allPlayersDown() must be true once both players are down');
  });

  await s.testAsync('gameOver() records best stats and does not re-trigger once already GAME_OVER', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'solo' });
    game.state.elapsed = 12.5;
    game.players[0].score = 1234;
    const bestBefore = game.bestScore;
    game.gameOver();
    assertEqual(game.state.state, GAME_STATES.GAME_OVER, 'gameOver() should set state to GAME_OVER');
    assert(game.bestScore >= bestBefore, 'gameOver() should update bestScore when the run beat the previous best');

    const shakeAfterFirst = game.state.shakeMag;
    game.state.shakeMag = -999; // sentinel: a second gameOver() call must not touch this
    game.gameOver();
    assertEqual(game.state.shakeMag, -999, 'a second gameOver() call while already GAME_OVER must be a no-op', {
      likely: "js/systems/game.js gameOver() `if (this.state.state === GAME_STATES.GAME_OVER) return;` guard",
    });
  });

  await s.testAsync('restart (reset() again) does not carry over bullets, combo, skills, or items from the previous run', async () => {
    const { game } = await createGame();
    jumpToWave(game, 3, { mode: 'solo' });
    const player = game.players[0];
    game.spawnBullet(100, 100, 1, 1, 5, '#fff');
    player.combo = 7;
    player.comboTimer = 0.5;
    player.score = 5000;
    player.skillCooldown = 3;
    game.itemSystem.items.push({ x: 10, y: 10, type: 'score', r: 10, age: 0, ttl: 5, bob: 0 });
    game.ringWarnings.push({ x: 1, y: 1 });
    game.lasers.push({ x: 1, y: 1 });

    game.reset(GAME_MODES.SOLO, 'pulse', 'pulse');

    assertEqual(game.bullets.items.length, 0, 'restart must not carry over bullets from the previous run', {
      likely: 'js/systems/game.js reset(): this.bullets.clear()',
    });
    assertEqual(game.players[0].combo, 0, 'restart must reset combo to 0', { likely: 'js/entities/player.js reset()' });
    assertEqual(game.players[0].score, 0, 'restart must reset score to 0');
    assertEqual(game.players[0].skillCooldown, 0, 'restart must reset skillCooldown to 0');
    assertEqual(game.itemSystem.items.length, 0, 'restart must clear any live item pickups', {
      likely: 'js/systems/game.js reset(): this.itemSystem.clear()',
    });
    assertEqual(game.ringWarnings.length, 0, 'restart must clear ring warnings');
    assertEqual(game.lasers.length, 0, 'restart must clear lasers');
    assertEqual(game.state.wave, 1, 'restart must return to wave 1');
  });

  await s.testAsync('togglePause() flips PLAYING<->PAUSED and back, without altering wave/score', async () => {
    const { game } = await createGame();
    jumpToWave(game, 2, { mode: 'solo' });
    game.players[0].score = 42;
    assertEqual(game.state.state, GAME_STATES.PLAYING, 'precondition: playing');
    game.togglePause();
    assertEqual(game.state.state, GAME_STATES.PAUSED, 'togglePause() from PLAYING should go to PAUSED');
    game.togglePause();
    assertEqual(game.state.state, GAME_STATES.PLAYING, 'togglePause() from PAUSED should return to PLAYING');
    assertEqual(game.state.wave, 2, 'pausing/unpausing must not change the current wave');
    assertEqual(game.players[0].score, 42, 'pausing/unpausing must not change score');
  });

  await s.testAsync('startWave(n, true) immediately jumps state.wave and resets per-wave transients (queue/warnings/lasers)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'solo' });
    game.ringWarnings.push({ x: 1, y: 1 });
    game.lasers.push({ x: 1, y: 1 });
    const staleMarker = { time: 999, fn: () => {} };
    game.actionQueue.push(staleMarker);

    game.startWave(3, true);

    assertEqual(game.state.wave, 3, 'startWave(3, true) should set state.wave to 3 immediately');
    assertEqual(game.state.wavePhase, 'active', 'startWave(n, true) should set wavePhase back to active');
    assertEqual(game.ringWarnings.length, 0, 'startWave(n, true) should clear stale ring warnings from the previous wave');
    assertEqual(game.lasers.length, 0, 'startWave(n, true) should clear stale lasers from the previous wave');
    // The queue is cleared and then immediately repopulated by the new
    // wave's own build(3) call, so it won't be empty — but the stale entry
    // from the previous wave must be gone.
    assert(!game.actionQueue.includes(staleMarker), 'startWave(n, true) must clear the stale action queue from the previous wave before building the new one', {
      likely: 'js/systems/game.js startWave(): this.actionQueue = [] (must run before waveSystem.build())',
    });
  });

  await s.testAsync('startWave(n) without immediate=true defers via beginWaveTransition instead of jumping state.wave', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'solo' });
    game.startWave(2); // no `immediate` flag
    assertEqual(game.state.wave, 1, 'a non-immediate startWave() must not change state.wave yet — only after the transition timer elapses', {
      likely: 'js/systems/game.js startWave()/beginWaveTransition()',
    });
    assertEqual(game.state.wavePhase, 'transition', 'a non-immediate startWave() should set wavePhase to "transition"');
    assertEqual(game.state.transitionWave, 2, 'transitionWave should record the pending wave number');
  });

  return s;
}
