# tests/ — Automated Test Suite for AI Development

This is a **development guardrail**, not a player-facing feature. It exists
so any AI (or human) editing this codebase can run one command and know
whether gameplay, waves, Bullet Hell, skills, score, graze, items, and
related systems still work — before and after a change.

```bash
npm test                  # everything
npm run test:unit         # tests/unit/**        — fast structural/logic checks
npm run test:simulation   # tests/simulation/**   — deterministic wave/bullet simulations
npm run test:integration  # tests/integration/**  — full-flow checks
npm run test:balance      # just tests/simulation/balance-regression.test.mjs
```

`npm test` exits non-zero (and CI-style tooling should treat that as a
failure) iff there is at least one **FAIL**. Warnings do not affect the
exit code.

## Principles (read this before adding a test)

- **Real implementation only.** Every test imports and exercises the
  actual modules under `js/**` — `Game`, `WaveSystem`, `PatternLibrary`,
  `Player`, `BulletManager`, `SkillSystem`, `ItemSystem`, `LifeSystem`.
  Nothing here reimplements gameplay logic or mocks it out. A FAIL means
  the shipped code actually behaves differently than expected.
- **No browser required.** `tests/helpers/gameFactory.mjs` builds a real
  `Game` with minimal fake `renderer`/`input`/`ui` collaborators (the same
  dependency-injection seam `js/main.js` already uses) plus inert
  `document`/`localStorage`/`performance` shims so Node doesn't choke on
  `js/systems/devMode.js`'s DOM touches. The shims don't fake any
  *behavior* the tests check — they exist purely so the real modules load.
- **Deterministic.** Anything that depends on `Math.random()` (spawn
  positions, item types, bouncer directions, ...) runs under a seeded PRNG
  (`tests/helpers/seededRandom.mjs`) so `npm test` produces the same result
  today and tomorrow. If you write a new simulation-style test and it uses
  randomness, seed it — don't leave it to real `Math.random()`.
- **Don't overfit.** Tests check behavior and structural invariants (a
  pattern's argument contract, a cap being respected, a gap being
  passable), not exact implementation details like literal function-call
  source text. The goal is catching regressions, not preventing you from
  rebalancing or refactoring.

## Structure

```
tests/
├── helpers/
│   ├── assertions.mjs    — the test harness itself (TestSuite, assert*, runSuites)
│   ├── gameFactory.mjs   — builds a real headless Game + DOM/browser shims
│   ├── seededRandom.mjs  — deterministic Math.random() for simulations
│   └── simulation.mjs    — simulateWave() / capturePatternPlan() / maxConcurrent()
├── unit/                 — one system per file, mostly synchronous, no full wave sim
├── simulation/           — deterministic wave-density simulations, wall/ring safety, baseline regression
├── integration/          — multi-system flows driven through real Game.update() ticks
├── fixtures/
│   └── balance-baseline.json  — recorded W1-4 density/pattern baseline (see below)
└── run-all.mjs            — the `npm test` entry point; aggregates every *.test.mjs
```

Each `*.test.mjs` file exports an async `run()` that returns a
`TestSuite` (or an array of them). `run-all.mjs` imports every file listed
in its `CATEGORIES` map, awaits `run()`, and prints one unified report. If
you add a new test file, **add it to the `CATEGORIES` list in
`tests/run-all.mjs`** or it will silently not run as part of `npm test`.

## Reading a test result

```
[BULLET HELL: W1-4 Simulation]
✓ PASS - W1 never exceeds bulletCap() (420) for normal bullets
✗ FAIL - W3 total spawned count is within 15% of the baseline
    WHAT FAILED: W3 total spawned count is within 15% of the baseline
    EXPECTED:    1355 +/- 15% => [1152, 1558]
    ACTUAL:      950
    LIKELY AREA: js/systems/waveSystem.js case 3 pattern timing/count, ...
```

- **PASS** — behaved as expected.
- **WARN** — worth a look, doesn't fail the build (e.g. "this metric
  dropped noticeably, confirm it's intentional"). Never blocks `npm test`.
- **FAIL** — a real regression. Read WHAT FAILED / EXPECTED / ACTUAL, then
  go straight to LIKELY AREA (when present) to start debugging — you
  shouldn't need to read the test file itself to know where to look.

## Balance Baseline Policy

`tests/fixtures/balance-baseline.json` records real, measured W1-4
Bullet-Hell metrics (peak/average active bullets, total spawned, pattern
coverage, max concurrent patterns) from an actual seeded simulation run —
**not hand-typed guesses**. `tests/simulation/balance-regression.test.mjs`
compares a fresh simulation against it with a **±15% tolerance**
(`baseline.tolerance`), so small, incidental timing drift doesn't fail the
build, but a real density change (e.g. Wave 3 accidentally losing half its
pressure) does.

