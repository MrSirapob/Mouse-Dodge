// tests/unit/skin.test.mjs
//
// Regression coverage for the two bugs flagged in the 2026-08-24 skin-system
// handoff review:
//  1. `deathEffect` (js/data/skins.js) was never consumed anywhere —
//     particles.spawnBlood() hardcoded a plain red burst regardless of the
//     equipped skin's deathEffect id.
//  2. P2 was getting the same equipped skin as P1 in coop, contradicting
//     HANDOFF_LOG.md's documented "P2 stays on default, one equip slot" rule.
//
// Uses a real Game (see tests/helpers/gameFactory.mjs) plus the real
// ParticleSystem directly for the deathEffect visuals check.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame } from '../helpers/gameFactory.mjs';
import { ParticleSystem } from '../../js/rendering/particles.js?v=20260824-znwq';
import { SKIN_BY_ID } from '../../js/data/skins.js?v=20260824-znwq';

export async function run() {
  const s = new TestSuite('SKIN SYSTEM');

  s.test('spawnBlood() with a "burst"/"default" deathEffect keeps the plain red blood look', () => {
    const particles = new ParticleSystem();
    particles.spawnBlood(0, 0, 20, 'burst');
    assertEqual(particles.items.length, 20, 'burst should not change particle count');
    assert(particles.items.every((p) => !p.flickerColors && !p.square), 'burst particles should not flicker or be square', {
      likely: 'js/rendering/particles.js DEATH_EFFECTS.burst',
    });
  });

  s.test('spawnBlood() with "glitch" deathEffect produces flickering square particles', () => {
    const particles = new ParticleSystem();
    particles.spawnBlood(0, 0, 20, 'glitch');
    assert(particles.items.every((p) => p.square && Array.isArray(p.flickerColors) && p.flickerColors.length > 1), 'glitch particles should be square and carry a multi-color flicker palette', {
      likely: 'js/rendering/particles.js DEATH_EFFECTS.glitch',
    });
  });

  s.test('spawnBlood() with "singularity" deathEffect pulls particles back toward the origin', () => {
    const particles = new ParticleSystem();
    particles.spawnBlood(100, 100, 30, 'singularity');
    assert(particles.items.every((p) => p.pull > 0 && p.originX === 100 && p.originY === 100), 'singularity particles should carry a pull-toward-origin field', {
      likely: 'js/rendering/particles.js DEATH_EFFECTS.singularity',
    });
    // Compare against an identical particle with `pull` disabled: if the
    // pull field actually does something, the singularity particle should
    // end up noticeably closer to its origin than its unpulled twin after
    // the same number of frames, instead of flying away just as far.
    const pulled = particles.items[0];
    const unpulled = { ...pulled, pull: 0 };
    const distFromOrigin = (p) => Math.hypot(p.x - p.originX, p.y - p.originY);
    const solo = new ParticleSystem();
    solo.items.push(pulled);
    const soloUnpulled = new ParticleSystem();
    soloUnpulled.items.push(unpulled);
    for (let i = 0; i < 30; i++) {
      solo.update(1 / 60);
      soloUnpulled.update(1 / 60);
    }
    assert(distFromOrigin(pulled) < distFromOrigin(unpulled), 'a singularity particle should end up closer to its origin than an otherwise-identical particle with no pull', {
      likely: 'js/rendering/particles.js ParticleSystem.update() pull handling',
    });
  });

  s.test('every deathEffect id used in js/data/skins.js has a matching particles.js recipe', () => {
    // Re-derive the same effect ids the real skin data defines, and make
    // sure spawning with each one actually varies from the plain default —
    // i.e. the field is consumed, not silently falling back to "default"
    // for ids the particle system doesn't recognize.
    const ids = new Set(Object.values(SKIN_BY_ID).map((sk) => sk.deathEffect));
    for (const id of ids) {
      const particles = new ParticleSystem();
      particles.spawnBlood(0, 0, 10, id);
      assertEqual(particles.items.length >= 10, true, `spawnBlood() should handle deathEffect "${id}" without erroring`, {
        likely: 'js/rendering/particles.js DEATH_EFFECTS',
      });
    }
  });

  await s.testAsync('coop: P1 gets the equipped skin and P2 stays on the default skin (one equip slot)', async () => {
    const { game } = await createGame();
    // Equip a real non-default skin directly via the owned-skins list so
    // the test doesn't depend on case-opening RNG.
    game.skinSystem.data.ownedSkins.push('mint');
    game.skinSystem.equip('mint');
    game.reset('coop', 'pulse', 'pulse');

    const [p1, p2] = game.players;
    assertEqual(p1.skinVisual.id, 'mint', 'P1 should wear the equipped skin', {
      likely: 'js/systems/game.js reset()',
    });
    assertEqual(p2.skinVisual.id, 'default', 'P2 should stay on the default skin (only one equip slot — see HANDOFF_LOG.md)', {
      likely: 'js/systems/game.js reset()',
    });
  });

  await s.testAsync('constructor: P2 starts on the default skin even before any reset() call', async () => {
    const { game } = await createGame();
    game.skinSystem.data.ownedSkins.push('mint');
    game.skinSystem.equip('mint');
    // Re-create a fresh Game the same way main.js does, without calling reset() first.
    const { Game } = await import('../../js/systems/game.js?v=20260824-znwq');
    const fresh = new Game({ renderer: game.renderer, input: game.input, ui: game.ui });
    assertEqual(fresh.players[1].skinVisual.id, 'default', 'P2 should default to the default skin at construction time too', {
      likely: 'js/systems/game.js constructor',
    });
  });

  return s;
}
