# HANDOFF_LOG.md — AI session log

For AI agents working on this project across tools (Claude, ChatGPT/Codex,
etc.). This is **not** `CHANGELOG.md` — that's the permanent, curated
history of gameplay/code changes. This file is a short, disposable log of
*sessions*: which AI touched the project, when, and what a session picking
it up next needs to know that isn't obvious from the code or `CHANGELOG.md`
yet.

**Newest entry at the top.** Read the top 1-2 entries before starting work
so you know what the last session was mid-way through or flagged for you.

## Rules

- **When you start a session:** read the newest entry (and any it points
  back to) before touching code.
- **When you finish a session** (or hand off/run out of context — don't
  wait until the whole task is "done"): record what you did. Always add
  one, even for small fixes — a missing entry is exactly what breaks this
  for the next AI.
- **Same-day entries:** if the newest entry is already dated today
  (regardless of which AI/tool wrote it), do **not** create a new dated
  header — append your session as an additional `**Session N — <short
  label>:**` block inside that entry instead (bump N from whatever the
  last block used), using the per-session template below. Otherwise,
  start a new dated entry at the top using the full template below.
- **Keep entries short.** Deep detail belongs in a `CHANGELOG.md` entry or
  in code comments; link to those instead of repeating them here. When
  adding a session block to an existing day, also fold its outcome into
  that entry's shared "test result" / "for the next session" lines rather
  than repeating a full set per session.
- **Housekeeping:** once this file has ~15-20 entries, the oldest ones can
  be deleted (their useful content should already be in `CHANGELOG.md` by
  then) — this file is meant to stay short enough to read in one pass, not
  become a full history.

## Template

New day (first session of the day):
```
## YYYY-MM-DD — <AI/tool name, e.g. "Claude (Sonnet 5, claude.ai)" or "ChatGPT (Codex CLI)">

**Session 1 — <short label>:** what changed, why, key numbers if any.
**Files:** the main files touched.
**End-of-day test result:** e.g. `npm test` output, if applicable.
**For the next session:** anything unresolved, half-finished, or worth
knowing before continuing — or "Nothing pending." if fully done.
```

Same day, later session — insert inside the existing entry, right after
its last `**Session N**` block, and update the shared "test result" /
"for the next session" lines to reflect the latest state:
```
**Session N — <short label>, <AI/tool name if different from the entry's>:**
what changed, why, key numbers if any.
```

---

## 2026-08-20 — Claude (Sonnet 5, claude.ai)

**Session 1 — closed out the 4 gaps flagged in the 2026-08-19 entry:**

1. **Backfilled `CHANGELOG.md`.** The AIM tuning and Dev Mode SPEED work
   from 2026-08-19 (sessions 2-4) were only in `HANDOFF_LOG.md`, which is
   disposable — added proper permanent entries for both, plus entries for
   the two fixes below, following the existing style.
2. **Fixed the `bump-version` landmine** (flagged 2026-08-19, not fixed
   then). `scripts/bump-version.mjs` and `scripts/check-versions.mjs` now
   also walk `tests/**/*.mjs`, not just `index.html`/`js/**`, so a version
   bump can no longer leave test imports on a stale `?v=` tag and cause
   false reference-equality FAILs. Verified end-to-end: bumped to a test
   tag, ran `check-versions` (single consistent tag) and `npm test` (0
   FAIL), then bumped back to `20260814w10final`.
3. **Fixed the W6 empty-banner-label WARN.** It was a bug, not intentional:
   `case 6` in `WaveSystem.build(n)` called `this.p.xxx` directly for its
   whole new pattern set instead of the wrapped closures that add banner
   labels. Added a dedicated label for W6. `npm test` now shows 0 WARN.
4. **Fixed the SPEED-row mobile wrap (cosmetic).** Added a
   `#devSpeedRow`-specific flex-basis in the `max-width:600px`/`500px`
   media queries in `css/main.css` so the 5 buttons stay on one row instead
   of wrapping 2/2/1.

**Files:** `CHANGELOG.md`, `scripts/bump-version.mjs`,
`scripts/check-versions.mjs`, `js/systems/waveSystem.js`, `css/main.css`.

**End-of-day test result:** `npm test` → **175 PASS / 0 FAIL / 0 WARN**
(previously 174/0/1 — the W6 WARN is gone). `npm run check-versions` →
PASS, single consistent tag `20260814w10final` across 48 occurrences /
26 files (now including `tests/**`).

**For the next session:** All 4 items from the 2026-08-19 handoff are
closed. See Session 2 below for what the follow-up code review found.

