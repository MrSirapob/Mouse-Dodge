# Changelog

## Dev Mode SPEED bullet-tunneling fix (clamp-vs-scale ordering)
- **Fixed: `Game.loop()` could produce a physics-unsafe dt at high Dev Mode
  SPEED.** Flagged by code review (see "Doc/code mismatch" entry above,
  same review pass) but not fixed at the time. The frame-time formula was
  `Math.min(frameDt, 0.05) * timeScale` — clamping to the collision
  model's 0.05s safety ceiling *before* applying Dev Mode's `timeScale`
  multiplier. `updateBullets()` moves bullets with a single
  `b.x += b.vx * dt * 60` position update per frame and checks collision
  with a plain `circleHit()` (no swept/continuous collision anywhere in
  the codebase), so that 0.05s ceiling is the effective contract the whole
  collision model assumes. On a slow/stuttering frame (frameDt already
  near 0.05s) combined with SPEED 3×, the old formula could produce an
  effective dt up to 0.15s — enough for a fast bullet (or a
  keyboard-controlled player) to skip clean past a collision radius in a
  single step: real bullet tunneling. At a steady frame rate this rarely
  showed up (3× × ~0.0167s ≈ the same 0.05s ceiling either way), which is
  why it went unnoticed until reviewed deliberately.
  - **Fix:** swap the order — `Math.min(frameDt * timeScale, 0.05)`, i.e.
    scale first, then clamp. This is a no-op at any steady frame rate
    (verified numerically: identical output to the old formula at 60fps
    for timeScale 1 and 3) but now caps the effective dt to 0.05s
    unconditionally, regardless of timeScale, eliminating the spike case.
    Deliberately not a substep/multi-update refactor — the existing 0.05s
    ceiling was already the game's established safety contract; this just
    stops Dev Mode from being able to bypass it.
  - **New regression test:** `tests/unit/game-loop-timescale.test.mjs`
    drives the real `Game.loop()` with controlled `now`/`lastTime` and a
    stubbed `update()` (to stay synchronous, no dangling
    `requestAnimationFrame` recursion), covering steady-framerate and
    stutter-frame cases at timeScale 1 and 3. Verified this test correctly
    FAILs against the pre-fix formula (temporarily reverted, confirmed the
    stutter+timeScale=3 case reports `dt: 0.15000000000000002` exceeding
    the 0.05 ceiling) before restoring the fix. Registered in
    `tests/run-all.mjs`'s `unit` category.
  - **File:** `js/systems/game.js` (`loop()`).

## Doc/code mismatch: `AGENTS.md`'s "already clean" file list
- **Fixed: `js/core/collision.js`, `js/entities/boss.js`, and
  `js/rendering/particles.js` were still dense, single-line, semicolon-
  chained code (short vars, no line breaks) — the exact style the
  "Maintainability pass" (see below) reformatted everywhere else — but
  `AGENTS.md` listed all three under files "already clean and
  single-purpose" alongside `config.js`/`gameState.js`/`player.js`/etc.
  That's a doc/code mismatch that could make a future session skip
  reformatting them on the mistaken assumption they'd already been done.
  Reformatted all three to the same multi-line, named-variable style as
  the rest of the codebase; `AGENTS.md`'s file list is now accurate again.
  - **Behavior is byte-for-byte unchanged** — verified by diffing the
    whitespace-normalized token stream of each file against the original
    before committing (only whitespace/comments/a trailing comma differ).
  - `npm test` (175 PASS / 0 FAIL / 0 WARN), `npm run check-versions`, and
    `node scripts/verify-bullethell-fix.mjs` all still pass after the
    reformat.
  - **Files:** `js/core/collision.js`, `js/entities/boss.js`,
    `js/rendering/particles.js`.

## W1-4 AIM balance tuning
- **Reduced AIM (`AIMED` pattern) density and raised its speed, W1-4 only.**
  Per user feedback that the AIMED pattern felt too dense on the early
  waves, added `aimCountMult`/`aimSpeedMult` knobs to `WaveSystem.build(n)`
  (`js/systems/waveSystem.js`), applied only when `n <= 4`. Two tuning
  passes: `aimCountMult` 1.0 → 0.8, then 0.8 → 0.64 after a follow-up
  report that it was still too dense — a net ~36% fewer AIM projectiles on
  W1-4. `aimSpeedMult` set to 1.08 (~8% faster) to keep the reduced
  projectile count from feeling too easy.
  - Every other pattern on W1-4, and every pattern (including `AIMED`) on
    W5+ and boss waves (`bossAimed`), is untouched — the multipliers are
    gated to `n <= 4` and only wrap the `aimed` closure.
  - `tests/fixtures/balance-baseline.json` (the W1-4 density regression
    baseline) was regenerated after each pass per `tests/README.md`'s
    "Updating the baseline" — the old/new baseline numbers reflect the
    intentional density change, not a regression.

