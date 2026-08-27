// tests/integration/skill-flow.test.mjs
//
// End-to-end skill flow: input action -> SkillSystem.use() -> visible
// effect (skillEffects) -> effect expiry, plus an item pickup instantly
// resetting cooldown mid-fight. Exercises the actual wiring Game's
// constructor sets up (input.onP1Action = () => skillSystem.use(...)),
// not a re-implementation of it.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave, tick } from '../helpers/gameFactory.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260827-zjts';

export async function run() {
  const s = new TestSuite('INTEGRATION: Skill Flow');

  await s.testAsync('pressing the action button (input.onP1Action) activates the equipped skill end-to-end', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'shield';
    assert(typeof game.input.onP1Action === 'function', 'Game constructor should wire input.onP1Action to the skill system', {
      likely: 'js/systems/game.js constructor: input.onP1Action = () => this.skillSystem.use(...)',
    });
    game.input.onP1Action();
    assertEqual(player.shieldTimer, CONFIG.skills.shield.duration, 'triggering the action button should activate the equipped skill (shield) end-to-end', {
      likely: 'js/systems/game.js input.onP1Action wiring',
    });
  });

  await s.testAsync('a used skill adds a visible skillEffect that expires and is cleaned up on its own', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'pulse';
    assertEqual(game.skillEffects.length, 0, 'precondition: no active skill effects');
    game.input.onP1Action();
    assert(game.skillEffects.length === 1, 'using a skill should add exactly one entry to skillEffects', {
      likely: 'js/systems/skillSystem.js pulse() -> game.addSkillEffect()',
    });
    const effect = game.skillEffects[0];
    assertEqual(effect.type, 'pulse', 'the skillEffect type should match the skill that was used');

    tick(game, Math.ceil((effect.duration + 0.1) * 60));
    assertEqual(game.skillEffects.length, 0, 'a skillEffect should be removed once its duration has fully elapsed', {
      likely: 'js/systems/game.js updateSkillEffects()',
    });
  });

  await s.testAsync('pressing the action button while on cooldown does nothing (no double effect, no cooldown reset)', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'pulse';
    game.input.onP1Action();
    const cooldownAfterFirst = player.skillCooldown;
    const effectsAfterFirst = game.skillEffects.length;

    game.input.onP1Action(); // immediate second press, still on cooldown
    assertEqual(game.skillEffects.length, effectsAfterFirst, 'a second action-button press while on cooldown must not add another skillEffect', {
      likely: 'js/systems/skillSystem.js use() cooldown guard',
    });
    assert(player.skillCooldown <= cooldownAfterFirst, 'a refused activation must not increase the remaining cooldown', {
      actual: player.skillCooldown,
      expected: `<= ${cooldownAfterFirst}`,
    });
  });

  await s.testAsync('an energy item picked up mid-cooldown makes the skill immediately usable again, end-to-end', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'shield';
    game.input.onP1Action(); // activate, goes on cooldown
    assert(player.skillCooldown > 0, 'precondition: skill on cooldown after use');

    game.itemSystem.items.push({ x: player.x, y: player.y, type: 'energy', r: CONFIG.items.radius, age: 0, ttl: CONFIG.items.ttl, bob: 0 });
    game.itemSystem.update(1 / 60); // player is standing on it -> picked up
    assertEqual(player.skillCooldown, 0, 'an energy pickup should zero out skillCooldown', { likely: 'js/systems/itemSystem.js collect() case "energy"' });

    const effectsBefore = game.skillEffects.length;
    game.input.onP1Action(); // should work again immediately
    assert(game.skillEffects.length > effectsBefore, 'the skill should be usable again immediately after an energy pickup clears its cooldown', {
      likely: 'js/systems/skillSystem.js use() cooldown guard + itemSystem energy effect',
    });
  });

  await s.testAsync('pause (input.onPause) blocks skill use, and resuming restores it', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'pulse';
    assert(typeof game.input.onPause === 'function', 'Game constructor should wire input.onPause to togglePause()', {
      likely: 'js/systems/game.js constructor: input.onPause = () => this.togglePause()',
    });
    game.input.onPause(); // PLAYING -> PAUSED
    assertEqual(game.state.state, 'paused', 'onPause() should pause the game');
    game.input.onP1Action();
    assertEqual(game.skillEffects.length, 0, 'a skill should not activate while the game is paused', {
      likely: 'js/systems/skillSystem.js use() guard: !this.game.state.isPlaying()',
    });

    game.input.onPause(); // PAUSED -> PLAYING
    assertEqual(game.state.state, 'playing', 'a second onPause() call should resume the game');
    game.input.onP1Action();
    assertEqual(game.skillEffects.length, 1, 'the skill should work again once resumed');
  });

  await s.testAsync('coop: each player has an independent cooldown and independent action button', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1, { mode: 'coop' });
    game.state.skill = 'pulse';
    game.state.skillP2 = 'shield';
    const p1 = game.players[0];
    const p2 = game.players[1];

    game.input.onP1Action();
    assert(p1.skillCooldown > 0, 'player 1 activating pulse should put player 1 on cooldown');
    assertEqual(p2.skillCooldown, 0, "player 1's skill use must not affect player 2's cooldown", {
      likely: 'js/systems/skillSystem.js use() — must operate on the passed player only',
    });

    game.input.onP2Action();
    assert(p2.shieldTimer > 0, "player 2's independent action button should activate player 2's own equipped skill (shield)", {
      likely: 'js/systems/game.js constructor: input.onP2Action = () => this.skillSystem.use(this.players[1])',
    });
  });

  return s;
}
