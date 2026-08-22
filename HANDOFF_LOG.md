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

## 2026-08-22 — Claude (Sonnet 5, claude.ai)

**Session 2 — Item pickups & "No Hit" bonus now pop "+N" next to SCORE, matching graze (user-requested, "เพิ่มขึ้น + ตรง score เหมือน graze ด้วยสิ"):**
Graze already calls `ui.showScorePopup(gained)` — a "+N" that pops right
beside the SCORE HUD stat. Items and the No Hit bonus only used
`game.spawnScorePopup()`, a different world-space popup at the pickup/
player position, so they never got that HUD-side "+" cue. Added
`game.ui.showScorePopup?.(...)` calls alongside the existing
`spawnScorePopup()` calls: item's `score`/mystery-good-score/`default`
cases in `itemSystem.js` (0-score items — heart, energy, shield, mystery
bad outcomes — intentionally skipped), and `awardNoHitBonuses()` in
`game.js` (summed across eligible players so the popup matches the actual
HUD jump in coop). Added 3 tests. Ran `npm run bump-version` after.
**Files:** `js/systems/itemSystem.js`, `js/systems/game.js`,
`tests/unit/item.test.mjs`, `tests/unit/score.test.mjs`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **184 PASS / 0 FAIL / 1 WARN**
(181 prior + 3 new, same pre-existing unrelated WARN as Session 1).
**For the next session:** Nothing pending.

**Session 1 — Item pickups & "No Hit" bonus not showing on the score HUD (user-reported, "item ที่เก็บแล้ว + คะแนน มันไม่ได้ + คะแนน" / "No hit ไม่ได้ + คะแนนจริง"):**
Traced to `updateScore()`'s `if (this.state.waveTime < 0) return;` guard (added
Session 4, 2026-08-21) — it was meant to hold only the passive `+100*dt` tick/
combo decay flat during the wave-announcement banner, but returning early also
skipped the `state.teamScore`/`state.score`/`state.grazeCount`/`state.combo`
sync that the HUD (`ui.js` `updateScores()`) actually reads. `player.score`
itself was always correct (`ItemSystem.collect()` and `awardNoHitBonuses()`
both add to it directly) — only the *displayed* number lagged until `waveTime`
next reached `>= 0`. Worse for No Hit specifically: it's awarded the instant a
wave clears and the game enters `'transition'` phase, whose branch of
`Game.update()` never called `updateScore()` at all, so the HUD stayed frozen
for the whole "NO HIT" banner. Fixed by splitting the passive-tick gate from
the HUD sync (factored the sync into a new `syncScoreDisplay()`), and calling
that sync every `'transition'`-phase frame plus right after
`awardNoHitBonuses()`. See `CHANGELOG.md` for the full write-up. Added 2
regression tests to `tests/unit/score.test.mjs`; confirmed both fail against
the pre-fix code before verifying the fix. Ran `npm run bump-version` after.
**Files:** `js/systems/game.js`, `tests/unit/score.test.mjs`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **181 PASS / 0 FAIL / 1 WARN** (180
prior + 2 new regression tests, minus 1 pre-existing unrelated WARN — see
Session 5/2026-08-21 entry, "W6+ ... empty banner subtitle", still open/
intentional and unrelated to this fix).
**For the next session:** Nothing pending. If a future change touches
`updateScore()` or the `'transition'`-phase branch of `Game.update()` again,
keep in mind the HUD only ever reads `state.teamScore`/`state.score`/
`state.grazeCount`/`state.combo` — any code path that changes
`player.score`/`player.grazeCount`/`player.combo` needs a `syncScoreDisplay()`
call to actually become visible.

---

## 2026-08-21 — Claude (Sonnet 5, claude.ai)

**Session 19 — Skill-ready persistent color back to green, flash stays cyan:**
- User wanted the *persistent* ready indicator green again (it was cyan since Session 17), but the *pop/flash notification* left as cyan.
- `.skill-card.ready .skill-status span` (both spans) and `.skill-card.ready .skill-bar i` gradient switched from `var(--accent)`/cyan back to `var(--graze)`/green (`css/main.css`).
- Deliberately did NOT touch: `@keyframes skillReadyPop` box-shadow (still `rgba(78,205,196,...)` cyan) and `Renderer.drawSkillReadyPulse()` in `js/rendering/renderer.js` (still cyan) — those are the one-shot cooldown→ready notification cues, which the user explicitly asked to leave as-is.
**Files:** `css/main.css`, `CHANGELOG.md`.
**Test result:** `npm test` — all 180 PASS, 0 FAIL, 0 WARN. Ran `npm run bump-version` after.
**For the next session:** Nothing pending.