## Dev Mode game-speed control
- **Added a selectable game-speed multiplier to Dev Mode.** Previously Dev
  Mode's WAVE section only had skip-forward/back; there was no way to
  practice at other than 1× speed. Added a SPEED panel section with 5
  discrete levels — 0.5×, 1×, 1.5×, 2×, 3× — as buttons plus hotkeys `1`-`5`,
  with the active level highlighted and mirrored in the status bar
  (`devSpeedValue`).
  - Implemented as `DevMode.timeScale` (default `1`), applied as a single
    multiplier on the frame's raw `dt` in `Game.loop()` (`raw = ... *
    (this.devMode?.timeScale ?? 1)`), so it uniformly scales movement,
    spawns, timers, and animation.
  - Deliberately kept separate from the Slow skill's `s.slowScale` — that's
    a gameplay mechanic players earn; this is a practice-only dev tool,
    isn't persisted, and isn't reachable without the existing F2 unlock.
  - **Files:** `js/systems/devMode.js` (`SPEED_LEVELS`, panel markup,
    hotkeys 1-5, `updateSpeedButtons()`, action handlers), `js/systems/
    game.js` (`loop()` dt multiply), `css/main.css` (`.dev-speed-btn.active`,
    plus a later fix — see "Dev Mode SPEED row mobile wrap" below — for the
    5-button row on narrow screens).

## `bump-version` / test-import version-tag mismatch (landmine fix)
- **Fixed: `npm run bump-version` only rewrote `?v=` tags in `index.html`
  and `js/**`, not `tests/**`.** `tests/**/*.mjs` hard-code the same `?v=`
  tag in their own imports of `js/**` modules (e.g. `import { CONFIG } from
  '../../js/core/config.js?v=...'`). Since Node's ESM loader treats
  differently-tagged import specifiers as different module instances, a
  routine version bump left tests importing a stale-tagged `js/core/
  config.js` against source now on a new tag — any test using reference
  equality on a `CONFIG`-derived object (`assertEqual`, not deep-equal)
  started failing for reasons unrelated to the actual change (surfaced as 2
  false FAILs in `bullet.test.mjs`/`bullethell-simulation.test.mjs` during
  the session that found it; see `HANDOFF_LOG.md`'s 2026-08-19 entry for
  the original repro).
  - `scripts/bump-version.mjs` and `scripts/check-versions.mjs` now walk
    `tests/**/*.mjs` in addition to `index.html`/`js/**/*.js`, so all three
    stay in sync in one pass and `check-versions` will catch it if they
    ever don't.
  - Verified: bumping the version, running `npm run check-versions`, and
    running `npm test` after the bump all report a single consistent tag
    and 0 FAIL — no more false FAILs from a stale test-import tag.

## W6 empty banner-subtitle fix
- **Fixed: `WaveSystem.build(6)` produced an empty wave-banner subtitle.**
  Flagged as a WARN (not FAIL) by `tests/unit/wave.test.mjs` since the test
  suite was added, and left open pending a decision on whether it was
  intentional. It wasn't: every W6 pattern call in that `case` block goes
  directly through `this.p.xxx` (its own new pattern set — `machineGunTop`,
  `crossfire`, `delayedBurst`, `movingSweep`, `ricochetField`) instead of
  the wrapped local closures (`aimed`/`ring`/`wall`/...) that call
  `labels.add(...)` — so no Thai lore label was ever added to the banner
  for that wave, unlike every other tier. Added a dedicated label for W6's
  pattern set (`labels.add("สายฝนเหล็กไร้ความปรานี")`) so the banner
  subtitle is no longer blank. `npm test` now reports 0 WARN (previously
  174 PASS / 0 FAIL / 1 WARN).

## Dev Mode SPEED row mobile wrap (cosmetic)
- **Fixed: the 5 SPEED buttons wrapped 2/2/1 on narrow mobile widths.** The
  generic `#devPanel .dev-row button` mobile rule sizes every dev-panel
  button to ~50% width (fine for the 2-3-button rows elsewhere), which left
  the 5-button SPEED row wrapping unevenly. Added a `#devSpeedRow`-specific
  rule (`@media (max-width:600px)`, tightened further at
  `@media (max-width:500px)`) sizing those 5 buttons to ~20% width with
  smaller padding/font, so they stay on one row. Purely cosmetic — the row
  was already fully functional before this. **File:** `css/main.css`.

