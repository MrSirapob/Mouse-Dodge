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

## 2026-08-21 — Claude (Sonnet 5, claude.ai)

**Session 7 — W10 boss: replaced `bossSpiral()` reuse with a new `bossNova()` pattern (user-requested: "W10 ได้ใช้ bossSpiral() เหมือน W5 ผมไม่อยากให้มันซ้ำ"):**
User noticed Session 6's fix made W10 reuse W5's `bossSpiral()` verbatim as its filler
pattern — two bosses sharing a signature move contradicts this project's own
`WAVE_DESIGN_NOTES.md` ("Bosses carry the distinctive gimmicks"). Added
`PatternLibrary.bossNova()` (`js/patterns/patterns.js`): telegraphed full-ring shockwave
pulses fired outward from the boss (not rotating, unlike `bossSpiral`'s continuous arms).
Swapped all 4 of W10's `bossSpiral()` calls for `bossNova()` at the same start times/windows,
then tuned `pulses`/`count` args against live `simulateWave(10)` runs to land close to the
prior density (peak 372→357, avg 112.0→96.6, spawned 1554→1478 — see CHANGELOG.md for the
full before/after and exact call args). `bossSpiral()` itself is untouched; still used by
W5/W15/default. Also added a `bossNova` entry to `tests/helpers/simulation.mjs`'s
`capturePatternPlan()` `durationFor` map (same shape as `bossSpiral`'s) and to the `PATTERN
GUIDE` header comment in `waveSystem.js`. Re-checked the Perimeter-solo invariant via
`capturePatternPlan(10)` + a manual overlap sweep — same overlaps as pre-change (all
pre-existing, none introduced by this swap).
**Files:** `js/patterns/patterns.js`, `js/systems/waveSystem.js`,
`tests/helpers/simulation.mjs`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending. If W10's average density (96.6, vs W5's ~262)
still feels soft, the 4 `bossNova()` calls' `pulses`/`count` args are the place to retune —
see the CHANGELOG entry for which phase each sits in.

**Session 6 — W10 boss density pass (user-requested: "อัดเพิ่ม W10 เพราะเพื่อนเทสแล้วบอกว่า W10 ง่ายกว่า W5"):**
Followed up on the balance-question conversation from Session 5's simulation numbers. Root
cause of W10 reading softer than W5: `buildBoss(10)` never used `bossSpiral()`, which is
W5's main sustained-pressure tool (fixed 20 steps/sec × `arms`, independent of `duration` —
e.g. 3 arms = 60 bullets/sec continuous). Added 4 `bossSpiral()` bursts into W10's phase
gaps, each timed to stay clear of the existing Perimeter Formation telegraph-to-fire windows
(kept those SOLO per the existing in-code design comment — did not touch that). See
CHANGELOG.md for exact placements/timings and the before/after simulateWave(10) numbers
(peak 155→372, avg 53.4→112.0, spawned 694→1554). Peak density is now close to W5's (89% vs
100%); average sustained pressure is still lower by design — W10 leans on telegraphed
formations rather than a continuous barrage. Verified via `simulateWave()`, not by manual
playtesting — if the friend who flagged this still finds it soft (or now too hard), the 4
`bossSpiral()` calls are the single place to retune (their `duration`/`arms` control the
added density directly).
**Files:** `js/systems/waveSystem.js`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending. If W10 still needs more (or less) pressure,
adjust the 4 `bossSpiral()` calls' `duration`/`arms` args — see the CHANGELOG entry for
which phase each one sits in and why those windows were chosen.

**Session 5 — W10 boss `reverseRain` shallow-penetration fix; corrected a stale HANDOFF_LOG note (user-requested, "แก้ทั้ง 2 อัน"):**
User asked what else might need attention besides audio. Two things were flagged
from earlier sessions' "for the next session" notes:
1. **W10 boss `reverseRain` (Phase 3, both calls) still had short `reverseAfter`**
   (1.45 / 1.35) — the exact same shallow-penetration bug Session 12/13 fixed for
   W8/W9, left un-applied to the boss wave and noted as "may be intentional." Fixed
   the same way: `1.45→4.2` and `1.35→3.95`, both now reaching ~95% arena
   penetration before reversing (see CHANGELOG.md for the px math). One-line-each
   change plus explanatory comments.
2. **The "`lifeSystem.js` cosmetic indent glitch" repeated across several old
   entries turned out to be already fixed** — `git log -- js/systems/lifeSystem.js`
   shows commit `8ba3d8d "fix: correct indentation in lifeSystem.js for better
   readability"` already resolved it; the file is correctly/consistently indented
   now. The old entries were never updated after that commit landed, so the note
   kept getting carried forward as if still open. No code change needed; leaving
   the old entries as-is (historical record) but flagging here so it stops getting
   re-surfaced as a pending item.
Ran `npm run bump-version` after the waveSystem.js edit.
**Files:** `js/systems/waveSystem.js`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending. The `lifeSystem.js` indent item can be
considered fully closed — no need to keep re-flagging it.

**Session 4 — Score frozen during wave-announcement banner (user-reported):**
User asked whether it was correct that time/score kept moving normally while
the "WAVE N" banner was up. Traced it: `startWave()` already holds spawning
back correctly via negative `state.waveTime` (nothing queued fires until it
counts up to 0 — see `runScheduledActions()`), but `updateScore()` had no
such guard, so the passive `+100*dt` score tick and combo-timer decay ran
the whole ~3s banner window regardless — ~300 free points/wave with nothing
on screen to risk them against. Gave the user 3 options (skip score only,
freeze the whole update during the banner, or keep it as an intentional
grace bonus); they picked skipping score only. Added a one-line guard
(`if (this.state.waveTime < 0) return;`) at the top of `updateScore()`.
Player movement during the banner is deliberately unaffected — only score/
combo now hold flat. See CHANGELOG.md for the write-up.
**Files:** `js/systems/game.js`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN** (no new
tests added — existing wave-flow/score suites already cover this path and
passed unchanged).
**For the next session:** Nothing pending. If a future change touches
`updateScore()` or `startWave()`'s negative-`waveTime` banner-hold trick,
keep this guard in mind — it depends on `waveTime` staying negative for the
whole banner window.

**Session 1 — Housekeeping for Session 14's W1-4 duration change + W10 formation count bump (user-requested):**
Previous entry's Session 14 (W1-4 duration → 20/23/26/29s) was left uncommitted with no `CHANGELOG.md`
entry and no version bump — added both retroactively (see CHANGELOG.md, two new entries). Note:
the working tree at pickup had the W1-4 duration edit already applied but the newest HANDOFF_LOG
entry attributed it to "Claude (Sonnet 5, claude.ai)" while the user described it as Gemini's work —
flagging the mismatch here in case it matters for whoever reads this next; did not change the
attribution on the existing entry since I can't verify which tool actually wrote it.
Also bumped `WaveSystem.buildBoss(10)`'s four `bossPerimeterCrossfire()` (rectangle/"square" formation)
counts by +20 each (10→30, 12→32, 14→34, 16→36) per user request. See CHANGELOG.md for the Phase 5
timing-margin note (fires ~59.4s into the 60s boss wave now, was ~58.5s — still safe but worth watching
if W10's pacing changes again).
Ran `npm run bump-version` after all edits (new tag — see `check-versions` output below).
**Files:** `js/systems/waveSystem.js`, `CHANGELOG.md`, plus the version-bump touches every `?v=` file.
**End-of-day test result:** `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending. If W10 Phase 5's formation count or start time changes again,
recheck the fire-time-vs-60s-cap margin noted in CHANGELOG.md.

**Session 2 — Heart item spawn frequency reduced (user-requested, "felt too frequent"):**
Walked the user through the spawn-timer math (avg ~12s between item-spawn attempts ÷ P(heart))
before changing anything, per their preference. They picked "adjust heart weight/boost only, leave
other item timing alone." Changed `CONFIG.items.weights.heart` 35→20 and `heartWeightBoost` 40→25:
full-life heart interval ~34.3s→~51.0s, hurt-state interval ~22.4s→~29.3s. See CHANGELOG.md for the
full math. Ran `npm run bump-version` after.
**Files:** `js/core/config.js`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending. If the new heart cadence still feels off in either
direction, the two knobs to revisit are `weights.heart` (baseline rate) and `heartWeightBoost`
(how much faster it gets once someone's hurt) — see the CHANGELOG math to re-derive target seconds.

**Session 3 — Shield item reworked to 1-hit-block charge; heart item no longer gives score at max life (user-requested):**
Shield item used to set `player.shieldTimer` — same mechanic as the Shield *skill*, full
`canBeHit()`-false invuln for `CONFIG.items.shieldDuration` (3s), so every bullet passed straight
through untouched for the whole window. User said it felt like temporary immortality, not a shield.
Reworked to a charge system: `player.shieldCharges` (new field, persists across waves), consumed
one-at-a-time in `LifeSystem.hit()` when > 0 (grants normal grace invuln so a burst doesn't eat
multiple charges in one frame, green particle burst instead of red damage flash, returns `'blocked'`
not `true` so it doesn't break "No Hit" wave streak but still consumes the bullet). Skill's shield
(`CONFIG.skills.shield`) is untouched — still a deliberate timed full-invuln burst, separate config
key. Also: heart item at max life used to fall back to bonus score (same as the score item) — user
wanted score to come ONLY from the dedicated score item, so that fallback is gone (now just a neutral
"เต็มแล้ว!" popup, no score). Added/updated 4 tests in `tests/unit/item.test.mjs`. Ran
`npm run bump-version` after.
**Files:** `js/entities/player.js`, `js/core/config.js`, `js/systems/itemSystem.js`,
`js/systems/lifeSystem.js`, `js/systems/game.js`, `js/rendering/renderer.js`, `CHANGELOG.md`,
`tests/unit/item.test.mjs`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN** (179 + 1 new shield-block test).
**For the next session:** Nothing pending. Note `shieldCharges` deliberately is NOT part of
`canBeHit()` — that's intentional so collision still registers and `LifeSystem.hit()` gets a chance
to consume the charge. Don't "fix" that without re-reading this entry first.

---

## 2026-08-20 — Claude (Sonnet 5, claude.ai)

**Session 14 — W1-4 duration tuning 20-30s (user-requested):**
Adjusted W1-4 durations in `WaveSystem.duration(n)` from a flat 30s to a 20-30s progression:
W1 = 20s, W2 = 23s, W3 = 26s, W4 = 29s.
Regenerated `tests/fixtures/balance-baseline.json` per balance baseline policy.
In `tests/integration/graze-score-flow.test.mjs`, set `game.state.waveDuration = 999` in the 8-bullet
graze combo test so W1 transition doesn't interrupt the multi-bullet sequence.
Updated `WAVE_DESIGN_NOTES.md`.
**Files:** `js/systems/waveSystem.js`, `tests/fixtures/balance-baseline.json`, `tests/integration/graze-score-flow.test.mjs`, `WAVE_DESIGN_NOTES.md`.
**End-of-day test result:** `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending.

**Session 13 — W9 reverseRain travel distance fix (user-requested):** Same issue as W8 Session 12.
`reverseRain(fromTop=false, speed=5.2, reverseAfter=1.35)` → 421px travel → reversed at y≈317 (midscreen).
Changed to `reverseAfter=2.2` → 686px → reverses at y≈52 (~95% from bottom), before y<-80 cull at 2.62s.
**Files:** `js/systems/waveSystem.js`. **`npm test` → 179 PASS / 0 FAIL / 0 WARN**.
**For the next session:** W10 boss also has 2 reverseRain calls with short reverseAfter (1.45 and 1.35) —
those may be intentional for boss density (lots of patterns stacked); not changed this session.

**Session 12 — W8 reverseRain travel distance fix (user-requested):** Bullets from `reverseRain`
on W8 were only reaching ~29% of the arena (y≈210 from top) before reversing. Root cause: `reverseAfter=1.55s`
× speed 2.45 × 60 = 228px travel. Changed to `reverseAfter=4.8s` → 706px → reverses at y≈688 (~95% of
arena height), safely inside the y>800 out-of-bounds cull threshold (5.56s). One number change only.
**Files:** `js/systems/waveSystem.js`.
**End-of-day test result:** `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending.

**Session 11 — W8 orbit-splitter wave-not-ending bug + hit invulnerability reduction (user-requested):**

1. **W8 orbit-splitter bug fixed.** `orbitBurst()` (called on W8 at t=0, count=32, releaseSpeed=0.9)
   spawns orbit bullets with `splitter:true, splitDelay:0.85`. At split time the parent orbit bullet
   used its `vx/vy` (cos(a)*0.9, sin(a)*0.9) to seed child speed: `0.9*0.9 = 0.81 px/frame` ≈ 48 px/s.
   At that rate the 8 child bullets took ~13 s to exit the 1280×720 arena, stalling `isWaveClear()`
   and preventing W8 from transitioning. Fix: added `splitSpeed: 3.5` to orbit-splitter opts
   (read by game.js split code via `b.splitSpeed ?? ...` fallback) and `maxAge: 2.5` on the parent as a
   safety net. Also gave non-split orbit bullets `maxAge: 4.0`. One new field added to `BulletManager.spawn()`
   (`splitSpeed: opts.splitSpeed ?? null`).
2. **Hit invulnerability reduced 3.0 → 1.0 s** in `CONFIG.lives.hitInvulnerability`. `respawnInvulnerability`
   (coop revive) unchanged at 1.0 s.

**Files:** `js/patterns/patterns.js`, `js/systems/game.js`, `js/entities/bullet.js`, `js/core/config.js`.
**End-of-day test result:** `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**For the next session:** Nothing pending. Note: if W9 orbit burst (`releaseSpeed=1.8`) also caused a slow-drain
issue it's also fixed by this same change (same `orbitBurst()` path). Only the `lifeSystem.js` cosmetic
indentation glitch (flagged Session 2) remains open as low-priority.

**Session 10 — W3-4 AIM balance follow-up (user-requested):** User said
AIM still felt too dense specifically on W3-4 (not W1-2). Added a second
tier to `aimCountMult` in `WaveSystem.build(n)`: stays `0.64` for `n <= 2`,
now `0.64 * 0.8 = 0.512` for `n <= 4` (W3-4 only) — a further ~20% cut,
~49% off the original AIM count on W3-4. `aimSpeedMult` untouched.
Regenerated `tests/fixtures/balance-baseline.json` (see CHANGELOG.md for
exact before/after numbers) — wave1/wave2 entries unchanged since they
still use 0.64. Ran `npm run bump-version` after (new tag
`20260820-5vbq`), confirmed with `check-versions`. `npm test` → **179
PASS / 0 FAIL / 0 WARN**.
**Files:** `js/systems/waveSystem.js`, `tests/fixtures/balance-baseline.json`,
`CHANGELOG.md`.
**For the next session:** Nothing pending. Note the act-timing fix (boss
wave keeps the previous act's theme; the flash/theme change now lands on
the wave right after the boss, not on the boss wave's start —
`actForWave` uses `floor((n-1)/5)`, and `Game.startWave()`'s flash trigger
checks `actForWave(n) !== actForWave(n-1)`) is already live in the
codebase but wasn't logged here or in CHANGELOG.md by whichever session
made it — if you're touching that area, the code is the source of truth,
not the Session 9 entry below (which still describes the older
boss-start-triggered version).

**Session 9 — Chapter-transition flash/shake (user-requested follow-up):**
Added a one-off "the world just changed" cue on every boss wave (chapter
banner moment). `Game.startWave()` now sets `state.actFlashAlpha = 1` +
`actFlashColor` (from the new `CONFIG.actThemes[i].accent`, via a small
`hexToRgb()` helper) and bumps `shakeMag` to 14+ whenever `isBossWave(n)`.
`Renderer.flash()` gained an optional color param (defaults to the old
hardcoded red, so the existing damage-flash call is unchanged) and
`Game.draw()` calls it a second time for the new act flash. Both decay
the same way the existing damage flash/shake already did — no new decay
logic. Ran `npm run bump-version` after (new tag `20260820-ahyy`),
confirmed with `check-versions`. `npm test` → **179 PASS / 0 FAIL / 0
WARN**.
**Files:** `js/core/config.js`, `js/systems/game.js`,
`js/core/gameState.js`, `js/rendering/renderer.js`, `CHANGELOG.md`.

**Session 8 — Per-act atmosphere (user-requested follow-up):** Act theming
from Session 7 only recolored things, so acts didn't feel distinct or
scary. Added per-act background motifs in `js/rendering/renderer.js`
(`drawGrid(wave)` now branches by act): Act 1 pulsing violet cracks, Act 2
a dying starfield (grid removed), Act 3 scorched grid + rising embers,
Act 4 near-black with rare static bursts (grid removed) — plus an
edge-only vignette that darkens a bit more per act. User's explicit
constraint: must not steal focus from bullet-dodging. Handled by
construction, not just tuning: everything draws inside `drawGrid()`,
which `drawWorld()` calls *first* (before bullets/boss/players), and
alphas are capped low (~0.35 max on the brightest element). Crack/star/
ember positions are built once via a seeded PRNG and cached
(`_actAssets()`) so nothing respawns randomly frame-to-frame. Ran
`npm run bump-version` after (new tag `20260820-rivb`), confirmed with
`check-versions`. `npm test` → **179 PASS / 0 FAIL / 0 WARN** (renderer
has no automated visual tests — this was verified by code review + the
z-order/alpha constraints above, not a test run; worth an eyeball pass
next session on an actual canvas).
**Files:** `js/rendering/renderer.js`, `CHANGELOG.md`.

**Session 7 — Narrative act theming (user-requested):** Added
`CONFIG.actThemes` + `actForWave(n)` (`js/core/config.js`) giving each
story chapter (mortal world W1-4 → seal breaks W5-9 → stars devoured
W10-14 → world unmade W15-19 → the void W20+, matching the existing
`bossNames`/chapter-banner lore) its own background color + 5-color bullet
palette. `WaveSystem.color()` now sources from the active act instead of
the old fixed `WAVE_COLORS`; `Renderer.begin()` takes a `wave` param and
repaints the canvas background per-act (`drawGrid()` reuses the same
stored color). Ran `npm run bump-version` after (new tag
`20260820-xx1g`), confirmed with `check-versions`. See CHANGELOG.md for
full details/palette values. `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**Files:** `js/core/config.js`, `js/systems/waveSystem.js`,
`js/rendering/renderer.js`, `js/systems/game.js`, `CHANGELOG.md`.

**Session 5 — W10 formation attack rework (user-requested):** Rewrote `bossPerimeterCrossfire` so bullets now fly out from the boss one by one and slot into the rectangle formation before firing simultaneously. Old behaviour: 48 bullets appeared at perimeter positions instantly, then released randomly one-by-one. New behaviour: (1) Telegraph: rectangle outline appears ~1s before. (2) Boss fires `count` bullets in rapid succession (0.045s apart); each flies at 780px/s to its rectangle slot and snaps in place. (3) After all bullets arrive + hold time, **all fire at once** toward the player. Added `flyToX/Y/Speed/Arrived` fields to `bullet.js` and a "fly-to-position" update block in `game.js updateBullets()` (before the existing perimeterHold block). Existing `perimeterHold` path is unchanged and correctly skips bullets still in flight. `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**Files:** `js/entities/bullet.js`, `js/systems/game.js`, `js/patterns/patterns.js`.

**Session 4 — edgeSplitter pattern (user-requested fairness fix):** Replaced `explodeNearPlayer` everywhere in `waveSystem.js` (W7, W8, W9, W10 boss ×2) with a new `edgeSplitter()` in `patterns.js`. The old pattern spawned splitter bullets directly beside the player (radius 65-78px away) with no warning — effectively undodgeable. The new method spawns the same splitter-type bullet from a random screen edge aimed at the player (with ±0.18 rad spread), giving the player a clear read and time to react. Bullet radius bumped 6→9 so it's more visible; splitCount 6→8. `explodeNearPlayer` is kept in the library (marked LEGACY) so nothing silently breaks. `npm test` → **179 PASS / 0 FAIL / 0 WARN**.
**Files:** `js/patterns/patterns.js`, `js/systems/waveSystem.js`.

**Session 3 — W5 boss canvas-stack bug fix (Antigravity/Claude):** Fixed the root cause of W5 boss bullets appearing to come from the wrong position / not originating from the boss. The `drawBoss()` W5 branch in `js/rendering/renderer.js` had an orphaned `c.restore()` at the end (no matching `c.save()`) which popped the viewport transform set by `begin()` off the canvas state stack. This meant every drawing call *after* the boss (bullets, players, particles) was rendered without the world-space scale/translate, causing them to appear at incorrect screen positions. Fix: wrapped the "core glow + main core + inner ring + eye" block in a matching `c.save()` / `c.restore()` pair. The three earlier rotate/translate blocks already had correct pairs; only this last un-transformed section was missing its save. `npm test` → **179 PASS / 0 FAIL / 0 WARN** (unchanged from before).
**Files:** `js/rendering/renderer.js`.

**Session 2 — W5 boss visual alignment (ChatGPT):** adjusted the W5 boss rendering so the gameplay core stays exactly anchored to `b.r`; outer seals/runes remain visual-only and no longer make the boss look offset from its bullet origin/hitbox. Added inline renderer comments explaining the constraint.
**Files:** `js/rendering/renderer.js`, `HANDOFF_LOG.md`.

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

**Session 3 — W5 boss firing-origin alignment (ChatGPT):** fixed the remaining visual mismatch where boss projectiles appeared to originate from inside the boss core. Added `PatternLibrary.spawnBossBullet()` in `js/patterns/patterns.js`; boss ring, spiral, aimed, and homing shots now spawn just outside `Boss.r` along their travel angle. The boss center remains the single source of truth, while the projectile origin is offset by `boss.r + bulletRadius + 2` so the shot visually emerges from the visible core edge without changing the boss hitbox or attack angles.


## 2026-08-20 — W10 Boss Visual + W20 Boss Name
- Added W10 boss visual: dark gravitational core, counter-rotating orbital rings, broken orbit segments, and small star particles.
- Kept W10 gameplay core anchored to `b.r`; visual rings are cosmetic only.
- Renamed boss progression: W10 `ผู้กลืนกินดวงดาร`, W15 `ผู้เฝ้ารอ ณ จุดจบ`, W20 `ผู้ที่อยู่เบื้องหลังเจ้า`.
- Added W20 to `CONFIG.bossNames`; no new W20 boss mechanics were changed.
