// tests/unit/game-loop-timescale.test.mjs
//
// Regression test for Game.loop()'s frame-dt computation
// (js/systems/game.js), specifically the interaction between the 0.05s
// physics-safety clamp (the max dt the bullet-collision model — a single
// position update + circleHit() check, no swept/continuous collision — is
// designed to tolerate without risking tunneling) and Dev Mode's
// `devMode.timeScale` multiplier.
//
// Bug this guards against: an earlier version computed
// `Math.min(frameDt, 0.05) * timeScale`, which clamps BEFORE scaling — so a
// slow/stuttering frame (frameDt already near 0.05s) combined with a high
// SPEED level (timeScale up to 3) could produce an effective dt up to
// 0.15s, well past the ceiling every other part of the game assumes is
// safe. The fix scales first, then clamps
// (`Math.min(frameDt * timeScale, 0.05)`), so the effective dt passed to
// `update()` can never exceed 0.05s regardless of timeScale — identical to
// the old formula at a steady frame rate, but no longer able to spike
// during a stutter.
//
// This drives the real `Game.loop()` (not a reimplementation of its dt
// math) with a controlled `now`/`lastTime` and a stubbed `update()` that
// just records the dt it was called with and immediately parks the game in
// GAME_STATES.MENU so `loop()` doesn't reschedule itself via
// requestAnimationFrame — keeping this test synchronous and side-effect
// free instead of needing to drive/cancel a real animation-frame loop.

import { TestSuite, assert, assertClose } from '../helpers/assertions.mjs';
import { createGame } from '../helpers/gameFactory.mjs';
import { GAME_STATES } from '../../js/core/gameState.js?v=20260822-zyio';

/** Calls game.loop(now) once, capturing the dt it hands to update(), without letting it reschedule itself. */
function captureLoopDt(game, { lastTime, now, timeScale }) {
  game.lastTime = lastTime;
  game.devMode.timeScale = timeScale;
  game.state.state = GAME_STATES.PLAYING;

  let capturedDt = null;
  const realUpdate = game.update.bind(game);
  game.update = (dt) => {
    capturedDt = dt;
    // Stop loop() from calling requestAnimationFrame again once this
    // synchronous call returns.
    game.state.state = GAME_STATES.MENU;
  };
  game.draw = () => {};

  game.loop(now);

  game.update = realUpdate; // restore the real method for any later use
  return capturedDt;
}

export async function run() {
  const s = new TestSuite('UNIT: Game.loop() dt / Dev Mode timeScale ordering');

  await s.testAsync('at a steady 60fps frame time, timeScale=3 produces ~0.05s dt (matches pre-fix behavior)', async () => {
    const { game } = await createGame();
    const frameMs = 1000 / 60; // ~16.67ms
    const dt = captureLoopDt(game, { lastTime: 0, now: frameMs, timeScale: 3 });
    assert(dt !== null, 'Game.loop() did not call update()', { likely: 'js/systems/game.js loop()' });
    assertClose(dt, 0.05, 0.001, 'Expected ~0.05s dt at steady 60fps with timeScale=3', {
      likely: 'js/systems/game.js loop() dt formula',
    });
  });

  await s.testAsync('on a stutter (frame time already ~0.05s) with timeScale=3, dt is still clamped to 0.05s, not 0.15s', async () => {
    const { game } = await createGame();
    const stutterMs = 50; // a full 0.05s frame on its own, before any scaling
    const dt = captureLoopDt(game, { lastTime: 0, now: stutterMs, timeScale: 3 });
    assert(dt !== null, 'Game.loop() did not call update()', { likely: 'js/systems/game.js loop()' });
    assert(dt <= 0.05 + 1e-9, `dt (${dt}) exceeded the 0.05s physics-safety ceiling — this is the bullet-tunneling regression`, {
      expected: '<= 0.05',
      actual: dt,
      likely: 'js/systems/game.js loop() — timeScale must be applied before the 0.05s clamp, not after',
    });
  });

  await s.testAsync('with Dev Mode at the default timeScale (1), a stutter frame is still clamped to 0.05s (unaffected by the fix)', async () => {
    const { game } = await createGame();
    const stutterMs = 200; // a very long frame (e.g. a tab coming back into focus)
    const dt = captureLoopDt(game, { lastTime: 0, now: stutterMs, timeScale: 1 });
    assertClose(dt, 0.05, 0.001, 'Expected the pre-existing 0.05s safety clamp to still apply at timeScale=1', {
      likely: 'js/systems/game.js loop()',
    });
  });

  await s.testAsync('at a steady 60fps frame time with no Dev Mode speed change (timeScale=1), dt is just the real frame time', async () => {
    const { game } = await createGame();
    const frameMs = 1000 / 60;
    const dt = captureLoopDt(game, { lastTime: 0, now: frameMs, timeScale: 1 });
    assertClose(dt, frameMs / 1000, 0.001, 'Expected dt to equal the real (unscaled, unclamped) frame time', {
      likely: 'js/systems/game.js loop()',
    });
  });

  return s;
}