## Automated AI-development test suite
- **Added `npm test` (`tests/**`).** A dependency-free regression suite
  purpose-built as a development guardrail for AI agents editing this
  codebase — not a player-facing feature. Before this, the only automated
  check was the one-off `scripts/verify-bullethell-fix.mjs`.
  - Imports and exercises the **real** `js/**` modules (`Game`,
    `WaveSystem`, `PatternLibrary`, `Player`, `BulletManager`,
    `SkillSystem`, `ItemSystem`, `LifeSystem`) — nothing is mocked or
    reimplemented, so a FAIL reflects an actual behavior change in the
    shipped code.
  - Runs fully headless (no browser) via `tests/helpers/gameFactory.mjs`,
    which constructs a real `Game` with the same `renderer`/`input`/`ui`
    dependency-injection seam `js/main.js` already uses, plus minimal
    inert DOM/`localStorage`/`performance` shims so Node doesn't choke on
    `js/systems/devMode.js`'s module-level DOM touches.
  - Deterministic: anything touching `Math.random()` runs under a seeded
    PRNG (`tests/helpers/seededRandom.mjs`), so results don't vary run to
    run.
  - Covers: `CONFIG`/`GRAZE_REWARD` structure; the full wave/pattern
    registry (W1-20 + boss waves); bullet spawn/cap/cleanup, including the
    W1-4-only Bullet-Hell cap/cleanup tuning and the `wall`-bullet cap
    bypass; `Player` movement/clamping/invulnerability; all 8 skills; all
    4 item types; graze/combo/score math (including the graze-driven
    skill-cooldown recovery cap); the full game-state lifecycle (reset,
    life loss, COOP revive, Game Over, restart, pause); dev-panel
    button/hotkey coverage (no dead references); presence of the required
    AI-context docs; deterministic W1-4 density simulation with a
    baseline-vs-±15%-tolerance regression check
    (`tests/fixtures/balance-baseline.json`, generated from a real
    simulation run, not hand-typed); wall/ring safe-gap geometry, pattern
    overlap density, and boss-wave isolation from W1-4 tuning; and
    end-to-end integration flows (wave transition, skill activation
    through the real input wiring, a multi-bullet graze/combo sequence,
    and the full game-over/revive/restart path).
  - `npm test` / `npm run test:unit` / `npm run test:simulation` /
    `npm run test:integration` / `npm run test:balance`. See
    `tests/README.md` for the full structure, the Balance Baseline Policy,
    and how to add a new test.
  - Current status: 174 PASS / 0 FAIL / 1 WARN. The one WARN
    (`WaveSystem.build(6)` producing an empty banner-subtitle label) is a
    pre-existing, low-risk finding surfaced by the new coverage — not
    something this pass changed — left as a flagged WARN rather than
    "fixed" since it may be intentional; see `HANDOFF_LOG.md`.

## AI-to-AI handoff log
- **Added `HANDOFF_LOG.md`.** A short, newest-first log of AI sessions —
  which tool (Claude, ChatGPT/Codex, ...), what it did, and what it flagged
  for next time — separate from `CHANGELOG.md` (which stays the permanent,
  curated history of actual gameplay/code changes). `AGENTS.md` now tells
  every session to read the top entry first and add its own entry last,
  specifically so switching between AI tools mid-project doesn't lose
  context between sessions.

## Multi-tool AI onboarding
This project gets worked on from more than one AI tool (Claude Code,
ChatGPT/Codex-style tools), and each looks for a different filename:

- **Moved the AI-onboarding content from `CLAUDE.md` to `AGENTS.md`.**
  `AGENTS.md` is the filename convention most agent tools pick up
  automatically; `CLAUDE.md` is now a one-line pointer to it, kept only
  because Claude Code specifically looks for that name. There's a single
  canonical doc now — update `AGENTS.md`, not both.

## AI-onboarding pass
This pass didn't touch gameplay code — it made the project faster and safer
to pick back up, specifically for an AI agent starting a fresh session with
no memory of past conversations:

- **Added `CLAUDE.md`.** A single entry-point doc that maps out the
  architecture, points to `README.md`/`CHANGELOG.md`/`WAVE_DESIGN_NOTES.md`
  for the details each already owns, and lists conventions that aren't
  obvious from reading one file at a time (the `CONFIG`-first rule, the
  cached-DOM-lookup pattern, the `SKILL_EFFECT_DRAWERS` table, LF-only line
  endings, the lack of a test framework and the `scripts/verify-*.mjs`
  convention that stands in for one).
