// tests/integration/wave-flow.test.mjs
//
// Drives Game.update() through a full wave lifecycle exactly as the real
// game loop does (js/systems/game.js update()): active -> draining ->
// transition -> next wave's active. No shortcuts through internal methods
// except to fast-forward waveTime (equivalent to letting 30 real seconds
// pass) and to clear residual bullets (equivalent to waiting for them to
// naturally fly off/expire) so the test doesn't need to simulate tens of
// thousands of real frames.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave, tick } from '../helpers/gameFactory.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260829-rlfe';

export async function run() {
  const s = new TestSuite('INTEGRATION: Wave Transition Flow');

  await s.testAsync("wave clock exceeding waveDuration moves 'active' -> 'draining' (spawning stops, existing bullets remain)", async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.spawnBullet(200, 200, 0, 0, 5, '#fff'); // a bullet that should survive the active->draining edge
    assertEqual(game.state.wavePhase, 'active', 'precondition: wave should start active');
    game.state.waveTime = game.state.waveDuration + 0.01;
    tick(game, 1);
    assertEqual(game.state.wavePhase, 'draining', "wavePhase should become 'draining' once waveTime reaches waveDuration", {
      likely: 'js/systems/game.js update() startWaveEnding() trigger condition',
    });
    assert(game.bullets.items.some((b) => b.x === 200 || Math.abs(b.x - 200) < 1), 'existing bullets must NOT be deleted when the wave starts draining — only new spawning stops', {
      likely: 'js/systems/game.js startWaveEnding()',
    });
  });

  await s.testAsync("'draining' -> 'transition' only happens once the wave is fully clear (no bullets/warnings/lasers)", async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.state.waveTime = game.state.waveDuration + 0.01;
    tick(game, 1); // enters draining
    assertEqual(game.state.wavePhase, 'draining', 'precondition: draining');

    game.spawnBullet(200, 200, 0, 0, 5, '#fff'); // keep the wave "dirty"
    tick(game, 5);
    assertEqual(game.state.wavePhase, 'draining', 'wavePhase must stay "draining" while bullets are still present', {
      likely: 'js/systems/game.js isWaveClear() / update() draining->transition guard',
    });

    game.bullets.clear();
    game.ringWarnings.length = 0;
    game.lasers.length = 0;
    tick(game, 1);
    assertEqual(game.state.wavePhase, 'transition', 'wavePhase should become "transition" once the wave is fully clear', {
      likely: 'js/systems/game.js update() `if (s.wavePhase === "draining" && this.isWaveClear())`',
    });
    assertEqual(game.state.transitionWave, 2, 'transitionWave should be the next wave number (current + 1)');
  });

  await s.testAsync("'transition' -> next wave's 'active' happens once waveTransition elapses, and rebuilds pattern state", async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.state.waveTime = game.state.waveDuration + 0.01;
    tick(game, 1); // active -> draining
    game.bullets.clear();
    game.ringWarnings.length = 0;
    game.lasers.length = 0;
    tick(game, 1); // draining -> transition
    assertEqual(game.state.wavePhase, 'transition', 'precondition: transition');

    // Wave 1 is cleared without taking a hit, so the "No Hit" banner adds
    // CONFIG.noHit.displayMs on top of the normal wave.transition gap
    // (see beginWaveTransition()'s extraDelay in game.js) before the next
    // wave starts.
    const ticksForTransition = Math.ceil(
      (CONFIG.wave.transition + CONFIG.noHit.displayMs / 1000 + 0.1) * 60,
    );
    tick(game, ticksForTransition);

    assertEqual(game.state.wave, 2, 'the game should have advanced to wave 2 once the transition timer elapsed', {
      likely: 'js/systems/game.js update() transition branch -> startWave(s.transitionWave, true)',
    });
    assertEqual(game.state.wavePhase, 'active', 'the new wave should start in the "active" phase');
  });

  await s.testAsync('old wave state does not leak across a transition: waveTime resets and W2 gets its own duration', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.state.waveTime = game.state.waveDuration + 0.01;
    tick(game, 1);
    game.bullets.clear();
    tick(game, 1);
    tick(game, Math.ceil((CONFIG.wave.transition + CONFIG.noHit.displayMs / 1000 + 0.1) * 60)); // includes the "No Hit" banner delay — see wave-flow test above

    assertEqual(game.state.wave, 2, 'precondition: reached wave 2');
    assert(game.state.waveTime < 0, "wave 2 should start with a negative waveTime (the banner delay), not carry over W1's elapsed waveTime", {
      likely: 'js/systems/game.js startWave()',
    });
    assert(game.state.waveDuration > 0, 'wave 2 should have its own positive waveDuration set from WaveSystem.duration(2)');
  });

  await s.testAsync('player state (lives, position, invulnerability) survives a wave transition unchanged', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    player.lives = 2;
    player.x = 111;
    player.y = 222;

    game.state.waveTime = game.state.waveDuration + 0.01;
    tick(game, 1);
    game.bullets.clear();
    tick(game, 1);
    tick(game, Math.ceil((CONFIG.wave.transition + CONFIG.noHit.displayMs / 1000 + 0.1) * 60)); // includes the "No Hit" banner delay — see wave-flow test above

    assertEqual(game.state.wave, 2, 'precondition: reached wave 2');
    assertEqual(player.lives, 2, 'player lives must be unaffected by a wave transition');
    assertEqual(player.x, 111, 'player x position must be unaffected by a wave transition (not re-centered)');
    assertEqual(player.y, 222, 'player y position must be unaffected by a wave transition');
  });

  await s.testAsync('boss state resets cleanly across the W4 -> W5 -> W6 boundary (boss only active during W5)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 4);
    assert(!game.boss.active, 'boss should not be active during W4');

    jumpToWave(game, 5);
    assert(game.boss.active, 'boss should be active immediately upon entering W5', { likely: 'js/systems/game.js startWave()' });

    jumpToWave(game, 6);
    assert(!game.boss.active, 'boss should not be active in W6 (jumping straight there, as startWave always resets boss.active first)', {
      likely: 'js/systems/game.js startWave(): this.boss.active = false before the isBossWave() check',
    });
  });

  await s.testAsync('reaching the end of wave 20 triggers Game Over instead of continuing to wave 21', async () => {
    const { game } = await createGame();
    jumpToWave(game, 20);
    game.state.waveTime = game.state.waveDuration + 0.01;
    tick(game, 1); // active -> draining
    game.bullets.clear();
    game.ringWarnings.length = 0;
    game.lasers.length = 0;
    tick(game, 1);

    assertEqual(game.state.state, 'game-over', 'clearing wave 20 should end the run (Game Over) rather than starting wave 21', {
      likely: 'js/systems/game.js update(): `if (s.wave >= 20) { this.gameOver(); return; }`',
    });
  });

  return s;
}