**Session 18 — Graze spark uses player color; hit particles are now a blood effect:**
- Graze spark burst (`game.js` graze branch) switched from a fixed green (`#7bed9f`) to the grazing player's own `p.color`.
- Added `ParticleSystem.spawnBlood(x, y, count)` in `js/rendering/particles.js`: randomized dark/bright red palette, varied droplet radii, slight upward pop that arcs downward via a per-particle `gravity` field (new, opt-in — `update()` only applies it if `p.gravity` is set, so the plain `spawn()` particles are unaffected), and a slower fade (`fadeRate: 1.1` vs the default 1.5).
- Both hit-related particle bursts now use `spawnBlood()` instead of `spawn()` with a flat color: the bullet-hits-player burst in `game.js` (`this.particles.spawnBlood(b.x, b.y, 10)`) and the player-damage burst in `lifeSystem.js` (`this.game.particles.spawnBlood(player.x, player.y, 28)`). Non-hit particle bursts (bullet cleanup/despawn/split, item pickups, skill effects, shield-charge block, revive) are untouched — still plain `spawn()`.
**Files:** `js/rendering/particles.js`, `js/systems/game.js`, `js/systems/lifeSystem.js`, `CHANGELOG.md`.
**Test result:** `npm test` — all 180 PASS, 0 FAIL, 0 WARN. Ran `npm run bump-version` after.
**For the next session:** Nothing pending.

**Session 17 — UX Fixes: Skill-ready visual cues:**
- Suppressed the skill-ready pop at the very start of a new game (elapsed < 0.5s) so it doesn't fire when starting with 0 cooldown.
- Changed the skill-ready glow and screen flash color from green (`--graze`) to cyan (`--accent` / `#4ecdc4`) so it isn't confused with the Heal skill's green visual effects.
**Files:** `js/ui/ui.js`, `css/main.css`, `js/rendering/renderer.js`
**Test result:** `npm.cmd test` — all 180 PASS, 0 FAIL.

**Session 16 — Skill ready visual/UI cues:**
Added visual feedback for when a skill finishes cooling down and becomes ready to use (only triggering once on state change, not every frame):
- Skill card pop & glow: The UI card scales up and glows green around the edges for ~0.55s.
- Screen border flash: A faint green vignette flashes at the edges of the screen and decays over ~0.5-0.7s. This signals readiness via peripheral vision without obscuring the center of the playfield.
**Files:** `js/entities/player.js`, `js/ui/ui.js`, `js/core/gameState.js`, `js/rendering/renderer.js`, `js/systems/game.js`, `css/main.css`

**Session 15 — Per-stat "New Best" badges on Game Over screen (Antigravity):**
Replaced the single `🏆 New Best!` badge (score-only) with four independent per-stat badges shown as a flex row. Each badge appears only if that stat was beaten: `🏆 Best Score!` (gold), `⏱ Best Time!` (cyan), `🌊 Best Wave!` (red), `✨ Best Graze!` (green). All use the same pop-in animation. No badge row is rendered at all if no stat improved.
**Files:** `js/ui/ui.js`
**Test result:** `npm.cmd test` — all 180 PASS, 0 FAIL.

**Session 14 — Bug fix: "New Best" badge intermittently missing (Antigravity):**
Root cause: `GameState.reset()` (called when the player hits "เล่นอีกครั้ง") simply nulled `this.gameOverTimer` without cancelling it first via `clearTimeout`. If the player restarted within the 350ms `setTimeout` window after dying, the timer kept running and fired `showGameOver()` into the new run's UI, overwriting or corrupting the screen — causing the New Best badge to either never appear or flash and disappear instantly. Fix: call `clearTimeout(this.gameOverTimer)` before nulling it in `GameState.reset()`.
**Files:** `js/core/gameState.js`
**Test result:** `npm.cmd test` — all 180 PASS, 0 FAIL.

