// tests/unit/config.test.mjs
//
// Static structure checks on the CONFIG / GRAZE_REWARD tuning surface
// (js/core/config.js). These don't assert specific balance numbers (that's
// tests/simulation/balance-regression.test.mjs's job) — just that the shape
// AI edits are expected to touch stays intact and internally consistent.

import { TestSuite, assert, assertNoNaN, assertInRange } from '../helpers/assertions.mjs';
import { CONFIG, GRAZE_REWARD } from '../../js/core/config.js?v=20260821-r5h8';

export function run() {
  const s = new TestSuite('STRUCTURE: Config');

  s.test('CONFIG.world has positive width/height', () => {
    assertNoNaN(CONFIG.world.width, 'CONFIG.world.width');
    assertNoNaN(CONFIG.world.height, 'CONFIG.world.height');
    assert(CONFIG.world.width > 0 && CONFIG.world.height > 0, 'World dimensions must be positive');
  });

  s.test('CONFIG.player.radius is a positive, sane number', () => {
    assertNoNaN(CONFIG.player.radius, 'CONFIG.player.radius');
    assertInRange(CONFIG.player.radius, 1, 100, 'Player radius should be a small positive hitbox');
  });

  s.test('CONFIG.lives.max is a positive integer', () => {
    assert(Number.isInteger(CONFIG.lives.max) && CONFIG.lives.max > 0, 'lives.max must be a positive integer', {
      expected: 'positive integer',
      actual: CONFIG.lives.max,
    });
  });

  s.test('every CONFIG.skills entry has a positive cooldown', () => {
    for (const [name, skill] of Object.entries(CONFIG.skills)) {
      assertNoNaN(skill.cooldown, `CONFIG.skills.${name}.cooldown`);
      assert(skill.cooldown > 0, `CONFIG.skills.${name}.cooldown must be > 0`, {
        expected: '> 0',
        actual: skill.cooldown,
        likely: `js/core/config.js CONFIG.skills.${name}`,
      });
    }
  });

  s.test('bullet caps are all positive and W1-4/W5 are intentionally distinct', () => {
    const b = CONFIG.bullets;
    for (const key of ['capEarly', 'capW5', 'capMid', 'capHigh', 'capLate', 'capEndless']) {
      assertNoNaN(b[key], `CONFIG.bullets.${key}`);
      assert(b[key] > 0, `CONFIG.bullets.${key} must be > 0`);
    }
    // See AGENTS.md / config.js comments: capW5 was deliberately split out
    // from capEarly so raising W1-4 density never silently changes boss
    // balance. If a future edit makes them equal again, that guarantee is
    // gone (may be intentional — but it should be a conscious choice).
    if (b.capW5 === b.capEarly) {
      return { __warn: true, message: 'capW5 now equals capEarly — confirm this is intentional (they were deliberately split in the Bullet Hell update).' };
    }
  });

  s.test('CONFIG.bullets.bulletHell cleanup tuning is present and positive', () => {
    const bh = CONFIG.bullets.bulletHell;
    assert(bh && typeof bh === 'object', 'CONFIG.bullets.bulletHell must exist (used by Game.cleanupConfig() for W1-4)');
    for (const key of ['cleanupStart', 'cleanupPerFrame', 'cleanupCooldown']) {
      assertNoNaN(bh[key], `CONFIG.bullets.bulletHell.${key}`);
      assert(bh[key] > 0, `CONFIG.bullets.bulletHell.${key} must be > 0`);
    }
    assertInRange(bh.cleanupStart, 0, 1, 'cleanupStart is a density fraction, must be in [0,1]');
  });

  s.test('default (non-bulletHell) cleanup tuning is present and positive', () => {
    const c = CONFIG.bullets;
    for (const key of ['cleanupStart', 'cleanupPerFrame', 'cleanupCooldown']) {
      assertNoNaN(c[key], `CONFIG.bullets.${key}`);
      assert(c[key] > 0, `CONFIG.bullets.${key} must be > 0`);
    }
    assertInRange(c.cleanupStart, 0, 1, 'cleanupStart is a density fraction, must be in [0,1]');
  });

  s.test('rank thresholds are sorted descending by score and end at 0', () => {
    const t = CONFIG.rank.thresholds;
    assert(Array.isArray(t) && t.length > 0, 'rank.thresholds must be a non-empty array');
    for (let i = 1; i < t.length; i++) {
      assert(t[i].min <= t[i - 1].min, `rank.thresholds must be sorted by descending min (index ${i}: ${t[i].rank}=${t[i].min} after ${t[i - 1].rank}=${t[i - 1].min})`, {
        likely: 'js/core/config.js CONFIG.rank.thresholds ordering',
      });
    }
    assert(t[t.length - 1].min === 0, 'The lowest rank threshold should be 0 so every score maps to a rank', {
      expected: 0,
      actual: t[t.length - 1].min,
    });
  });

  s.test('item spawn weights are all positive and spawnMin <= spawnMax', () => {
    const items = CONFIG.items;
    for (const [type, weight] of Object.entries(items.weights)) {
      assert(weight > 0, `CONFIG.items.weights.${type} must be > 0`);
    }
    assert(items.spawnMin <= items.spawnMax, 'CONFIG.items.spawnMin must be <= spawnMax', {
      expected: `spawnMin(${items.spawnMin}) <= spawnMax(${items.spawnMax})`,
      actual: `spawnMin > spawnMax`,
    });
  });

  s.test('GRAZE_REWARD.maxReduction is a valid fraction (0,1]', () => {
    assertInRange(GRAZE_REWARD.maxReduction, 0, 1, 'GRAZE_REWARD.maxReduction should be a fraction of a cooldown');
  });

  s.test('GRAZE_REWARD combo tiers increase with combo size (base <= combo5 <= combo10 <= combo20)', () => {
    const g = GRAZE_REWARD;
    assert(
      g.base <= g.combo5 && g.combo5 <= g.combo10 && g.combo10 <= g.combo20,
      'Graze cooldown-recovery reward should not decrease as combo tier rises',
      { expected: 'base <= combo5 <= combo10 <= combo20', actual: `${g.base}, ${g.combo5}, ${g.combo10}, ${g.combo20}` }
    );
  });

  s.test('CONFIG object is frozen where documented (GRAZE_REWARD)', () => {
    assert(Object.isFrozen(GRAZE_REWARD), 'GRAZE_REWARD should stay Object.freeze()d — accidental runtime mutation would be a hard-to-find bug');
  });

  return s;
}