- **Added `scripts/check-versions.mjs` and `scripts/bump-version.mjs`
  (`npm run check-versions` / `npm run bump-version`).** Every internal
  import carries a hand-maintained `?v=<tag>` cache-busting query string,
  and all of them have to match. That's an easy thing for anyone — AI or
  human — to get half-right (bump some imports, miss others, or add a new
  file without one). These scripts verify consistency in one command and
  rewrite every occurrence atomically in one pass instead of relying on
  manual find/replace. Also collapsed a few files' redundant duplicate
  `&v=` query params down to one, which had no effect but added noise.

## Slow bugfix

- **Fixed: Slow was slowing the player, not just bullets.** `updatePlayers()`
was passing the slow-mo-scaled `dt` into `player.updateMouse()` /
`updateKeyboard()`, so activating Slow also cut the player's own
mouse-follow speed and P2's keyboard speed to ~28%, working against the
point of a "bullet time" skill. Player movement now always uses `rawDt`;
only bullets/score/boss still use the scaled `dt`.

## Project hygiene pass
This pass didn't touch gameplay code — it cleaned up things that make the
project harder to pick back up as it grows:

- **Removed `js/systems/autoPlayer.js` (dead code).** It was never imported
  by `game.js`, `main.js`, or `ui.js`, and `devMode.js` never called it
  despite the file checking `game.devMode.enabled`. It looked like a
  half-wired "AI plays for you" dev tool that got left behind. If you want
  that feature, it's easy to rebuild properly wired into `DevMode` — the old
  file is still in git history if you want the logic back.
- **Normalized line endings to LF everywhere.** `renderer.js`, `devMode.js`,
  `player.js`, `input.js`, and `main.css` were CRLF while every other file
  was LF — that mix causes noisy diffs and can quietly reintroduce merge
  conflicts. Added `.editorconfig` and `.gitattributes` (`eol=lf`) so this
  can't silently come back on a Windows checkout.
- **Added `package.json` + `npm run dev`.** There was no standard way to
  serve the project locally (it's plain ES modules — `file://` won't work
  because of CORS on module imports). `npm install && npm run dev` now
  starts a static server on `:8080`. No bundler/build step was introduced;
  the game still ships as plain ES modules.
- **Added `.gitignore`** for editor/OS/`node_modules` cruft now that
  `npm install` is part of the workflow.