**Session 13 — Skill balance tuning (Antigravity):**
Changed `heal` skill cooldown from 10s to 30s. With a base wave duration of 30s and a max of 3 lives, a 10s cooldown allowed essentially unlimited sustain. Even at 20s, a player with heavy grazing (which can reduce cooldown by up to 60%) could heal 2-3 times per wave. 30s ensures a passive player gets at most 1 heal per wave, while highly skilled aggressive players (grazing heavily) can reduce it down to ~12s. This properly positions Heal as a high-value survival ultimate rather than a spammable skill.
**Files:** `js/core/config.js`
**Test result:** `npm.cmd test` — all 180 PASS, 0 FAIL.

**Session 12 — Game Over Screen "Run Best" column fix (Antigravity):**
Fixed the issue where achieving a new high score caused the Game Over screen's "Run Best" column to display the identical newly-updated record, preventing players from seeing the *previous* record they just beat. The `game.js` `gameOver()` method now captures `prevBest...` values before updating `localStorage` and passes them to `ui.showGameOver()`. The `ui.js` script was simplified to compare `finalScore > bestScore` directly, dropping its internal `this.priorBestScore` state.
**Files:** `js/systems/game.js`, `js/ui/ui.js`
**Test result:** `npm.cmd test` — all 180 PASS, 0 FAIL.

**Session 11 — New item: Mystery Box, 50/50 gamble pickup (user-requested, iterated over several turns: "เพิ่มอะไรอีกดี" → item brainstorm rejected twice → "Mystery Box แต่คุณต้องให้เท่าเทียมกันแบบ 50 50 สิ" → clarified 50/50 means *balanced magnitude*, not just probability, then explicitly chose the non-lethal version over a "true mirror" -1-life outcome):**
Full detail in the CHANGELOG.md entry at the top of the file. Short version: new `mystery`
item type (weight 12), resolved via `ItemSystem.resolveMysteryBox()` — a hard 50/50 roll
(NOT the weighted-roll pattern the other item types use, since that doesn't guarantee an
even split) picks good vs. bad, then a uniform 25%-each roll picks 1 of 4 sub-effects per
side. Good: heal/energy/shield/2x-score (reuses existing item effects). Bad (all temporary,
none touch lives): hitbox growth, mouse+keyboard response slowdown, skill cooldown reset,
or a screen-static overlay. New player fields (`baseR`, `hitboxTimer`, `controlDebuffMult`,
`controlDebuffTimer`) and a new `state.staticRemaining` + `Renderer.drawStatic()` overlay.
Verified the 50/50 + per-side uniformity with a 20k-sample empirical check (all 8 outcomes
landed within ~2,400-2,590 of an expected 2,500) rather than just eyeballing the logic.
**Files:** `js/systems/itemSystem.js`, `js/core/config.js`, `js/entities/player.js`,
`js/core/gameState.js`, `js/systems/game.js`, `js/rendering/renderer.js`,
`tests/unit/item.test.mjs`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN**. Had to update 3
hardcoded item-type allow-lists in `tests/unit/item.test.mjs` (pre-existing tests that
enumerated `['heart','energy','shield','score']` literally) to add `'mystery'` — those were
stale-by-construction the moment any new item type gets added, not specific to this item.
**For the next session:** Nothing blocking. Not yet visually verified in a browser (icon
legibility at item.r scale, static-overlay readability, whether the control-slowdown bad
outcome feels fair vs. frustrating in an actual dodge situation) — same "logic-verified,
not eyeballed live" gap as Session 10's rank reveal work.

**Session 12 — Fix: HUD run timer froze during NO HIT / wave-transition banner (user-reported: "แก้ตอนที่ขึ้น no hit ทำใมเวลาหยุดเดิน" → clarified via follow-up that "หยุดเดิน" meant the on-screen clock pausing, not the player character, and confirmed it happens with mouse control):**
Traced it — did NOT confirm player movement was actually blocked (it isn't: verified with a
headless repro against the real `Game` class that mouse/keyboard movement both continue fine
during `wavePhase === 'transition'`, matching the intentional design noted in Session 4's
entry above). The real bug: `update()`'s `transition` branch (covers the NO HIT banner + the
following WAVE N banner) skips `updateTimers()` entirely — correct for holding `waveTime`/
`shakeMag`/skill timers still, but `updateTimers()` is also the only place `state.elapsed`
(the HUD clock) advances, so the visible timer froze for the ~1.6-3s banner window and then
jumped back to counting. Fix: the `transition` branch now increments `state.elapsed` directly
with real frame time, independent of `updateTimers()`. Ran `npm run bump-version` after.
**Files:** `js/systems/game.js`, `CHANGELOG.md`.