**Session 5 — skill balance buff (user-requested):** Buffed all 8 skills in
`CONFIG.skills` so they're useful against W1-4 Bullet Hell density and
remain impactful into W7-10+. W1 now fires 50+ bullets in the first 2s;
old values were too weak to matter. Changes (all in `js/core/config.js`):
`pulse` cooldown 5→4, radius 115→140; `shield` cooldown 7→6, duration
2.2→3.0; `slow` cooldown 8→7 (duration unchanged); `nova` cooldown 8→7,
radius 185→210, invuln 0.35→0.55; `timestop` cooldown 10→8, duration
2.0→2.8; `heal` cooldown 12→10; `repulse` cooldown 8→7 (radius/force
unchanged); `phase` cooldown 9→7, duration 2.0→2.5. No behavior changes —
numbers only. All tests still PASS (skill tests read from CONFIG directly
so no hardcoded values to update).
**Files:** `js/core/config.js`.

**Session 6 — W1/W2 bullet count reduction (user-requested):** Added
`waveCountMult` to `waveSystem.js build(n)` — 0.70 for W1 (−30%), 0.80
for W2 (−20%), 1.0 for all others. Applied uniformly inside all
count-based wrappers (aimed/ring/cross/laser/homing/splitter/bouncer).
Wall and spiral have no discrete bullet count so they're naturally
unaffected. Old → new peak active: W1 262→224, W2 260→216; W3/W4
unchanged (420/396). Regenerated `tests/fixtures/balance-baseline.json`
deliberately per tests/README.md policy (old values noted above).
**Files:** `js/systems/waveSystem.js`,
`tests/fixtures/balance-baseline.json`.
**End-of-day test result:** `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending — Session 5+6 are the latest
changes. The `lifeSystem.js` cosmetic indent glitch (flagged Session 2)
is still the only open low-priority item.

**Session 2 — code review + fixed the AGENTS.md doc/code mismatch it
found:** Did a full code review of the project (all of `js/**`, plus the
Session 1 changes). Found: (a) `js/core/collision.js`, `js/entities/
boss.js`, `js/rendering/particles.js` were still dense single-line code,
despite `AGENTS.md` listing them as "already clean" alongside `config.js`/
`player.js`/etc — fixed this session, see CHANGELOG; (b) a minor indentation
glitch in `js/systems/lifeSystem.js`'s `hit()` — cosmetic only, not fixed
yet; (c) **Dev Mode SPEED (added 2026-08-19 Session 4) can cause bullet
tunneling at 3× — flagged, not yet fixed, see below.**

Reformatted the 3 mismatched files to the project's normal multi-line,
named-variable style. Verified byte-for-byte behavior equivalence by
diffing whitespace/comment-normalized tokens against the originals before
applying, then confirmed with `npm test` / `check-versions` / the one-off
`verify-bullethell-fix.mjs`. **Files:** `js/core/collision.js`,
`js/entities/boss.js`, `js/rendering/particles.js`, `CHANGELOG.md`.

**End-of-day test result:** `npm test` → 175 PASS / 0 FAIL / 0 WARN.
`npm run check-versions` → PASS.

**For the next session:** Two things from the review still open:
1. **Bullet tunneling at high Dev Mode SPEED (3×).** `Game.loop()` clamps
   raw frame dt to 0.05s *before* multiplying by `devMode.timeScale`, so at
   3× the effective dt used for `updateBullets()`'s per-frame position
   update (`b.x += b.vx * dt * 60`) can reach ~0.15s — fast bullets can move
   further than the combined player+bullet collision radius in one frame
   and skip the `circleHit()` check entirely (no swept/continuous
   collision anywhere in the codebase). Dev-only, doesn't affect normal
   gameplay (dt is never scaled above the 0.05s clamp there), but it means
   testing balance at SPEED 3× isn't fully trustworthy — bullets can look
   safer than they'd be at real speed. Not fixed yet; options discussed:
   cap `timeScale` lower, or clamp/substep dt *after* applying timeScale
   instead of before.
2. `lifeSystem.js`'s `hit()` has a stray extra indent on one line
   (cosmetic only, no behavior impact) — low priority cleanup.

**Session 3 — fixed item 1 above (bullet tunneling at high Dev Mode SPEED):**
Swapped the clamp/scale order in `Game.loop()` — `Math.min(frameDt *
timeScale, 0.05)` instead of `Math.min(frameDt, 0.05) * timeScale` — so the
effective dt can never exceed the collision model's existing 0.05s safety
ceiling, regardless of `devMode.timeScale`. Confirmed numerically this is a
no-op at any steady frame rate (identical output to the old formula at
60fps for timeScale 1 and 3) and only changes behavior on a
stutter/lag-spike frame, which is exactly the case that used to spike dt up
to 0.15s. Added `tests/unit/game-loop-timescale.test.mjs` as a proper
regression test — drives the real `Game.loop()` (not a reimplementation of
its dt math), verified it correctly FAILs against the pre-fix formula
(temporarily reverted to confirm, then restored) before considering this
closed. Registered in `tests/run-all.mjs`. See CHANGELOG.md for full
detail. **File:** `js/systems/game.js`, plus the new test file.

**End-of-day test result (Session 3):** `npm test` → **179 PASS / 0 FAIL /
0 WARN** (was 175/0/0 after Session 2 — +4 new tests, all passing).
`npm run check-versions` → PASS, single consistent tag across 49
occurrences / 27 files.

**Session 4 — Pause screen Resume button + Space-bar hint (user-requested UX
fixes), plus a test-suite breakage found and fixed along the way:**

1. Pause was confusing players into hitting Restart/Menu when they only
   meant to resume — added a dedicated, visually primary "เล่นต่อ" (Resume)
   button (`#pauseResumeBtn`), separated from Restart/Menu by a divider.
   Space bar still works as before; the button just gives a mouse-clickable,
   harder-to-fumble equivalent. New `UI.setResumeHandler()`.
2. Added a persistent, bordered "Space bar เพื่อหยุดเกม" hint pinned
   top-right of the HUD (`.space-hint`) so the pause control doesn't require
   opening How-to-Play to discover.
3. Found and fixed a real bug while addressing (1): `UI.showResultScreen()`
   never hid `#pauseOverlay`, unlike every other screen-transition method —
   could leave Pause's opaque backdrop burying the whole result screen
   (Reset Best button included) behind it. Added the missing hide call.
4. **Broke, then fixed, the test suite in the same session:** step 1's new
   `this.ui.setResumeHandler(...)` call in `Game`'s constructor wasn't
   matched by a stub in `tests/helpers/gameFactory.mjs`'s `makeFakeUI()`,
   so every `createGame()`-based test threw `TypeError:
   this.ui.setResumeHandler is not a function` — took the suite from 179
   PASS to failing across unit/integration/simulation. Caught by running
   `npm test` before considering this done; added the missing stub line.
   **Lesson for next time:** any new `Game` constructor call into `this.ui.*`
   needs its `makeFakeUI()` stub added in the *same* commit, not after.

See `CHANGELOG.md` ("Pause screen: separate Resume..." and "Test fixture
gap...") for full detail. **Files:** `index.html`, `js/ui/ui.js`,
`js/systems/game.js`, `css/main.css`, `tests/helpers/gameFactory.mjs`.

**End-of-day test result (Session 4):** `npm test` → **179 PASS / 0 FAIL /
0 WARN** (dipped to a wall of TypeErrors mid-session per item 4 above,
confirmed back to 179/0/0 after the stub fix). `npm run check-versions` →
PASS, single consistent tag `20260814w10final` across 49 occurrences / 27
files.

**For the next session:** Only the item 2 cosmetic `lifeSystem.js`
indentation glitch (flagged Session 2) is still open. No known landmines,
WARNs, or correctness gaps at this time.

---

## 2026-08-19 — Claude (Sonnet 5, claude.ai)
*(3 sessions this day, consolidated — see git history / prior log
versions for the full blow-by-blow if ever needed.)*

**Session 1 — built the test suite:** Added `npm test` (previously the
only check was `scripts/verify-bullethell-fix.mjs`). Covers unit-level
checks (config, wave/pattern registry, bullets, player, all 8 skills, all
4 items, score/graze/combo, life/death/restart, dev-mode, AI-doc
presence), deterministic simulation (W1-4 density, wall/ring safe-gap
math, pattern overlap, boss isolation, ±15%-tolerance balance regression
against a freshly-seeded `tests/fixtures/balance-baseline.json`), and
integration flows (wave transition, skill use, graze→combo→score,
game-over/revive/restart). All tests exercise the real `js/**` modules,
no mocks. **Files:** `tests/**` (new), `package.json` (test scripts),
`AGENTS.md` (new "Automated tests" section). One minor finding left
as-is and flagged: W6's `build(6)` returns an empty banner label because
it calls pattern methods directly instead of the wrapped closures — WARN,
not FAIL, in `tests/unit/wave.test.mjs`.

**Sessions 2-3 — W1-4 AIM balance tuning:** Per user request, reduced
AIM (`AIMED` pattern) projectile count and raised AIM speed on waves 1-4
only — nothing else touched (other patterns, W5+, boss `bossAimed` all
unaffected). Two passes: `aimCountMult` 1.0→0.8 (session 2), then
0.8→0.64 after the user said it was still too dense (session 3) — net
~36% fewer AIM projectiles on W1-4. `aimSpeedMult` set to 1.08 (~8%
faster) in session 2, unchanged since. **Files:** `js/systems/waveSystem.js`
(`aimCountMult`/`aimSpeedMult` in `build(n)`), `tests/fixtures/balance-baseline.json`
(regenerated both times per `tests/README.md`'s "Updating the baseline").

**Session 4 — Dev Mode game-speed control:** Added a selectable-level
speed multiplier to Dev Mode (previously WAVE only had skip/back, no
speed control). New SPEED panel section with 5 discrete levels — 0.5×,
1×, 1.5×, 2×, 3× — buttons + hotkeys `1`-`5`, highlighting the active
level and showing it in the status bar. Implemented as
`DevMode.timeScale` (default 1), applied as a straight multiplier on the
frame's raw dt in `Game.loop()` — `raw = ... * (this.devMode?.timeScale
?? 1)` — so it scales movement/spawns/timers/animation uniformly.
Deliberately separate from the slow-mo skill's `s.slowScale` (that's a
gameplay mechanic; this is a practice-only dev tool and isn't persisted
or reachable without the existing F2 unlock). **Files:**
`js/systems/devMode.js` (SPEED_LEVELS, panel markup, hotkeys 1-5,
`updateSpeedButtons()`, action handlers), `js/systems/game.js` (`loop()`
one-line dt multiply), `css/main.css` (`.dev-speed-btn.active`).

**Landmine found, not fixed (flagging only):** `npm run bump-version`
rewrites `?v=` tags in `index.html`/`js/**` only — it does not touch
`tests/**`, which hard-code `?v=20260814w10final` in their imports.
Bumping the version therefore makes Node's ESM loader treat
`js/core/config.js?v=<old>` (imported by tests) and
`?v=<new>` (imported by the bumped source) as two *different* module
instances, so any test using `assertEqual` (reference `!==`, not deep
equal) on a `CONFIG`-derived object starts failing for reasons that have
nothing to do with the actual code change (hit this firsthand: 2 FAILs
in `bullet.test.mjs`/`bullethell-simulation.test.mjs` after a routine
bump, gone after reverting the tag). Ran `bump-version` back to
`20260814w10final` this session rather than fix the script — a real fix
(e.g. bump `tests/**` too, or drop the query string from test imports)
is a deliberate call for whoever owns the cache-busting workflow, not a
side effect of a Dev Mode feature. **File:** `scripts/bump-version.mjs`.

**End-of-day test result:** `npm test` → 174 PASS / 0 FAIL / 1 WARN (the
W6 label WARN above; unrelated to any of today's changes). Version tag
is back at `20260814w10final` (unbumped) — see the landmine note above
before running `bump-version` again.
**For the next session:** Nothing pending on Dev Mode speed or AIM
tuning. Two things worth knowing: (1) `aimCountMult`/`aimSpeedMult` in
`waveSystem.js` `build(n)` are still the single knobs for further AIM
tuning — regenerate the baseline fixture after any change, per
`tests/README.md`. (2) Don't run `npm run bump-version` without reading
the landmine note above first, or `npm test` will show false FAILs. The
W6 empty-banner-label WARN is still an open, low-risk cleanup.

---

## 2026-08-18 — Claude (Sonnet 5, claude.ai)
**Did:** Set up AI-onboarding docs and this handoff-log system. Content
lives in `AGENTS.md` (the convention most agent tools look for); `CLAUDE.md`
is a one-line pointer to it since Claude Code looks for that name
specifically. Added `scripts/check-versions.mjs` / `scripts/bump-version.mjs`
(`npm run check-versions` / `npm run bump-version`) to keep the hand-rolled
`?v=` cache-busting query strings in sync across `index.html` and
`js/**/*.js` instead of relying on manual find/replace. Added this file
(`HANDOFF_LOG.md`) and wired `AGENTS.md`/`CLAUDE.md`/`README.md` to tell
every session to read the newest entry here first and add its own last —
specifically for handing off between different AI tools mid-project.
**Files:** `AGENTS.md` (new), `CLAUDE.md` (rewritten as pointer),
`HANDOFF_LOG.md` (new, this file), `scripts/check-versions.mjs` (new),
`scripts/bump-version.mjs` (new), `package.json`, `README.md`,
`CHANGELOG.md`.
**For the next session:** Nothing pending — no gameplay code was touched.
`npm run check-versions` and `node scripts/verify-bullethell-fix.mjs` both
pass as of this entry.
