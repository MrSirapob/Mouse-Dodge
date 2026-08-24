// tests/unit/skill.test.mjs
//
// Skill tests (js/systems/skillSystem.js) run against a real Game instance,
// since skills call back into Game (removeBulletsInRadius, addSkillEffect,
// particles, state.shakeMag, etc) — not reimplemented here.
//
// Skill list is read from CONFIG.skills / SkillSystem's own prototype, not
// hardcoded, so this test keeps working if a skill is added or renamed.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { createGame, jumpToWave } from '../helpers/gameFactory.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260824-88u1';
import { SkillSystem } from '../../js/systems/skillSystem.js?v=20260824-88u1';

// Methods on SkillSystem.prototype that are actual skills (not use()/finish()).
const NON_SKILL_METHODS = new Set(['constructor', 'use', 'finish']);
function listSkillNames() {
  return Object.getOwnPropertyNames(SkillSystem.prototype).filter((n) => !NON_SKILL_METHODS.has(n));
}

export async function run() {
  const s = new TestSuite('SKILLS');

  s.test('every skill in SkillSystem has a matching CONFIG.skills entry with cooldown', () => {
    for (const name of listSkillNames()) {
      assert(CONFIG.skills[name], `CONFIG.skills.${name} is missing for SkillSystem.${name}()`, {
        likely: 'js/core/config.js CONFIG.skills',
      });
      assert(typeof CONFIG.skills[name].cooldown === 'number', `CONFIG.skills.${name}.cooldown is missing/not a number`);
    }
  });

  await s.testAsync('use() activates a ready skill, sets cooldown, and returns true', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    assertEqual(player.skillCooldown, 0, 'A fresh player should start with no skill cooldown');
    const ok = game.skillSystem.use(player);
    assert(ok === true, `skillSystem.use() should succeed for a fresh player using "${game.state.skill}"`, {
      likely: 'js/systems/skillSystem.js use()/finish()',
    });
    assert(player.skillCooldown > 0, 'skillCooldown must be set (>0) immediately after a successful skill use', {
      likely: 'js/systems/skillSystem.js finish()',
    });
  });

  await s.testAsync('cooldown never goes negative and blocks reuse until it reaches 0', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.skillSystem.use(player);
    const cooldownSet = player.skillCooldown;
    assert(cooldownSet > 0, 'Precondition: skill should be on cooldown after use');

    const again = game.skillSystem.use(player);
    assert(again === false, 'use() must refuse to activate the same skill again while on cooldown', {
      likely: 'js/systems/skillSystem.js use() guard: player.skillCooldown > 0',
    });

    // Tick past the cooldown; player.tick() floors at 0 (see player.test.mjs).
    for (let i = 0; i < 6000 && player.skillCooldown > 0; i++) player.tick(1 / 60);
    assert(player.skillCooldown >= 0, 'skillCooldown must never go negative', { actual: player.skillCooldown });
    assertEqual(player.skillCooldown, 0, 'skillCooldown should reach exactly 0 once fully elapsed');

    const afterCooldown = game.skillSystem.use(player);
    assert(afterCooldown === true, 'use() should succeed again once the cooldown has fully elapsed', {
      likely: 'js/systems/skillSystem.js use() guard',
    });
  });

  await s.testAsync('use() refuses for a dead/down player, and while the game is not playing', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    player.down = true;
    assert(game.skillSystem.use(player) === false, 'use() must refuse for a down player', {
      likely: 'js/systems/skillSystem.js use() guard: !player.isAlive()',
    });
    player.down = false;

    game.state.state = 'menu'; // GameState.state (not .mode) drives isPlaying(); see js/core/gameState.js
    assert(game.skillSystem.use(player) === false, 'use() must refuse when state.isPlaying() is false', {
      likely: 'js/systems/skillSystem.js use() guard: !this.game.state.isPlaying()',
    });
  });

  await s.testAsync('pulse/nova clear bullets within their radius around the player', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    game.state.skill = 'pulse';
    const radius = CONFIG.skills.pulse.radius;
    game.spawnBullet(player.x + radius * 0.3, player.y, 0, 0, 5, '#fff'); // inside
    game.spawnBullet(player.x + radius * 5, player.y, 0, 0, 5, '#fff'); // far outside
    assertEqual(game.bullets.items.length, 2, 'precondition: 2 bullets spawned');
    game.skillSystem.use(player);
    assertEqual(game.bullets.items.length, 1, 'pulse should remove only the bullet within its radius', {
      likely: 'js/systems/game.js removeBulletsInRadius()',
    });
    assert(game.bullets.items[0].x > player.x + radius, 'the remaining bullet should be the far, out-of-radius one');
  });

  await s.testAsync('shield grants shieldTimer > 0 and canBeHit() becomes false for its duration', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'shield';
    assert(player.canBeHit(), 'precondition: player should be hittable before shield');
    game.skillSystem.use(player);
    assertEqual(player.shieldTimer, CONFIG.skills.shield.duration, 'shieldTimer should be set to CONFIG.skills.shield.duration');
    assert(!player.canBeHit(), 'player should NOT be hittable immediately after activating shield', {
      likely: 'js/entities/player.js canBeHit()',
    });
  });

  await s.testAsync('heal refuses at full life and heals exactly 1 life otherwise, never exceeding max', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'heal';
    assertEqual(player.lives, CONFIG.lives.max, 'precondition: full lives');
    const okAtFull = game.skillSystem.use(player);
    assertEqual(okAtFull, false, 'heal must refuse to activate at full lives (nothing to heal)', {
      likely: 'js/systems/skillSystem.js heal() guard: player.lives >= CONFIG.lives.max',
    });
    assertEqual(player.skillCooldown, 0, 'a refused heal must NOT put the skill on cooldown');

    player.lives = CONFIG.lives.max - 1;
    const ok = game.skillSystem.use(player);
    assertEqual(ok, true, 'heal should succeed when below full lives');
    assertEqual(player.lives, CONFIG.lives.max, 'heal should restore exactly 1 life, not exceed max');
  });

  await s.testAsync('slow sets a bounded slowScale (0,1) and a positive slowMoRemaining on the game state', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'slow';
    game.skillSystem.use(player);
    assert(game.state.slowMoRemaining > 0, 'slowMoRemaining should be positive right after activation');
    assert(game.state.slowScale > 0 && game.state.slowScale < 1, 'slowScale should represent a genuine slow-down factor in (0,1)', {
      actual: game.state.slowScale,
    });
  });

  await s.testAsync('timestop sets a positive timeStopRemaining on the game state', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'timestop';
    game.skillSystem.use(player);
    assert(game.state.timeStopRemaining > 0, 'timeStopRemaining should be positive right after activation', {
      likely: 'js/systems/skillSystem.js timestop()',
    });
  });

  await s.testAsync('repulse pushes nearby bullets outward without destroying them, and leaves far bullets untouched', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    game.actionQueue = [];
    const player = game.players[0];
    game.state.skill = 'repulse';
    const radius = CONFIG.skills.repulse.radius;
    game.spawnBullet(player.x + radius * 0.3, player.y, 0, 0, 5, '#fff'); // near
    game.spawnBullet(player.x + radius * 5, player.y, 0, 0, 5, '#fff'); // far
    const nearBefore = { ...game.bullets.items[0] };
    const farBefore = { ...game.bullets.items[1] };
    game.skillSystem.use(player);
    assertEqual(game.bullets.items.length, 2, 'repulse must not delete bullets, only push them');
    const nearAfter = game.bullets.items[0];
    const farAfter = game.bullets.items[1];
    assert(nearAfter.x > nearBefore.x || nearAfter.vx > nearBefore.vx, 'the near bullet should be pushed outward (position or velocity increases away from the player)', {
      likely: 'js/systems/skillSystem.js repulse()',
    });
    assertEqual(farAfter.x, farBefore.x, 'a bullet well outside the repulse radius should be untouched');
    assertEqual(farAfter.vx, farBefore.vx, 'a bullet well outside the repulse radius should keep its original velocity');
  });

  await s.testAsync('phase grants temporary invulnerability for CONFIG.skills.phase.duration', async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    game.state.skill = 'phase';
    game.skillSystem.use(player);
    assertEqual(player.invulnerable, CONFIG.skills.phase.duration, 'phase should set invulnerable to exactly CONFIG.skills.phase.duration');
    assert(!player.canBeHit(), 'player should not be hittable immediately after phase');
  });

  await s.testAsync("game state does not hang after a skill use (state stays 'playing')", async () => {
    const { game } = await createGame();
    jumpToWave(game, 1);
    const player = game.players[0];
    for (const name of listSkillNames()) {
      game.state.skill = name;
      player.skillCooldown = 0;
      if (name === 'heal') player.lives = CONFIG.lives.max - 1;
      game.skillSystem.use(player);
      assert(game.state.isPlaying(), `Game state should still be "playing" immediately after using ${name}()`, {
        likely: `js/systems/skillSystem.js ${name}()`,
      });
    }
  });

  return s;
}