**Session 14 — Fix: Game-Over screen laptop scaling via zoom (user-reported: "ในโน๊ตบุ๊คยังไม่ได้ เพราะอะไร"):**
The previous `transform: scale(...)` attempt failed on laptops because flexbox centers the unscaled layout bounds, pushing the transformed element's top and bottom out of the viewport. Replaced `transform` with `zoom` in `fitOverlayScreens()`. `zoom` properly shrinks the physical layout box, allowing the flexbox `#overlay` to flawlessly center the fully visible, shrunken panel exactly like a browser zoom. Also removed obsolete `max-height` and `overflow-y` constraints from `.menu-screen` in `css/main.css` to allow `scrollHeight` to calculate correctly without inner clipping. Follow-up: Increased `pad` calculation in `fitOverlayScreens()` from 24px to 96px to guarantee the scaled panel never visually touches the top/bottom edges of the browser, resolving "cut off" feelings on short windows. Follow-up 2: Increased CSS margins between `.rank-letter` and `.rank-phrase` to fix them being too close together.
**Files:** `css/main.css`, `js/ui/ui.js`.
**End-of-day test result:** `node ./tests/run-all.mjs` → **180 PASS / 0 FAIL / 0 WARN**.


**For the next session:** Nothing pending. If a dedicated regression test for
"elapsed keeps advancing through wavePhase transition" is wanted, `tests/integration/
wave-flow.test.mjs` is the natural home (see its existing transition-timing tests for the
pattern).

**Session 13 — New: random mechanic-reminder tip on Game Over screen (user-requested, "ผมเพิ่ม Tip ยังไงดี เช่น ถ้าผ่าน Wave โดนไม่โดนดาเมจ จะบวกแต้มเพิ่ม แต่ตอนนี้พวกรายละเอียดเล็กๆ น้อยๆ แบบนี้ ยังไม่ได้มีบอกคนเล่น" → offered How To Play-only / Pause / loading-screen / Game Over as placement options, user picked Game Over):**
Full detail in the CHANGELOG.md entry at the top of the file. Short version: new
`RUN_TIPS` array + `getRunTip(mode)` in `js/ui/ui.js`, 7 tips (NO HIT bonus, Graze +
skill-cooldown refund, Shield, Energy, Mystery Box, Heart spawn boost, coop-only revive)
picked at random per Game Over with no-immediate-repeat (same pattern as `getRankPhrase()`),
rendered via a new `.run-tip` block (`.howto-tip` styling + left-align override) in the
result screen template. Ran `npm run bump-version` after.
**Files:** `js/ui/ui.js`, `css/main.css`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN** (no new automated
tests — verified with an ad-hoc headless run against the real `UI` class with a mocked DOM,
confirming rendered text, rotation-without-immediate-repeat, and the coop-only tip never
leaking into solo; scratch script removed after).
**For the next session:** Nothing blocking. Not yet visually verified in a browser
(wrapping/line-length on narrow mobile widths, whether `.run-tip`'s left-align reads odd
next to the otherwise-centered result screen).

**Session 10 — Game-over rank reveal: build-up + per-tier pop/shake/particles (user-requested, "ทำระบบอะไรเพิ่มดี ขอว้าวๆ ไม่เอาระบบเสียง" → picked from a shortlist, then narrowed to the existing end-of-run RANK block after a live in-run version was rejected for covering the playfield):**
Full detail in the CHANGELOG.md entry at the top of the file. Short version: `showGameOver()`'s
static rank letter now cycles up from D to the actual rank (decelerating, ~0.9s for SSS,
near-instant for D) via `animateRankReveal()`, then lands with a per-tier pop/shake
(`RANK_FX` lookup → `--rank-shake-amp`/`--rank-pop-scale` CSS vars) and a DOM particle burst
(`spawnRankParticles()`, 0 particles for D up to 26 for SSS); SSS also gets a looping gold/pink
gradient shimmer on the letter. Rank phrase now fades in only after landing. Deliberately kept
entirely inside `ui.js`/`main.css` (DOM/CSS-driven) rather than reaching into `game.js`'s canvas
`ParticleSystem`/camera-shake state, since the result screen is a static post-loop overlay, not
part of live gameplay — same pattern the existing "New Best!" badge already uses.
**Files:** `js/ui/ui.js`, `css/main.css`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN** (unaffected; change is
scoped to the post-game-over result screen, not touched by any existing test). Manually verified
`node --check js/ui/ui.js` (syntax) and CSS brace balance; not yet visually verified in a browser
across all 7 rank tiers.
**For the next session:** Nothing blocking, but worth an actual browser pass through a few
ranks (at least D, S, and SSS) to eyeball timing/intensity feel — this was built and
logic-verified but not visually spot-checked live, same gap flagged for CSS work in Session 9.