## Maintainability pass (earlier update)
The previous version was already split into files, but several of them
(`waveSystem.js`, `game.js`'s `update()`, `patterns.js`, `renderer.js`) had
their logic packed into dense, single-line, semicolon-chained code with
cryptic short variable names (`n`, `dur`, `sm`, `dm`, `c1`, `c2`...). That's
hard for a human — or an AI picking the project back up later — to safely
edit. This pass kept 100% of the original gameplay behavior/numbers, but:

- **`js/systems/waveSystem.js`** — rewritten from one packed line into
  clearly named variables (`speedMult`, `densityMult`, `colorA`/`colorB`)
  and one `if (n >= X) { ... }` block per pattern tier, each with a comment.
  Adding a new wave-tier mechanic is now a matter of adding one more block.
- **`js/systems/game.js`** — the single giant `update()` method was split
  into small, ordered, single-purpose steps (`updateTimers`, `updatePlayers`,
  `updateBoss`, `updateZoneHazard`, `updateLasers`, `updateBullets`, etc.),
  each with a one-line doc comment. The class itself is unchanged (still one
  `Game` orchestrator), just organized so each concern reads top-to-bottom.
- **`js/patterns/patterns.js`** — reformatted every pattern method to
  multi-line with a doc comment explaining what shape it produces.
- **`js/rendering/renderer.js`** — reformatted to multi-line; the long
  `if/else` chain for skill-effect visuals was replaced with a
  `SKILL_EFFECT_DRAWERS` lookup table (one function per skill), so adding a
  new skill's visual effect no longer means editing a giant branch chain.
- **`js/ui/ui.js`** — DOM elements are now looked up once in
  `cacheElements()` instead of calling `document.getElementById` repeatedly
  every frame; `update()` was split into `updateTimer` / `updateScores` /
  `updateSkillChips` / `updateLivesAndDownState` / `updateCombo`.

Files that were already clean and single-purpose (`config.js`,
`gameState.js`, `input.js`, `player.js`, `skillSystem.js`, `lifeSystem.js`,
`devMode.js`, `collision.js`) were left as-is.

No gameplay values, timings, or randomness were changed — every numeric
constant was carried over as-is (verified by diffing the numeric literals
between old and new files).

## V6 fixes
- Arena viewport uses cover scaling to remove letterbox bars and visually
  fill the screen.
- Wave 4 spiral density reduced: fewer arms/emission steps and shorter
  spiral phases.

## V7
- Replaced Teleport skill with NOVA.
- Added Developer Mode: press F2 during gameplay.
- Dev controls: +/− life, next wave, skill ready, clear bullets, boss, god
  mode, pause, restart.

## V8 bullet balance test
- Added an active-bullet cap so bullets cannot fill the entire arena.
- Caps: 95 (W1-5), 125 (W6-10), 160 (W11-15), 195 (W16-20), 220 (W21+), with
  +30 on Boss Waves.
- Dev Mode shows the current bullet count/cap for easy testing.

## V9 intense bullet balance
- Increased the active-bullet caps for a more intense Bullet Hell feel.
- Caps: 180 (W1-5), 260 (W6-10), 340 (W11-15), 420 (W16-20), 500 (W21+), +60
  on Boss Waves.

## V11 fairness assist
- Introduced a subtle near-miss assist (Wave 4+, or when the arena is
  crowded) that could gently steer a bullet predicted to hit, limited to
  small steering changes applied once per bullet.
- **Currently disabled**: `Game.dangerAssistDelay()` and `Game.assistBullets()`
  are both no-ops in the present code. The shrinking-arena-zone tie-in
  described in the original entry no longer applies either, since that
  hazard system has been removed (see dead-code cleanup). Re-enable
  deliberately if this fairness behavior is wanted again — don't assume
  it's currently active.

## V12 player-friendly patterns
- Ring patterns leave a small opening aimed toward the nearest active
  player; telegraph shows the opening.
- Wall patterns choose the gap near the player's current route instead of
  placing it randomly.
- From Wave 4+, if the local danger field is crowded, aimed/homing/splitter
  spawns briefly wait for space to open.
- Existing 3-second post-hit invulnerability remains unchanged.

## V13 hit feedback
- Player hit no longer triggers camera shake.
- Hit feedback uses red impact particles + a short expanding hit ring.
- Player blinks while invulnerable after being hit.

## V14 hit no-recoil
- Removed hit repositioning, screen flash, and hit ring effect.
- On hit, player stays exactly at the collision position, loses one life,
  and blinks during the existing invulnerability window.
- Red hit particles remain as the only impact effect.

## V15 UI and hit feedback
- Hit feedback is a fixed-position red impact ring/spokes around the
  player; player position and scale do not move.
- Wave banner remains visible for 1.8 seconds with a readable panel
  background.
- Main menu received a cleaner card layout, mode cards, skill section, rule
  cards, and improved start button.

## V16 classic damage feedback
- Restored the original short damage shake (`shakeMag = 12`) when hit.
- Removed the newer fixed hit ring so the shake + particles communicate
  damage like the original.

## V17 damage effect
- Restored a clear damage visual on the player: brief red flash, white
  impact ring, red radial hit marks, and red glow.
- Damage shake remains (`shakeMag = 12`).

## V18 subtle damage feedback
- Damage shake remains the main feedback.
- Removed the large red body flash/radial marks.
- Added only a thin, short red rim around the player for a clear but
  restrained hit indicator.
- Hit indicator lasts 0.30 seconds and fades quickly.

## V19 damage feedback fix
- Fixed the missing camera shake: `shakeMag` is now applied to the rendered
  arena and decays rapidly after a hit.
- Damage uses a short, punchy shake plus a thin red outline; the player
  body stays its normal color.

## V20 damage shake fix
- Added a dedicated 0.22-second damage-shake timer that triggers whenever
  one heart is lost.
- Damage shake is rendered independently from game-over shake, so losing
  one heart now visibly shakes the arena.
- Shake uses a short directional impact motion instead of random jitter.

## Graze Cooldown Recovery
- Every successful graze reduces the active skill cooldown.
- Base recovery: 0.15s per graze.
- At 5+ combo: 0.18s.
- At 10+ combo: 0.21s.
- At 20+ combo: 0.24s.
- Recovery is capped at 60% of the skill's original cooldown per activation.
- The existing 1-second combo window remains, so the player must keep
  taking calculated risks.

## AI maintainability review
- Confirmed all ES module imports resolve, all files pass syntax check, and
  all referenced assets (skill icons) exist on disk.
- Removed `js/systems/autoPlayer.js` — this was flagged as dead code in the
  project hygiene pass above, but the actual deletion hadn't landed in the
  repo yet (still unimported by `game.js`/`main.js`/`ui.js`/`devMode.js`).
  It's still recoverable from git history if the "AI plays for you" dev
  tool is wanted later.
- Split this changelog out of `README.md` so the README stays focused on
  current architecture and "how to extend" guidance rather than growing
  indefinitely with version notes.
