// tests/simulation/wave-simulation.test.mjs
//
// Deterministic simulation of W1-4 (the Bullet Hell tier) using the real
// Game.update() loop (see tests/helpers/simulation.mjs). Checks structural
// safety properties that must hold regardless of the current balance
// numbers: cap is respected, cleanup keeps the game from a NaN/Infinity
// meltdown, and difficulty broadly trends upward across multiple metrics
// (spec §13 — not just "more bullets = harder").

import { TestSuite, assert, assertNoNaN, warn } from '../helpers/assertions.mjs';
import { simulateWave, capturePatternPlan, maxConcurrent } from '../helpers/simulation.mjs';
import { CONFIG } from '../../js/core/config.js?v=20260824-gaom';

export async function run() {
  const s = new TestSuite('BULLET HELL: W1-4 Simulation');

  const results = {};
  for (const n of [1, 2, 3, 4]) {
    await s.testAsync(`W${n} simulation runs to completion without runaway spawning`, async () => {
      const r = await simulateWave(n);
      results[n] = r;
      assertNoNaN(r.activePeak, `W${n} activePeak`);
      assertNoNaN(r.activeAverage, `W${n} activeAverage`);
      assert(r.ticks > 0, `W${n} simulation should have run at least one tick`);
    });
  }

  for (const n of [1, 2, 3, 4]) {
    await s.testAsync(`W${n} never exceeds bulletCap() (${CONFIG.bullets.capEarly}) for normal bullets`, async () => {
      const r = results[n] ?? (await simulateWave(n));
      assert(r.activePeak <= r.cap, `W${n} activePeak must never exceed its bulletCap()`, {
        expected: `<= ${r.cap}`,
        actual: r.activePeak,
        likely: 'js/systems/game.js spawnBullet() cap enforcement',
      });
    });
  }

  await s.testAsync('difficulty broadly increases from W1 to W4 across multiple metrics (not just raw bullet count)', async () => {
    for (const n of [1, 2, 3, 4]) if (!results[n]) results[n] = await simulateWave(n);
    const plans = {};
    for (const n of [1, 2, 3, 4]) plans[n] = await capturePatternPlan(n);

    const metrics = {
      peakActive: [1, 2, 3, 4].map((n) => results[n].activePeak),
      averageActive: [1, 2, 3, 4].map((n) => results[n].activeAverage),
      spawned: [1, 2, 3, 4].map((n) => results[n].spawned),
      maxConcurrentPatterns: [1, 2, 3, 4].map((n) => maxConcurrent(plans[n].events)),
      patternVariety: [1, 2, 3, 4].map((n) => plans[n].patterns.length),
    };

    // Not every metric must strictly increase every wave (spec §13
    // explicitly warns against a naive "W4 bullets > W3 bullets" test) —
    // but overall, later waves should not be broadly EASIER than earlier
    // ones. Check that W4 beats W1 on a majority of metrics, and no metric
    // collapses (W4 less than half of W1).
    const metricNames = Object.keys(metrics);
    let w4BeatsW1 = 0;
    const collapsed = [];
    for (const name of metricNames) {
      const vals = metrics[name];
      if (vals[3] >= vals[0]) w4BeatsW1++;
      if (vals[0] > 0 && vals[3] < vals[0] * 0.5) collapsed.push(name);
    }

    assert(w4BeatsW1 >= Math.ceil(metricNames.length / 2), 'W4 should be at least as demanding as W1 on a majority of difficulty metrics', {
      expected: `>= ${Math.ceil(metricNames.length / 2)} of ${metricNames.length} metrics`,
      actual: `${w4BeatsW1} of ${metricNames.length} (${JSON.stringify(metrics)})`,
      likely: 'js/systems/waveSystem.js case 1..4 tuning',
    });
    assert(collapsed.length === 0, `Some difficulty metrics collapsed by more than half from W1 to W4: ${collapsed.join(', ')}`, {
      likely: 'js/systems/waveSystem.js case 4 (or the metric list itself needs review)',
    });
  });

  for (let i = 1; i <= 3; i++) {
    await s.testAsync(`W${i} -> W${i + 1} peak density does not regress by more than 30% (soft progression check)`, async () => {
      if (!results[i]) results[i] = await simulateWave(i);
      if (!results[i + 1]) results[i + 1] = await simulateWave(i + 1);
      const a = results[i].activePeak;
      const b = results[i + 1].activePeak;
      if (b < a * 0.7) {
        return warn(`W${i + 1} peak density (${b}) is notably lower than W${i} (${a}) — confirm this drop is intentional.`);
      }
    });
  }

  return s;
}