**Session 9 — Mobile HUD fix: WAVE stat hidden on iPhone XR (user-reported, "wave ui หายอ่ะ เหมือนมันทับกันกับ ui ของผู้เล่น"):**
Root cause: **every `@media` block in `css/main.css` sat before the unconditional base
`#hud` rule** in source order, so the later base rule (desktop-sized 82px lives-card /
118px skill-card, both `!important`) always won the cascade over the mobile overrides meant
to shrink them — on any screen, not just narrow ones. On an iPhone XR's ~390-414px usable
width, that desktop-sized player HUD overflows its grid column and visually covers the
center `#hudCenter` WAVE stat. This looks like it undid the guarantee `CHANGES_css_cleanup.md`
documented (effective cascade verified assuming base-then-media order) — something after
that 08-15 cleanup moved the media blocks ahead of the base rules. Fix: moved the whole
`@media` block (rules only, no values changed) to the end of the file, after all base rules,
matching the structure the file's own header comment already described. Verified via an
order-independent diff (sorted/comments-stripped) that old vs new `main.css` differ only by
the added explanatory comment. Did not touch any per-breakpoint pixel values — those were
already tuned, just unreachable. `npm test` is CSS-blind (no visual assertions) so this was
verified by manually tracing the cascade (source order + specificity + `!important` tier)
for the conflicting rules, not by a screenshot — **worth an actual iPhone XR (or similarly
narrow) device/simulator check next session to confirm visually**, since no automated test
covers CSS layout in this repo.
**Files:** `css/main.css`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN** (unaffected; CSS-only
change).
**For the next session:** Nothing pending, but flagging a gap: this repo's test suite has no
visual/CSS regression coverage at all, so a bug like this (correct-looking rules that are
silently dead due to file order) can hide indefinitely. Worth considering a lightweight check
(even just "no selector should be declared in more than one place across the file" per
`CHANGES_css_cleanup.md`'s own convention) if this class of bug recurs.

**Session 8 — HANDOFF_LOG housekeeping (user-requested, "ช่วยสรุป log ให้หน่อย ตอนนี้มันยาวเกิน"):**
File had grown to 589 lines / 4 dated entries (08-18 through 08-21). Applied this file's own
"Housekeeping" rule: archived the 2026-08-20, 2026-08-19, and 2026-08-18 entries (590 → 209
lines) since their content is already permanently recorded in `CHANGELOG.md` — verified this
first rather than assuming, including confirming the 3 items those entries had flagged as
"for the next session" (the `bump-version`/tests version-tag landmine, the W6 empty-banner
WARN, the `lifeSystem.js` indentation glitch) are all already resolved (per today's Session 5
and the current `npm test` output showing 0 WARN), so nothing was silently lost. Also removed
a stray malformed block at the file's end ("## 2026-08-20 — W10 Boss Visual + W20 Boss Name")
that didn't follow this file's format and duplicated an existing `CHANGELOG.md` entry
verbatim. Fixed one dangling cross-reference in `CHANGELOG.md` that pointed at the now-removed
2026-08-19 entry. No gameplay code touched.
**Files:** `HANDOFF_LOG.md`, `CHANGELOG.md`.
**End-of-day test result:** `npm test` → **180 PASS / 0 FAIL / 0 WARN** (doc-only change,
unaffected).
**For the next session:** Nothing pending. Once this file next approaches ~500+ lines again,
repeat the same process — archive the oldest fully-CHANGELOG-covered day(s), double-check
their flagged items are actually resolved first, don't just delete on line-count alone.

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

*(2026-08-20, 2026-08-19, and 2026-08-18 entries archived per the*
*Housekeeping rule above — their content is already in `CHANGELOG.md`.*
*Nothing carried forward as pending: the items those entries flagged*
*("for the next session") — the `bump-version`/tests version-tag landmine,*
*the W6 empty-banner WARN, and the `lifeSystem.js` indentation glitch —*
*were all confirmed fixed in the 2026-08-21 entry above. If you need the*
*full session-by-session detail anyway, it's preserved in this file's*
*version history/prior copies.)*