**Do not edit `balance-baseline.json` just to make a FAIL go away.** If a
FAIL reflects an intentional balance change:

1. Regenerate the baseline deliberately (see "Updating the baseline"
   below) — don't hand-edit numbers.
2. In `HANDOFF_LOG.md`, state: what the old value was, what the new value
   is, and *why* the balance changed.
3. Re-run `npm test` and confirm everything is green before handing off.

### Updating the baseline

```js
// From the project root:
node -e "
import('./tests/helpers/simulation.mjs').then(async (m) => {
  const out = { tolerance: 0.15, generatedFrom: 'tests/helpers/simulation.mjs simulateWave() + capturePatternPlan(), seed=1000+wave, fixed dt=1/60', waves: {} };
  for (const n of [1,2,3,4]) {
    const r = await m.simulateWave(n);
    const plan = await m.capturePatternPlan(n);
    out.waves['wave'+n] = {
      cap: r.cap, peakActive: r.activePeak,
      averageActive: Math.round(r.activeAverage*100)/100,
      spawned: r.spawned, patterns: plan.patterns,
      maxConcurrentPatterns: m.maxConcurrent(plan.events),
    };
  }
  const fs = await import('node:fs/promises');
  await fs.writeFile('tests/fixtures/balance-baseline.json', JSON.stringify(out, null, 2) + '\n');
  console.log('written');
});
"
```

Review the diff before committing — every changed number should be
explainable by a change you intentionally made.

## Known approximations (read before trusting overlap/pattern-timing numbers to the pixel)

- **`capturePatternPlan()`** (`tests/helpers/simulation.mjs`) determines
  *which* pattern methods a wave's `build()` call invokes, and estimates
  each call's active time window from its own arguments (e.g. `aimed`'s
  window is `(count-1) * interval`). This is accurate for "did this
  pattern fire" and "roughly when/how long", but is a heuristic, not a
  hitbox-perfect timeline — telegraph/warmup windows for `ring`/`spiral`
  use a fixed estimate, not the exact source constant. Good enough for
  pattern-coverage and overlap-count checks; don't use it to assert
  frame-exact timing.
- **`simulateWave()`**'s `cleanupRemoved` counter reflects real calls to
  `Game.cleanupBulletsForCapacity()`, but that method can legitimately
  remove 0 bullets on a given call (e.g. if every current bullet is within
  the "near player" exclusion radius) — a low or zero `cleanupRemoved`
  with a high `dropped` count is not automatically a bug.
- **Wall-segment "widest gap" checks** (`bullethell-simulation.test.mjs`)
  measure center-to-center spacing between the outermost surviving
  segments around the gap and subtract both radii; they don't render
  pixels or run the game's actual collision loop frame-by-frame through
  the gap. `js/core/collision.js`'s real `circleHit()` is used for the
  most direct pass/fail check ("virtual player standing in gap" test).

## Adding a new test

1. Pick the right folder: `unit/` for one system in isolation,
   `simulation/` for anything that needs `simulateWave()`/deterministic
   randomness, `integration/` for a flow across multiple systems driven by
   real `Game.update()` ticks.
2. Import real modules — `js/systems/game.js`, `js/core/config.js`, etc.
   Use `tests/helpers/gameFactory.mjs`'s `createGame()`/`jumpToWave()`/
   `tick()` rather than constructing `Game` by hand.
3. Use `TestSuite`/`assert*`/`warn` from `tests/helpers/assertions.mjs`.
   Prefer the specific `assert*` helpers (`assertEqual`, `assertClose`,
   `assertInRange`, `assertNoNaN`) over a bare `assert(a === b)` — they
   produce better EXPECTED/ACTUAL output on failure.
4. Add a `likely:` hint pointing at the file/function to check when a test
   could plausibly fail from a real regression — that's what makes a FAIL
   AI-actionable instead of just a red X.
5. Add the new file to `CATEGORIES` in `tests/run-all.mjs`.
6. Run `npm test` and confirm your new test is present and green (or a
   correctly-red FAIL if you're demonstrating a bug you haven't fixed
   yet).

## What this suite deliberately does NOT do

- No browser/E2E suite (no headless Chrome, no pixel screenshots). Per the
  original spec for this suite, that's out of scope for this pass.
- No mouse/pointer simulation of real input — `Player.updateMouse()` /
  `updateKeyboard()` are unit-tested directly instead.
- No rendering assertions — `js/rendering/renderer.js` and `js/ui/ui.js`
  are UI-facing and are exercised only through the fake `renderer`/`ui`
  objects in `gameFactory.mjs`, which record calls but don't assert on
  visuals.
