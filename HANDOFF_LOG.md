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
  wait until the whole task is "done"): add a new entry at the top with
  today's date, using the template below. Always add one, even for small
  fixes — a missing entry is exactly what breaks this for the next AI.
- **Keep entries short.** Deep detail belongs in a `CHANGELOG.md` entry or
  in code comments; link to those instead of repeating them here.
- **Housekeeping:** once this file has ~15-20 entries, the oldest ones can
  be deleted (their useful content should already be in `CHANGELOG.md` by
  then) — this file is meant to stay short enough to read in one pass, not
  become a full history.

## Template

```
## YYYY-MM-DD — <AI/tool name, e.g. "Claude (Sonnet 5, claude.ai)" or "ChatGPT (Codex CLI)">
**Did:** one or two lines on what changed.
**Files:** the main files touched.
**For the next session:** anything unresolved, half-finished, or worth
knowing before continuing — or "Nothing pending." if the task is fully done.
```

---

## 2026-08-19 — Claude (Sonnet 5, claude.ai) [balance pass]
**Did:** Intentional W1-4 AIM (`AIMED` pattern) tuning, per request: AIM
projectile count down ~20% and AIM speed up ~8% on waves 1-4 only (both
within the requested 15-25% / 5-10% bands). Implemented in
`js/systems/waveSystem.js` `build(n)` by adding `aimCountMult` (0.8 when
`n<=4`) and `aimSpeedMult` (1.08 when `n<=4`), applied only inside the
local `aimed(...)` closure — so only the AIMED pattern is affected, only
on W1-4; RING/WALL/SPIRAL/CROSS/LASER/HOMING/SPLITTER/BOUNCER and all W5+
patterns (including the boss `bossAimed`) are untouched.

Old vs new baseline (`tests/fixtures/balance-baseline.json`, regenerated
per `tests/README.md` "Updating the baseline"):
- W1: peakActive 299→281, spawned 1141→1062
- W2: peakActive 305→271, spawned 1191→1120
- W3: peakActive 420→420 (still capped), spawned 1593→1551
- W4: peakActive 420→420 (still capped), spawned 1888→1849

All drops fall inside the suite's own ±15% tolerance, so `npm test` is
green (174 PASS / 0 FAIL / 1 WARN — the pre-existing W6 label WARN from
the previous entry, unrelated to this change).

**Files:** `js/systems/waveSystem.js`, `tests/fixtures/balance-baseline.json`.
**For the next session:** Nothing pending on this change. The pre-existing
W6 empty-banner-label WARN (see previous entry below) is still unresolved
and unrelated.

---

## 2026-08-19 — Claude (Sonnet 5, claude.ai)
**Did:** Built the automated AI-development test suite (`npm test`) —
previously the only regression check was the one-off
`scripts/verify-bullethell-fix.mjs`. New suite covers unit-level checks
(config shape, wave/pattern registry, bullet spawn/cap/cleanup, player
movement/clamping, all 8 skills, all 4 item types, score/graze/combo math,
game-state lifecycle, dev-mode command coverage, AI-doc presence),
deterministic simulation (W1-4 density/progression, wall/ring safe-gap
math, pattern overlap, boss isolation, baseline regression with ±15%
tolerance), and integration flows (full wave transition, skill use
end-to-end, graze→combo→score over real bullet motion, game-over/revive/
restart). All tests import and exercise the real `js/**` modules — no
mocks/reimplementations. `tests/helpers/gameFactory.mjs` builds a real
`Game` headlessly via minimal DOM/localStorage/performance shims.
`tests/fixtures/balance-baseline.json` was generated from an actual seeded
simulation run, not hand-typed. Current result: **174 PASS / 0 FAIL / 1
WARN** (see below), ~1.1s runtime.

Two real (minor) findings surfaced along the way, left as-is per the "no
gameplay changes in this pass" scope — flagged here instead:
- W6's `WaveSystem.build(6)` returns an empty banner-subtitle label (its
  case block calls `this.p.xxx(...)` pattern methods directly instead of
  the wrapped local closures that populate the `labels` Set) — currently
  a WARN in `tests/unit/wave.test.mjs`, not a FAIL, since it may be
  intentional. Worth a deliberate decision in a future session.
- No other dead references / structural issues found (dev-panel buttons,
  hotkeys, and AI docs all check out clean).

**Files:** `tests/**` (all new — see `tests/README.md` for the full
layout), `package.json` (added `test`/`test:unit`/`test:simulation`/
`test:integration`/`test:balance` scripts), `AGENTS.md` (updated: new
"Automated tests" section, before/after-change workflow now includes
`npm test`, replaced the outdated "No test framework" bullet).
**Test result as of this entry:** `npm test` → **174 PASS, 0 FAIL, 1
WARN** across STRUCTURE (Config, Wave & Pattern Registry), BULLET SYSTEM,
LOGIC (Player), SKILLS, ITEMS, COMBAT (Score/Graze/Combo), LIFE/DEATH/
RESTART/WAVE STATE, DEV MODE & AI DOCUMENTATION, BULLET HELL simulation
(W1-4 + wall/ring safety), REGRESSION vs baseline, and all 4 INTEGRATION
suites. `npm run check-versions` also still passes (test files carry the
same `?v=` tag for consistency but are outside that script's scanned
paths, by design).
**For the next session:** Nothing pending on the test suite itself. If you
touch `js/systems/waveSystem.js`, `js/patterns/patterns.js`,
`js/systems/game.js`, `js/systems/skillSystem.js`,
`js/systems/itemSystem.js`, or `js/entities/*` — run `npm test` before and
after, per `AGENTS.md`. If a balance-regression FAIL shows up and it's an
intentional design change, see `tests/README.md`'s "Balance Baseline
Policy" before touching `tests/fixtures/balance-baseline.json`. The W6
empty-label WARN above is a small, low-risk cleanup someone could pick up.

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
