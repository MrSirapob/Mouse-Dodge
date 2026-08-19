#!/usr/bin/env node
// tests/run-all.mjs
//
// The single entry point behind `npm test`. Imports every test module,
// runs its exported run() (each returns a TestSuite, or a Promise of one),
// prints one unified AI-readable report (see tests/README.md), and exits
// non-zero iff there is at least one FAIL — exactly what an AI editor's
// "before/after changes" workflow (see AGENTS.md) checks.
//
// Supports filtering to a subset of categories:
//   node tests/run-all.mjs                 -> everything
//   node tests/run-all.mjs unit             -> tests/unit/** only
//   node tests/run-all.mjs simulation       -> tests/simulation/** only
//   node tests/run-all.mjs integration      -> tests/integration/** only
// (see package.json scripts: test:unit / test:simulation / test:integration)

import { runSuites } from './helpers/assertions.mjs';

const CATEGORIES = {
  unit: [
    './unit/config.test.mjs',
    './unit/wave.test.mjs',
    './unit/bullet.test.mjs',
    './unit/player.test.mjs',
    './unit/skill.test.mjs',
    './unit/item.test.mjs',
    './unit/score.test.mjs',
    './unit/game-state.test.mjs',
    './unit/devmode-docs.test.mjs',
    './unit/game-loop-timescale.test.mjs',
  ],
  simulation: [
    './simulation/wave-simulation.test.mjs',
    './simulation/bullethell-simulation.test.mjs',
    './simulation/balance-regression.test.mjs',
  ],
  balance: [
    './simulation/balance-regression.test.mjs',
  ],
  integration: [
    './integration/wave-flow.test.mjs',
    './integration/skill-flow.test.mjs',
    './integration/graze-score-flow.test.mjs',
    './integration/game-over-flow.test.mjs',
  ],
};

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const categories = requested.length > 0 ? requested : Object.keys(CATEGORIES);

  for (const cat of categories) {
    if (!CATEGORIES[cat]) {
      console.error(`Unknown test category "${cat}". Valid categories: ${Object.keys(CATEGORIES).join(', ')}`);
      process.exit(2);
    }
  }

  const start = Date.now();
  const suites = [];
  const loadErrors = [];

  for (const cat of categories) {
    for (const rel of CATEGORIES[cat]) {
      try {
        const mod = await import(rel);
        const result = await mod.run();
        // A module may export multiple suites (array) or one (TestSuite).
        if (Array.isArray(result)) suites.push(...result);
        else suites.push(result);
      } catch (err) {
        // A test FILE itself throwing (import error, syntax error, an
        // uncaught exception escaping run()) is exactly the kind of
        // "syntax error / missing function" regression this suite exists
        // to catch — surface it as a FAIL section, don't let it silently
        // skip that file's coverage or crash the whole run without a report.
        loadErrors.push({ rel, err });
      }
    }
  }

  for (const { rel, err } of loadErrors) {
    const { TestSuite } = await import('./helpers/assertions.mjs');
    const errorSuite = new TestSuite(`LOAD ERROR: ${rel}`);
    errorSuite.results.push({
      name: `import/run ${rel}`,
      status: 'FAIL',
      message: err && err.message ? err.message : String(err),
      actual: err && err.stack ? err.stack.split('\n').slice(0, 5).join(' | ') : undefined,
      likely: 'The test file itself, OR a source file it imports (syntax error / missing export)',
    });
    suites.push(errorSuite);
  }

  const { totalPass, totalFail, totalWarn, exitCode } = runSuites(suites);
  const durationMs = Date.now() - start;

  console.log(`\nTotal:    ${totalPass + totalFail + totalWarn}`);
  console.log(`Passed:   ${totalPass}`);
  console.log(`Failed:   ${totalFail}`);
  console.log(`Warnings: ${totalWarn}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(2)}s`);

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('FATAL: test runner itself crashed before producing a report:');
  console.error(err);
  process.exit(1);
});
