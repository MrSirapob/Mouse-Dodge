// tests/simulation/balance-regression.test.mjs
//
// Compares a live, deterministic simulation of W1-4 against the recorded
// baseline in tests/fixtures/balance-baseline.json, within a tolerance band
// (spec §12: "±15%, not an exact number"). This is the test that would have
// caught an AI accidentally nerfing Bullet Hell density while refactoring
// something else.
//
// IMPORTANT — Balance Baseline Policy (spec §38, also in tests/README.md):
// If a FAIL here reflects an intentional balance change, do not "fix" it by
// quietly editing balance-baseline.json. Regenerate it deliberately (see
// tests/README.md "Updating the baseline"), explain the old/new values and
// why in HANDOFF_LOG.md, then rerun `npm test`.

import { TestSuite, assert, warn } from '../helpers/assertions.mjs';
import { simulateWave } from '../helpers/simulation.mjs';

async function readBaseline() {
  const fs = await import('node:fs/promises');
  const url = new URL('../fixtures/balance-baseline.json', import.meta.url);
  return JSON.parse(await fs.readFile(url, 'utf8'));
}

export async function run() {
  const s = new TestSuite('REGRESSION: Wave Density vs Baseline');

  const baseline = await readBaseline();
  const tolerance = baseline.tolerance ?? 0.15;

  for (let n = 1; n <= 4; n++) {
    const expected = baseline.waves[`wave${n}`];
    if (!expected) continue;

    await s.testAsync(`W${n} peakActive is within ${Math.round(tolerance * 100)}% of the baseline (${expected.peakActive})`, async () => {
      const r = await simulateWave(n);
      const low = expected.peakActive * (1 - tolerance);
      const high = expected.peakActive * (1 + tolerance);
      assert(r.activePeak >= low && r.activePeak <= high,
        `W${n} projectile density regression`,
        {
          expected: `${expected.peakActive} +/- ${Math.round(tolerance * 100)}% => [${Math.round(low)}, ${Math.round(high)}]`,
          actual: r.activePeak,
          likely: `js/systems/waveSystem.js case ${n} pattern timing/count, or an intentional balance change — see "Balance Baseline Policy" in tests/README.md`,
        }
      );
    });

    await s.testAsync(`W${n} total spawned count is within ${Math.round(tolerance * 100)}% of the baseline (${expected.spawned})`, async () => {
      const r = await simulateWave(n);
      const low = expected.spawned * (1 - tolerance);
      const high = expected.spawned * (1 + tolerance);
      if (!(r.spawned >= low && r.spawned <= high)) {
        // Slightly softer than peakActive: total spawn count is more
        // sensitive to minor timing shifts without being a real balance
        // problem, so this is a WARN rather than a hard FAIL.
        return warn(`W${n} total spawned (${r.spawned}) drifted outside +/-${Math.round(tolerance * 100)}% of baseline (${expected.spawned}, range [${Math.round(low)}, ${Math.round(high)}]) — worth a look.`);
      }
    });

    await s.testAsync(`W${n} bulletCap() still matches the baseline's recorded cap (${expected.cap})`, async () => {
      const r = await simulateWave(n);
      assert(r.cap === expected.cap, `W${n} bulletCap() changed since the baseline was recorded`, {
        expected: expected.cap,
        actual: r.cap,
        likely: 'js/core/config.js CONFIG.bullets.capEarly, or js/systems/game.js bulletCap()',
      });
    });
  }

  await s.testAsync('the baseline file itself is well-formed (guards against a hand-edited/corrupted fixture)', async () => {
    assert(typeof baseline.tolerance === 'number' && baseline.tolerance > 0 && baseline.tolerance < 1, 'balance-baseline.json tolerance must be a fraction in (0,1)');
    for (let n = 1; n <= 4; n++) {
      const w = baseline.waves[`wave${n}`];
      assert(w, `balance-baseline.json is missing an entry for wave${n}`, { likely: 'tests/fixtures/balance-baseline.json' });
      assert(typeof w.peakActive === 'number' && w.peakActive > 0, `wave${n}.peakActive must be a positive number`);
      assert(Array.isArray(w.patterns) && w.patterns.length > 0, `wave${n}.patterns must be a non-empty array`);
    }
  });

  return s;
}
