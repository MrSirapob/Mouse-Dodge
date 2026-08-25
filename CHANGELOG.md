# Changelog

## Rarity shine sweep: Epic no longer gets it, and Mythic's was silently broken (user-requested, "แก้ระดับ epic preview ไม่ต้องมี วิ้งๆ ให้มีวิ้งตรง legendary กับ mytic / mytic มันค้างแก้ไขด้วย")
Two fixes to the Rarity Frame System's `::before` diagonal shine sweep in
`css/main.css`. (1) Epic previously got the same shine sweep as Legendary/
Mythic — user wanted the sweep reserved for the top two tiers only, so Epic
keeps its glow pulse (`rarityGlowPulse`) but the `::before` shine rule no
longer targets `.rarity-epic`. (2) Mythic's shine looked stuck/frozen: its
tier-specific override was declared with the `background` SHORTHAND
(`background: linear-gradient(...)`), which silently resets `background-size`
back to its `auto` default — wiping out the `220% 220%` oversize set by the
shared rule above it. With the gradient sized to fit the frame exactly once,
the `@keyframes rarityShine` background-position sweep had almost nowhere to
travel, so Mythic barely appeared to move while Legendary swept normally.
Changed it to `background-image: linear-gradient(...)`, which only swaps the
gradient colors and leaves `background-size` intact. Also trimmed the
`prefers-reduced-motion` block's `::before` selector list to match (Legendary/
Mythic only, Epic removed).
**Files:** `css/main.css`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated; CSS-only change).

## Per-row "new best" arrows now also show inside the all-4 "NEW SCORE" banner state (user-requested)
Result screen previously suppressed the per-stat `↑` arrows (time/wave/score/graze)
whenever *every* stat broke its record, showing only the big "🏆 NEW SCORE" banner
instead. User wanted the arrows to show next to every stat *in addition to* the
banner, not be replaced by it. `arrow()` in `renderResultScreen()` no longer checks
`isAllNewBest` — it shows the arrow whenever that stat's `isNew*` flag is true,
banner or not. Also moved the `.best-arrow` CSS rule into the `isAllNewBest` branch's
`<style>` block (it previously only existed in the non-banner branch, so the arrows
would have rendered unstyled once shown together with the banner).
**Files:** `js/ui/ui.js`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing, unrelated).

## Lengthened Mystery Box bad-outcome durations (user-requested)
User felt the Mystery Box's 50/50 gamble's *bad* outcomes ended too quickly relative
to the risk. All three timed bad effects lengthened: `hitboxDuration` and
`controlDebuffDuration` 3.5s → 5s, `staticDuration` 1.2s → 2.5s. The good-side
outcomes (heal/skill-ready/shield/score) are instant, not timed, so nothing there
changes. Good/bad odds remain a hard 50/50; only how long a bad roll lasts changed.
**Files:** `js/core/config.js`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing, unrelated).

## Removed inner secondary-color accent entirely from skin bodies (user-requested)
Follow-up to the previous entry below: shape-matching the inner tier>=2
accent (a smaller copy of the body's own shape instead of a fixed circle)
fixed diamond/hex/square/star skins, but circle-shaped Uncommon+ skins
(e.g. Frost) still showed it as a literal circle-inside-a-circle — read
as a stray white dot/bullseye in the middle no matter what. User asked
for it gone completely. Deleted the whole inner-accent block from
`drawSkinBody()` — skin bodies are now a single solid shape with no
interior decoration; rarity is still expressed via the tier>=3 orbiting
decorations and the rarity-frame CSS glow, unchanged. `traceSkinShape()`
helper stays (still used for the one remaining body outline).
**Files:** `js/rendering/skinRenderer.js`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated).

## Fixed stray circle inside diamond/hex/square/star skin previews (user-requested)
User reported a "weird circle" inside the Skin Preview icons. Root cause:
`drawSkinBody()`'s tier>=2 inner secondary-color detail was hard-coded to
`ctx.arc()` — a plain circle drawn inside the body regardless of the
skin's actual shape. For circle-bodied skins this was invisible as a
mismatch, but for diamond/hex/square/star skins (e.g. Azure, Sakura, Sun)
it showed up as a stray dot glued inside a shape it didn't belong to, in
both Gameplay and every Preview (they share the same draw path). Extracted
the shape switch into a new `traceSkinShape(ctx, shape, r)` helper, reused
by both the main body outline and the inner accent (traced at the smaller
accent radius instead of an unconditional circle) — the accent is now
always a smaller copy of the body's own shape. Verified with a headless
`canvas`-based render of every non-circle skin shape at both tier 1 and
tier 2+ before/after. No shape/size/hitbox/gameplay change — this is the
same fix scope as the earlier Skin Preview parity work, just closing a
gap that fix didn't cover.
**Files:** `js/rendering/skinRenderer.js`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated).

## Normalized all skin visual sizes to match Default (user-requested)
Every skin's main character silhouette is now guaranteed to render at the
same size as the Default skin. Two things previously made some skins look
bigger: the `square` shape (Glitch) had corners reaching `~1.16 * r`
instead of `r`, and every Uncommon+ skin drew a filled, blurred halo
circle behind the body (plus Legendary+ had a rotating ring around it) —
both fixed. Rarity is now expressed only through small, discrete external
decorations (sparkles, stars, diamonds, shards, a comet) orbiting outside
the body, never a ring/halo/filled circle. `p.r`, hitbox, and collision
are unchanged — cosmetic-only.
**Files:** `js/rendering/renderer.js`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated).

## Added CS:GO-style tick sound to the case reel (user-requested)
The case-opening reel had its visual "tick" bounce removed earlier (see
below) for looking too much like a premature win. This adds a matching
**sound** instead, in the same CS:GO case-reel spirit: a short synthesized
click plays each time a new item crosses the pointer while the reel
spins, via a new `js/audio/reelTick.js` (Web Audio API — no sound assets
existed in the project, and none were added; it's generated on the fly:
a quick pitch-down square-wave click with a fast decay envelope). Ticks
naturally speed up/slow down with the reel's existing easing, same as a
real reel, and get a touch more weight as the spin nears its stop.
Sound-only — no visual class or bounce reintroduced.
**Files:** `js/audio/reelTick.js` (new), `js/ui/ui.js`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated). `node scripts/check-versions.mjs` → PASS.

## Reverted skin/case UI back to English (user preference)
Session 21 had translated the Skin Collection / Case / Exchange result
microcopy to Thai; the user asked to revert it back to English. Straight
revert of the strings in `js/ui/ui.js` (EQUIP, EQUIPPED, LOCKED, DEFAULT,
OPEN CASE, COLLECTED, COLLECTION COMPLETE, CASE RESULT, NEW!, DUPLICATE,
CLOSE, OK, EXCHANGE RESULT, EXCHANGE) and the matching test assertions in
`tests/unit/skin-collection-progress.test.mjs`. Mint Pulse's recolor and
Default's exclusion from Collection Progress (the other two Session 21
changes) are unaffected.
**Files:** `js/ui/ui.js`, `tests/unit/skin-collection-progress.test.mjs`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated).

## Mint Pulse recolor, Thai-language skin/case UI, Default excluded from Collection Progress (user-requested)
Three small user-requested tweaks to the Skin/Case system:
- **Mint Pulse now visually distinct from Default** — it shared the exact
  same color (`#4ecdc4`) as the player's base color, plus the same circle
  shape and no glow/trail, so equipping it looked identical to Default.
  Recolored to `#2ecc9d` / `#c8ffe8` (still mint-green, clearly different
  from Default's cyan-teal).
- **Skin/Case UI now in Thai** — EQUIP/EQUIPPED/LOCKED/DEFAULT/OPEN
  CASE/COLLECTED/COLLECTION COMPLETE/CASE RESULT/NEW!/DUPLICATE/CLOSE/OK/
  EXCHANGE RESULT/EXCHANGE all translated (ใส่ / ใส่แล้ว / ล็อกอยู่ /
  ค่าเริ่มต้น / เปิดกล่อง / สะสมแล้ว / สะสมครบแล้ว / ผลเปิดกล่อง / ใหม่! /
  ซ้ำ / ปิด / ตกลง / ผลการแลก / แลกสำเร็จ). Rarity-tier names and "SCRAP"
  kept in English to match how the rest of the UI already treats them as
  loanwords.
- **Default confirmed excluded from Collection Progress** — no code
  change; `SKINS` (the pool the progress bar counts against) never
  included the Default skin, and that's the right call since Default
  isn't part of the case/rarity pool being collected.
**Files:** `js/data/skins.js`, `js/ui/ui.js`,
`tests/unit/skin-collection-progress.test.mjs`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated).

## Case reel no longer bounces items while spinning (user-reported, "ตอนแถบสกินกำลังหมุน มีไอเทมเด้งตลอดเลย เด้งแบบเหมือนตอนเลือก")
The case-opening reel (`runCaseReel()` in `js/ui/ui.js`) tracked which item
was nearest the pointer on every animation frame and toggled a `.tick`
class on it — a quick scale-up + brightness-flash — every time a new item
crossed the pointer. With 70 items in the reel and a 6-second spin, this
fired almost continuously for the whole spin, so something always looked
like it had just "landed", visually similar to the actual winner pop that
plays once the reel stops. Removed the tick tracking from the frame loop
and the `.skin-reel-item.tick` / `skinReelTick` CSS rule entirely — the
reel now just slides smoothly to a stop with no bounce until the winning
item's landing pop (`.winner` / `skinReelWinnerPop`) plays.
**Files:** `js/ui/ui.js`, `css/main.css`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated).

## Skin Collection: Collection Progress + Missing Skin Silhouette (user-requested — add exactly these 2 features, no RNG/case-reel/scrap/equip changes)
Audited the existing Skin Collection system first, per the request: found
`index.html` already had a `#skinCollectionProgress` placeholder div and
`js/ui/ui.js`'s `renderSkinScreen()` already computed real progress numbers
and rendered a `skin-silhouette` "?" for locked cards — but **no CSS
existed for any of it** (`.skin-collection-progress`, `.skin-progress-*`,
`.skin-silhouette`, `.locked-preview` were all undefined), so the feature
was present in markup/data but effectively invisible/unstyled. Rather than
build a second Collection system, this session only added the missing
`css/main.css` styling (progress card, overall bar, per-rarity grid,
dashed silhouette placeholder, mobile breakpoints) — zero changes to
`SkinSystem`, RNG, the case reel, scrap, or equip logic.
- **Collection Progress**: headline "`N / total COLLECTED`" (+ "COLLECTION
  COMPLETE" badge at 100%), a fill bar, and a 6-rarity breakdown grid — all
  driven by `SKINS.length` and `data.ownedSkins` (real `SkinSystem` state),
  nothing hardcoded. Below 400px width the per-rarity grid hides (overall
  bar only) to avoid crowding a narrow screen, per the request's own
  fallback guidance.
- **Missing Skin / Silhouette**: locked cards already rendered a
  `skin-silhouette` "?" glyph instead of the real shape — added a dashed
  circular placeholder style for it, distinct from the real glowing
  `skin-shape`. The rarity border/label and the existing `.skin-card:disabled`
  dimming already made rarity visible without revealing the real
  color/shape — no change needed there.
Added `tests/unit/skin-collection-progress.test.mjs` (5 tests) calling the
real `UI.prototype.renderSkinScreen` against a real `SkinSystem` (fake DOM
elements only) to verify 0/total, partial, and total/total counts, that
owned cards keep the real visual, that locked cards never leak the real
shape/color, and that progress updates immediately after `awardSkin()`
with no reload needed. Registered in `tests/run-all.mjs`.
**Files:** `css/main.css`, `tests/unit/skin-collection-progress.test.mjs`,
`tests/run-all.mjs`.
**Test result:** `npm test` → **196 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated).

## Skin selector preview now matches the character actually played (user-reported, "ช่วยแก้ ให้ Preview ใน skin ตรงกับตัวละครที่เอาไปเล่นจริงๆ")
Fixed a long-documented bug (flagged since the Session 5 dev-mode notes in
HANDOFF_LOG.md 2026-08-24): equipping a skin from the Skin screen updated
the *saved* equipped skin and the selector's own preview icon right away,
but the actual in-run P1 character kept rendering the old skin until the
next `Game.reset()`/wave restart — so mid-run, the preview and the real
character could show two different skins. `SkinSystem` now takes an
`onEquip(id)` callback, invoked at the end of a successful `equip()`;
`Game` wires this to refresh `players[0].skinVisual` immediately, the same
way Dev Mode's `CYCLE SKIN`/rarity-give buttons already special-cased for
themselves. Removed those now-redundant manual `skinVisual` patches from
`js/systems/devMode.js` (`skinCycle`, `giveAndEquipRarity`) since the real
`equip()` flow handles it now; `skinResetData` keeps its manual patch since
it bypasses `equip()` entirely (direct `localStorage` wipe + reload).
Added a regression test (`tests/unit/skin.test.mjs`) asserting `equip()`
updates the live player's `skinVisual` without a `reset()` call.
**Files:** `js/systems/skinSystem.js`, `js/systems/game.js`,
`js/systems/devMode.js`, `tests/unit/skin.test.mjs`.
**Test result:** `npm test` → **191 PASS / 0 FAIL / 1 WARN** (pre-existing,
unrelated). Ran `npm run bump-version` after (`20260824-edvl`).

## Scrap confirm + collection-complete alert: bottom sheet instead of center modal (user-requested, "แก้ Noti ตอนกดสุ่มแร์ ยืนยันกับยกเลิกเอาเป็นปุ่มขึ้นข้างล่างก็ได้ ของที่กดสุ่ม และเงื่อนไขถ้าครบแล้วก็ขึ้น alert ด้านล่างดีกว่าไหนแแบบไหนดีแนะนำ")
User asked for the CONFIRM/CANCEL buttons on the scrap-exchange ask to
come up from the bottom, and asked for a recommendation on whether the
"collection complete" (all Rare+ already owned) alert should also move
to the bottom. Recommendation: yes to both, same treatment — a real
bottom sheet (slides up from the screen edge, rounded top corners, small
drag-handle bar) reads as "quick decision/notice" and is thumb-reachable
on mobile, versus a centered modal which implies a bigger, more
deliberate moment (kept for the actual case/exchange *result* reveal,
which still centers — that one's the dramatic payoff, not a quick
ask/notice, so left untouched).
Added a `.sheet` / `.sheet-panel` modifier pair in `css/main.css`: the
shared `#skinCaseResult` backdrop gets `align-items:flex-end` instead of
centered, and the inner `.skin-result-popup` gets top-only rounded
corners, full width, safe-area-aware bottom padding, and a
`sheetSlideUp` transform-based entrance instead of the center `popupScale`
zoom. Applied `sheet`/`sheet-panel` to both `showScrapConfirmPopup()` and
`showCollectionCompleteAlert()` in `js/ui/ui.js` (both already had the
instant-appear/stacked-button fix from the previous session, unchanged).
Everything else — the case-open reel, the exchange reel, the final
result popup with EQUIP/CLOSE — still centers, since none of that was
flagged. Ran `npm run bump-version` after (`20260824-k7jp`); full test
suite (191 tests) still passes.

## Scrap confirm popup: CONFIRM on top, instant appear (user-requested, "แก้ ตอนกด confirm เอาปุ่ม confirm ไว้ด้านบนแล้่วเพิ่มความเร็วแสดงปุ่ม confirm หน่อย มันช้าไป")
The 100-scrap "ใช้ 100 Scrap เพื่อสุ่ม Skin 1 ครั้ง?" ask popup
(`showScrapConfirmPopup` in `js/ui/ui.js`) was reusing the
`.result-actions` class from the case-result reveal sequence, which has a
`caseTextFade .4s ease-out .55s forwards` animation baked in — buttons sit
at opacity 0 for 550ms then fade in over 400ms, ~950ms total. That timing
makes sense for the case-opening reveal (header → skin → name → status →
actions staggering in one after another) but was just making the CONFIRM/
CANCEL buttons feel sluggish on a plain yes/no ask. Overrode
`opacity: 1; animation: none` inline on this popup's `.result-actions` so
the buttons appear immediately with the popup's own (fast, 0.6s) scale-in
instead of waiting on top of it. Also swapped the layout from side-by-side
CANCEL/CONFIRM to a stacked column with CONFIRM first (primary, on top)
and CANCEL below it (secondary). Ran `npm run bump-version` after
(`20260824-zdbh`); full test suite (191 tests) still passes.

## Scrap-100 exchange: real CS:GO-style spinning reel, not just a random+popup (user-requested, "ใช้สุ่มแบบ csgo สิ ของ 100 scrap อ่ะ ตอนนี้แค่กดสุ่มแล้วก็กด confirm popup เด้งว่าได้อะไรมาเฉยๆ แก้ซะ")
Follow-up to the entry directly below (that one fixed the *odds* to be
rarity-weighted; this one fixes the *presentation* — user pointed out it
was still just confirm-popup → instant result, no actual reel like case
opening has). Split `SkinSystem`'s exchange into two phases, mirroring
how case-opening already works (`consumeCase()` roll → `awardSkin()`
apply): `beginExchangeRarePlus()` deducts the 100 scrap and rolls only the
rarity tier (CS:GO odds, restricted to Rare/Epic/Legendary/Mythic tiers
that still have an unowned skin); `finalizeExchangeRarePlus(skinId)`
applies whichever skin the reel visually lands on (refunds the 100 scrap
if that id is ever invalid/owned — defensive, shouldn't happen). On the
UI side, generalized the existing case-opening reel
(`runCaseReel`/`finishCaseReel` in `js/ui/ui.js`) to take options
(`rollSlotRarity`, `poolForRarity`, `award`, `resultHeader`, `newLabel`)
instead of hardcoding case behavior, and added `exchangeReelOptions()` so
the exchange spins the *same* 6s reel/tick/landing animation as opening a
case — just with every slot (filler and the landing item) drawn only from
unowned Rare+ skins, and calling `finalizeExchangeRarePlus` instead of
`awardSkin` when it lands. Result popup now says "EXCHANGE RESULT" /
"EXCHANGE" instead of "CASE RESULT" / "NEW!", same as before. The
500-scrap choose-your-Rare exchange (`exchangeChooseRare`) is untouched —
it's a direct pick, not a random roll, so no reel applies there.
Verified end-to-end with a scripted run (drains all 9 unowned Rare+ skins,
scrap deducted exactly 100 per success, stops cleanly once none remain).
Full test suite (191 tests) still passes; cache-busting version bumped to
`20260824-qsi4`.

## Scrap-100 exchange: weighted CS:GO-style rarity roll (user-requested, "จากไฟล์ตอนสุ่ม scrap 100 ให้ใช้สุ่มแบบ csgo ด้วย โดย รายการที่สุ่มต้องตามเงื่อนไขระดับของ scrap 100 ด้วยนะ")
`SkinSystem.exchangeRandomRarePlus()` (the 100-scrap exchange) previously
picked a skin from the eligible pool with a flat uniform roll — every
Rare/Epic/Legendary/Mythic candidate had equal odds. Added
`rollWeightedFromPool()`, which groups the pool by rarity and rolls the
tier first using the existing `RARITY_CONFIG` weights (Rare 12, Epic 6,
Legendary 1.8, Mythic 0.2 — same odds as a case roll), then picks
uniformly among unowned skins within the winning tier. The scrap-100
eligibility condition is unchanged: still restricted to
Rare/Epic/Legendary/Mythic and unowned skins only, cost still 100 scrap.
Verified the new odds with a 200k-sample simulation (~60% Rare, ~30%
Epic, ~9% Legendary, ~1% Mythic — matches the weight ratios). Full test
suite (191 tests) still passes; cache-busting version bumped to
`20260824-6nbx`.

## Simplify Rarity Frame system to plain colored borders, follow-up (user-requested, "ผมว่าใช้แค่กรอบสีอะดีละ แค่ทำให้มันเด่นชัดก็พอ common ก็ไม่ต้องมีกรอบ เพราะแย่สุดอะไรแบบนี")
Follow-up to the Rarity Border/Frame entry directly below. The glow/
shimmer/spin animation turned out to be more than the user wanted — they
asked for just a colored border, made clear/distinct, with Common (the
worst tier) having no border at all so its absence itself signals
"nothing special." Stripped the "Rarity Frame System" block in
`css/main.css` down to that: each rarity tier above Common now just sets
`border-color: var(--rarity-<tier>)` on `.skin-preview`/`.skin-reel-item`/
`.skin-case-result`, nothing else — removed the box-shadow glows, the
Legendary `::after` shimmer-sweep pseudo-element + `raritySweep`
keyframes, and the Mythic `::before` spinning conic-gradient ring +
`mythicSpin`/`mythicPulse` keyframes entirely. Common gets no
`.rarity-common` border rule at all (previously had a flat gray border),
so `.skin-preview`/`.skin-reel-item` fall through to their existing
neutral base border, i.e. visually no rarity frame. The CSS variables
(`--rarity-common` ... `--rarity-mythic`, including the red/pink Mythic
recolor from the previous entry) and the text-color rules for
`.skin-card-rarity`/case-result labels are unchanged — only the frame
styling was simplified. Still the same single `rarity-<name>` class
sourced from `js/data/skins.js`, still applied in all four places (Skin
Collection, Case Reel, Case Result incl. its `.skin-preview` icon, Skin
Preview). No RNG/gameplay logic touched.
**Files:** `css/main.css`.
**Test result:** `npm test` — 190 PASS / 0 FAIL / 1 pre-existing WARN
(CSS-only change).

## Rarity Border/Frame system for skins (user-requested, "เพิ่ม Rarity Border/Frame ให้ระบบ Skin")
Added a single, shared "Rarity Frame System" CSS block (`css/main.css`,
right above the SKIN COLLECTION section) that gives every skin-rarity
element a consistent border + glow language driven by CSS variables
(`--rarity-common` ... `--rarity-mythic`), escalating by tier: Common is a
flat border with no glow, Uncommon/Rare/Epic step up through
increasingly visible `box-shadow` glows, Legendary adds a soft diagonal
shimmer sweep (`::after`, animated `background-position`, ~2.8s loop),
and Mythic — meant to be unmistakable at a glance — adds a spinning
conic-gradient ring (`::before`, `mask-composite` cutout so it only shows
as a ring, animated `transform: rotate`) plus a pulsing `box-shadow`
glow. Mythic's color was changed from a purple close to Epic's
(`#c7a9ff`) to a red/pink (`#ff4d8d`) specifically so the two rarest-
looking tiers (Epic/Mythic) are no longer visually similar — this was the
main pre-existing readability problem the user's ask was about. The same
`rarity-<name>` class (already computed from `s.rarity.toLowerCase()`,
i.e. straight from `js/data/skins.js` — untouched, still the single
source of truth) is now applied consistently in all four requested
places: the Skin Collection grid (added to `.skin-preview` inside each
`.skin-card`, previously only the small text label had a rarity class),
the Case Reel (`.skin-reel-item`, pre-existing, colors/glow now pull from
the same shared variables), the Case Result panel (`.skin-case-result` —
filled in the previously-missing Common/Uncommon border+glow tiers, and
added a matching `.skin-preview` icon via a new `skinResultIconHTML()`
helper in `ui.js` so the result panel shows the actual won skin's
shape/color instead of just text), and the Skin Preview swatch itself
(the same `.skin-preview` element, so it's covered everywhere it's
used). All animation is opacity/`background-position`/`transform` based
(no layout thrash), and every element type only adds a border/glow layer
around the existing skin shape — nothing occludes the skin itself. Also
updated the Dev Mode mythic rarity button's color
(`#devSkinRarityRow button[data-rarity="mythic"]`) to match the new
red/pink so the whole game speaks one rarity color language. No RNG,
drop-rate, or gameplay logic touched — `SKIN_RARITIES`/`RARITY_CONFIG`/
`SKINS` in `js/data/skins.js` are unchanged.
**Files:** `css/main.css`, `js/ui/ui.js`. Cache-busting version bumped
(`npm run bump-version`) since `ui.js` content changed.
**Test result:** `npm test` — 190 PASS / 0 FAIL / 1 pre-existing WARN
(baseline unchanged; this was a UI/CSS-only change, no gameplay module
touched). Not manually verified in a real/mobile browser this session —
see HANDOFF_LOG.md.

## Swap Act 3 (W16-20) and Act 4 (W21+) visual themes (user-requested, "เอาธีมหลัง wave 20 มาใช้ หลังผ่านบอส wave 15 แล้วเอาธีม wave 15 ไปใช้แทนหลัง wave 20 ก็คือสลับกันอ่ะ")
Swapped the two `CONFIG.actThemes` entries in `js/core/config.js`: the
stretch right after the W15 boss (W16-20) now shows what used to be the
W21+ "ความว่างเปล่าไร้จุดจบ" (void) palette (`bg: #000000`, cool
white/red-accent colors), and W21+ now shows what used to be the W16-20
"พิธีกรรมแห่งการล้าง" (ritual) palette (`bg: #180505`, red/orange
colors). Only the visual theme (background + bullet-color palette +
accent) moved — the boss chapter subtitle text in `waveSystem.js`
(`buildBoss()`'s "บทที่สาม..."/"บทสุดท้าย..." strings) is separate and
unaffected, so the story beats stay in their original order; only which
color palette plays under which stretch of waves changed. `actForWave()`
itself is untouched — verified with a throwaway script that wave 16-20
now resolve to the former W21+ theme object and wave 21+ resolve to the
former W16-20 theme object. `npm test` (184 PASS / 0 FAIL / 1
pre-existing WARN) unchanged.

## Fix: W11 VOID patterns left the arena edges/corners almost entirely safe (user-reported, "มันยังนัวๆ ตรงกลางอ่ะ ผมแค่ออกมาขอบจอก็ยังรอดสบายๆ")
Follow-up to the previous W11 fix below — that fix made `voidWell`/
`voidPulse` track the player instead of a fixed point, but three other
`case 11` patterns still had a **geometric reach problem**: they simply
never spawned bullets anywhere near the arena's outer edges/corners,
regardless of the player-tracking fix, so retreating to a wall/corner and
staying there sidestepped them completely rather than requiring a real
dodge:
- **`voidCollapse`** spawned its converging ring at a fixed 330px radius
  around center — on a 1280x720 arena that only ever covers the middle
  ~660x660 square. Every corner (and most of the outer border) was
  geometrically outside the ring's reach for the pattern's entire
  duration, every time it fired.
- **`voidLane`**'s horizontal streams only used lane heights spanning
  22%-76% of arena height (`0.22 + (b % 4) * 0.18`) — the top ~22% and
  bottom ~24% strips of the arena, right along the top/bottom walls, were
  never in any lane's path.
- **`voidSplit`**'s two stream origins were fixed interior points,
  `(300, 180)` and `(980, 540)` — quadrant-ish spots, not the arena's
  actual corners — so the *other* two corners were never in either
  stream's line of fire for the whole wave.
- **Fix:**
  - `voidCollapse` now spawns its ring at `hypot(width, height) / 2 + 40`
    (~775px) — just past every corner — instead of a fixed 330px, so each
    pulse sweeps across the *entire* play space (corners included) on its
    way in, not just the center. Its escape-gap telegraph from the
    previous fix now scales its warning ring to the same radius.
  - `voidLane` now spreads its lane heights across 8%-92% of arena height
    (was 22%-76%), and scales the number of distinct lane slots to however
    many bursts are actually passed in (2-6) instead of a hardcoded `% 4`,
    so the strips right against the top/bottom walls are covered too.
  - `voidSplit` now fires from the arena's actual four corners (with the
    same off-screen `-20`/`+20` margin `collapseCorners` in W14 already
    uses) instead of two fixed interior points, and rotates which
    *diagonal pair* of corners fires each burst so all four corners get
    swept across the wave's 4 bursts instead of two of them being
    permanently outside the pattern.
  - Verified with a temporary (not committed) scratch simulation that
    froze the player at 9 fixed spots — all four corners, all four
    mid-edge points, and dead center — for the full 40s of wave 11 and
    measured the closest any bullet ever came. Before this fix, corners
    and mid-edges were reachable by the already-player-tracking `voidWell`/
    `voidPulse` but conspicuously undertouched by the other three patterns;
    after, all 9 spots show comparable exposure (closest-approach and
    near-miss frame counts are all in the same order of magnitude, where
    before corners/mid-edges were untouched by `voidCollapse`/`voidLane`/
    `voidSplit` specifically).
  - `npm test` (184 PASS / 0 FAIL / 1 pre-existing WARN) unchanged after
    these edits. W11 isn't part of the `balance-baseline.json` regression
    check (that only tracks W1-4), so these density changes don't risk
    tripping it.

## Fix: W11 VOID patterns — some attacks were trivially avoidable, one was inescapable if the player was already inside it (user-reported)
Two separate reports about `case 11` in `waveSystem.js`:
1. "บาง pattern มาจ่อตรงกลาง ผู้เล่นแค่ไปหลบข้างๆ ก็รอดแล้ว" (some patterns
   aim at a fixed spot — the player just steps aside and survives).
2. "วงกลมที่เกิดมาล้อมตรงกลางแล้วหุบบีบ มันไม่มีทางออก ถ้าผู้เล่นอยู่ข้างใน"
   (the ring that closes in around the center has no way out if the player
   is inside it).

- **Root cause 1 — `voidWell`/`voidPulse`:** both anchored their swirl/burst
  on a hardcoded `(x, y)` passed from `waveSystem.js` (e.g. `(420, 300)`,
  `(860, 430)`) that has nothing to do with where the player actually is.
  A player who simply stayed on the opposite side of the arena never had to
  engage with the attack at all — the entire multi-second pattern was
  optional.
- **Root cause 2 — `voidCollapse`:** span a full 360° ring of bullets at
  radius 330 around a fixed center (both wave-11 calls use the exact arena
  center, `640, 360`) that collapses inward with **no gap**, unlike every
  other radial burst in the game (`ring()`, `ritualRing()`, `voidBlackout()`
  all leave a gap toward the player). If the player was standing near
  center when it fired, there was no possible escape route — a guaranteed
  hit purely by position, not by misplay.
- **Fix:**
  - `voidWell`/`voidPulse` now lock their center on the nearest player (via
    `targetPlayer()` + the existing `enforceMinPlayerDistance()` helper)
    once when the pattern opens (`voidWell`) or fresh each pulse
    (`voidPulse`, with its own short telegraph), instead of a fixed
    map coordinate. The player still has to react and can still dodge away
    once it's told them where it is — but can no longer ignore it by
    standing somewhere unrelated to the fight.
  - `voidCollapse` now telegraphs (reusing `ringWarnings`, same as
    `ring()`) 0.6s before it fires and leaves a `0.5` rad gap locked onto
    the nearest player's angle from center — same contract as every other
    radial pattern. There is always an open lane out before the ring
    finishes closing.
  - `npm test` (all 185 checks) still passes unchanged after these edits;
    the simulation-helper duration estimates for these patterns
    (`tests/helpers/simulation.mjs`) key off `count`/`interval` argument
    positions only, which were left untouched.

## Fix: W11/W13 SHADOW+VOID patterns could spawn bullets effectively on top of the player, no time to react (user-reported, "บางกระสุนมันเกิดตรงผู้เล่น หลบไม่ทัน")
- **Root cause, found via a new dodge-AI simulation audit** (temporary
  scratch script, not part of `npm test`) run against the fresh W11-14
  pattern set added earlier today:
  - `shadowFreeze` (W13) spawned its outward ring directly at the live
    player's `x, y` — zero travel distance, unavoidable by construction.
  - `shadowChase` / `shadowMemory` (W13) spawned from a player-trail
    position with no minimum offset — when the player wasn't moving fast,
    trail entries sit almost on top of the current position.
  - `shadowEcho` / `shadowTrail` / `shadowCross` (W13) had a nominal
    95-120px offset, but the old `Math.max(18, Math.min(dim-18, ...))`
    arena-edge clamp would collapse that offset back down whenever the
    player was near a wall/corner — exactly where the offset mattered most.
  - `voidBlackout` (W11) fired a full 360° ring from the exact arena
    center with **no telegraph** and a gap that rotated on a fixed
    schedule instead of tracking the player (unlike every other radial
    burst in the game — see `ring()`/`ritualRing()`). If the player was
    already near center when it fired, there was no fair way to know
    which way to go.
- **Fix:**
  - Added `PatternLibrary.enforceMinPlayerDistance(x, y, minDist)` — nudges
    a computed spawn point outward from every live player to a guaranteed
    minimum distance, then clamps to arena bounds. `shadowEcho/Trail/Cross`
    now route their offset point through this instead of the raw edge
    clamp; `shadowChase`/`shadowMemory` now use it directly on their
    trail-derived spawn point.
  - `shadowFreeze` now telegraphs: a warning ring (reusing the existing
    `ringWarnings` mechanism `ring()`/`ritualRing()` already use) appears
    at the player's position ~0.45s before the burst, and the burst fires
    from the position *captured at warning time* — not re-read at fire
    time — so moving off that marked spot during the warning genuinely
    dodges it.
  - `voidBlackout` now telegraphs the same way (0.7s warning ring at
    arena center) and locks its gap angle onto the nearest player's
    direction at warning time, matching `ring()`/`ritualRing()`'s
    contract instead of using an untracked, fixed-rotation gap.
- **Files:** `js/patterns/patterns.js`.
- Verified via a temporary dodge-AI simulation (not committed): "unfair
  spawn" events (bullet spawning within 60px of a reactively-dodging
  player) dropped noticeably on both W11 and W13 after the fix; W12/W14
  had none to begin with. `npm test` — 184 PASS / 0 FAIL / 1 WARN
  (pre-existing, unrelated).

## New: item pickups & the "No Hit" bonus now pop a "+N" next to the SCORE stat, same as graze (user-requested, "เพิ่มขึ้น + ตรง score เหมือน graze ด้วยสิ")
- **Before:** grazing already called `ui.showScorePopup(gained)`, which
  spawns a little "+N" text right beside the SCORE HUD number (see
  `.score-popup` / `grazeScoreSidePop` in `css/main.css`). Item pickups and
  the No Hit wave-clear bonus only ever called `game.spawnScorePopup()` — a
  *different*, world-space floating text that appears at the item's (or
  player's) position on the play field, not next to the HUD stat. So graze
  had the HUD-side "+" feedback and items/No Hit didn't.
- **Fix:** item pickups that actually award score (`case 'score'`, the
  score-outcome branch of the Mystery Box, and the `default` fallback) now
  also call `game.ui.showScorePopup?.(cfg.scoreValue)` — items that award
  0 score (heart, energy, shield, and Mystery's bad outcomes) intentionally
  do not, since there's no score gain to call out. `awardNoHitBonuses()`
  now also calls `this.ui.showScorePopup?.(bonus * eligible.length)` —
  summed across eligible players so the popup amount matches how much the
  displayed team/solo score total actually just jumped by.
- **Files:** `js/systems/itemSystem.js`, `js/systems/game.js`,
  `tests/unit/item.test.mjs`, `tests/unit/score.test.mjs`.
- Added 3 tests: a score-item pickup triggers exactly one
  `ui.showScorePopup` call with the right amount; a non-score item (energy)
  triggers none; and the No Hit bonus triggers one with the bonus amount.
  Full suite now 184/184 PASS (181 prior + 3 new).

## Fix: item pickups and the "No Hit" wave-clear bonus didn't visibly add score on the HUD (user-reported, "item ที่เก็บแล้ว + คะแนน มันไม่ได้ + คะแนน" / "No hit ไม่ได้ + คะแนนจริง")
- **Root cause:** `Game.updateScore()` early-returned its ENTIRE body
  whenever `state.waveTime < 0` (added in an earlier session to hold the
  passive `+100*dt` time-trickle and combo decay flat during the wave-
  announcement banner). That early return also skipped the lines that
  refresh `state.teamScore`/`state.score`/`state.grazeCount`/`state.combo`
  — the only fields `ui.js` `updateScores()` actually reads for the HUD's
  SCORE display. `player.score` itself was always correct (item pickups
  in `ItemSystem.collect()` and the No Hit bonus in `awardNoHitBonuses()`
  both add to it directly), but the visible number wouldn't move until
  `waveTime` caught back up to `>= 0` — reading as "collecting an item
  doesn't add score" or "No Hit doesn't actually add score." Made worse
  for the No Hit bonus specifically, since it's awarded the instant a wave
  clears and the game immediately enters the `'transition'` phase, whose
  branch of `Game.update()` never called `updateScore()` at all — so the
  HUD stayed frozen for the entire "NO HIT" banner, not just the moment
  waveTime happened to be negative.
- **Fix:** split `updateScore()` so only the passive tick/combo-decay is
  gated behind `waveTime >= 0`; the HUD sync now always runs, factored out
  into a new `syncScoreDisplay()` method. Also call `syncScoreDisplay()`
  from the `'transition'` phase branch (every banner frame) and right
  after `awardNoHitBonuses()`, so the displayed score is never more than
  one frame stale regardless of wave phase.
- **Files:** `js/systems/game.js`, `tests/unit/score.test.mjs`.
- Added 2 regression tests: one picks up a score item while `waveTime` is
  negative and checks `state.teamScore` updates immediately; the other
  clears a wave with no damage taken and checks `state.teamScore` reflects
  the No Hit bonus on every frame of the following transition banner
  (verified both tests actually fail against the pre-fix code before
  confirming the fix). Full suite now 181/181 PASS (180 previous + 2 new,
  minus the 1 pre-existing unrelated WARN).

## New: random mechanic-reminder tip on the Game Over screen (user-requested, "ผมเพิ่ม Tip ยังไงดี เช่น ถ้าผ่าน Wave โดนไม่โดนดาเมจ จะบวกแต้มเพิ่ม แต่ตอนนี้พวกรายละเอียดเล็กๆ น้อยๆ แบบนี้ ยังไม่ได้มีบอกคนเล่น" → considered adding to the existing How To Play screen / Pause / loading, user picked Game Over as more visible)
- **New `RUN_TIPS` array + `getRunTip(mode)` in `js/ui/ui.js`:** 7 short
  mechanic reminders (NO HIT bonus, Graze + its skill-cooldown refund,
  Shield item, Energy item, Mystery Box, Heart spawn-weight boost when
  hurt, and a coop-only "revive a downed ally" tip). One is picked at
  random each time `showGameOver()` runs, never repeating the immediately
  previous tip (same no-immediate-repeat pattern already used by
  `getRankPhrase()`). The coop-only tip is filtered out of the pool in
  solo so it can never appear there.
- **Rendered via a new `.run-tip` block** (reuses the existing
  `.howto-tip` look-and-feel from the How To Play screen — small
  accent-left-border callout — with a `.run-tip` override that
  left-aligns the text instead of inheriting `.panel`'s center-align,
  since a full sentence reads better left-aligned than centered once it
  wraps to two lines) inserted into the Game Over template between the
  score breakdown and the Play Again / Menu buttons.
- **Files:** `js/ui/ui.js`, `css/main.css`.
- Verified with a headless run against the real `UI` class (DOM mocked):
  confirmed the tip renders with the expected text, rotates across
  repeated calls without an immediate repeat, and the coop-only tip only
  ever appears in coop mode. Full suite still 180/180 PASS (unaffected —
  no existing test asserts on Game Over's exact HTML).

## Fix: run timer (HUD clock) froze during the NO HIT / wave-transition banner (user-reported, "ตอนที่ขึ้น no hit ทำใมเวลาหยุดเดิน")
- **Root cause:** `Game.update()` has an early-return branch for
  `state.wavePhase === 'transition'` (covers both the "NO HIT" banner and
  the following "WAVE N" banner) that intentionally skips `updateTimers()`
  — that function also drives `waveTime`/`shakeMag`/skill timers, which
  correctly should hold still during the banner. But `updateTimers()` is
  also the only place that advances `state.elapsed`, the HUD's run clock —
  so as a side effect the visible timer froze for the whole banner window
  (~1.6–3s) and then jumped back to counting once the next wave started.
  Reported as "เวลาหยุดเดิน" (the clock stops, then resumes).
- **Fix:** the `transition` branch now bumps `state.elapsed` directly with
  the real (unscaled) frame time each frame, independent of
  `updateTimers()`. Everything else that branch already intentionally
  holds (waveTime, shakeMag, skill cooldowns, bullets/patterns) is
  unaffected. Player movement was already unaffected by this phase (see
  HANDOFF_LOG.md Session 4) — only the clock display was actually frozen.
- **Files:** `js/systems/game.js`.
- Verified with a headless repro against the real `Game` class (via
  `tests/helpers/gameFactory.mjs`): `state.elapsed` now advances by the
  expected ~1s over 60 simulated transition frames, where before it stayed
  flat at 0. Full suite still 180/180 PASS.

## New item: Mystery Box — 50/50 gamble pickup (user-requested, "Mystery Box แต่คุณต้องให้เท่าเทียมกันแบบ 50 50 สิ")
- **New `mystery` item type**, added at weight 12 alongside the existing
  heart/energy/shield/score in `CONFIG.items.weights`. Distinct from every
  other pickup: instead of always helping, it's a coin flip.
- **Resolution (`ItemSystem.resolveMysteryBox()`, new):** a hard
  `Math.random() < 0.5` decides good vs. bad **independent of
  `CONFIG.items.weights`** (that only controls how often a Mystery Box
  itself spawns, not what it does once opened) — this was a deliberate
  correction mid-conversation: an earlier draft reused the weighted-roll
  pattern the other item types use, which the user pointed out doesn't
  actually guarantee 50/50. A second, equally-weighted roll (25% each)
  then picks one of that side's 4 sub-effects:
  - **Good** (reuses existing item effects, one at above-normal strength):
    heal 1 life, clear skill cooldown, +1 shield charge, or a score bonus
    at `CONFIG.items.mystery.scoreMultiplier` (2x) the normal `score` item.
  - **Bad** (all temporary, all non-lethal by design — see below):
    hitbox grows to `hitboxScale` (1.6x) for `hitboxDuration` (3.5s) via
    new `player.baseR`/`player.hitboxTimer` fields; mouse/keyboard
    response drops to `controlDebuffMult` (0.4x) for `controlDebuffDuration`
    (3.5s) via new `player.controlDebuffMult`/`controlDebuffTimer` fields
    (applied inside `Player.updateMouse()`/`updateKeyboard()`, so it
    affects both P1 mouse and P2 keyboard in Co-op); the current skill's
    cooldown resets to full (only if it had one — a never-used skill is
    unaffected); or a `staticDuration` (1.2s) screen-noise overlay via new
    `state.staticRemaining` + `Renderer.drawStatic()` (grain + glitch bars,
    same screen-space-overlay pattern as `flash()`/`drawLowLifeVignette()`).
- **Deliberately does NOT include a `-1 life` bad outcome.** That was
  discussed as the "true mirror" of the good side's `+1 life` (proposed,
  then explicitly walked back) — it would've meant a Mystery Box could
  outright kill a player on 1 life with zero counterplay, unlike every
  other threat in the game (which at least has an invulnerability window
  or a dodge opportunity). The shipped bad outcomes are all "harder to
  play for a few seconds", never "loses progress/health directly".
- **Verified 50/50 + per-side uniformity empirically** (20,000 simulated
  `resolveMysteryBox()` calls, `player.lives`/`score`/`shieldCharges`
  reset between runs): all 8 outcomes landed within ~2,400-2,590 (expected
  2,500 each), confirming no directional bias.
- **New icon:** `mystery` entry in `ITEM_ICON_DRAWERS` (`renderer.js`) — a
  stroked "?" glyph, drawn as vector paths like every other item icon (no
  new asset file needed, unlike a new skill icon would require).
- **Files:** `js/systems/itemSystem.js`, `js/core/config.js`,
  `js/entities/player.js`, `js/core/gameState.js`, `js/systems/game.js`,
  `js/rendering/renderer.js`, `tests/unit/item.test.mjs` (updated 3 stale
  hardcoded item-type allow-lists to include `mystery` — pre-existing
  tests, not weakened, just no longer stale).

## Game-over rank reveal: slot-style build-up + per-tier landing pop/shake/particles (user-requested, "ขอว้าวๆ ไม่เอาระบบเสียง" → narrowed down to the existing end-of-run RANK block)
- **Before:** `showGameOver()` in `js/ui/ui.js` computed the run's rank
  (`getScoreRank()`, D through SSS off `CONFIG.rank.thresholds`) and printed
  it straight into the result screen as static text — same treatment for a
  D as an SSS, no build-up, no tier-based payoff.
- **Added a 3-part reveal, gated entirely to the already-static Game Over
  screen (no canvas/`game.js` changes, so it can't interfere with live
  dodging):**
  1. **Slot-style build-up** — `animateRankReveal()` cycles the rank letter
     up from D to the run's actual rank, one step at a time, with each
     step's delay growing (`55 + i*35`ms) so it decelerates into the
     landing. A D result barely cycles (lands immediately); an SSS result
     climbs through all 7 tiers over ~0.9s.
  2. **Per-tier landing pop + panel shake** — `RANK_FX` (new lookup, keyed
     by rank) drives `--rank-shake-amp`/`--rank-pop-scale` CSS custom
     properties set inline by `landRank()`; D/C are near-silent (0-1px
     shake), SSS is the strongest (10px shake, 1.32x pop) — see
     `@keyframes rank-shake`/`rank-pop-scale` in `main.css`.
  3. **Per-tier particle burst** — `spawnRankParticles()` scatters 0
     (D) to 26 (SSS) small DOM dots outward from the rank letter via
     `@keyframes rank-particle-fly`, colored from `RANK_FX[rank].colors`.
     SSS additionally gets a looping gold/pink gradient shimmer on the
     letter itself (`rank-shimmer` keyframe, text painted via
     `background-clip: text`).
  - Rank phrase (`RANK_PHRASES`) now fades in only after landing
    (`.rank-phrase-visible`) instead of appearing simultaneously with
    everything else.
- **Why DOM-only, not the canvas `ParticleSystem`/camera shake:** the
  canvas is a game-loop concept tied to live play; the result screen is a
  static overlay drawn after the loop stops. Reusing canvas shake/particles
  would've meant reaching back into `game.js` state for a screen that isn't
  even guaranteed to have the canvas visible. A self-contained DOM/CSS
  version keeps this entirely inside `ui.js` + `main.css`, matching how the
  existing "New Best!" badge is already implemented.
- **Iterated with the user before landing on this scope:** first pass
  considered a live in-run rank-up popup, rejected for covering the
  dodge playfield ("ถ้าโชวระหว่างเล่นมันจะบังเอานะ") even with an
  edge/corner placement; settled on enhancing the existing end-of-run
  reveal instead, which sidesteps the overlap problem entirely.
- **Files:** `js/ui/ui.js`, `css/main.css`.

## Mobile HUD: WAVE stat hidden behind the player HUD on narrow phones (e.g. iPhone XR) — fixed a dead-CSS structural bug in `main.css` (user-reported)
- **Symptom:** on narrow phone widths, the WAVE stat in the center HUD
  (`#hudCenter`) appeared to vanish/get covered by the player 1 (and, in
  co-op, player 2) lives/skill cards.
- **Root cause: every `@media` responsive block in `css/main.css` was
  physically located near the *top* of the file, before the unconditional
  base rules for `#hud` further down** (added by a prior "CSS cleanup"
  pass — see `CHANGES_css_cleanup.md` — whose own notes say the effective
  cascade was verified assuming base rules come first; something after
  that pass moved the media blocks ahead of them, silently breaking that
  assumption). CSS resolves equal-specificity `!important` conflicts by
  **source order**, not by which `@media` condition is "more specific" —
  so the later, unconditional base `#hud` rule (fixed-width 82px lives
  card + up to 118px skill card, sized for desktop) always won over the
  earlier mobile overrides meant to shrink those, on every screen size,
  including phones. On an iPhone XR (~390-414px usable width), that
  desktop-sized player HUD doesn't fit and overflows past its grid column
  into the center column, visually covering the WAVE stat — matching the
  reported symptom exactly.
- **Fix:** moved the entire block of `@media` rules (previously lines
  25-358) to the end of the file, after all base rules — no rule content
  changed, only position, restoring the file's own documented structure
  ("BASE/RESET ... then responsive @media overrides, then @keyframes
  animations" — see the header comment in `main.css`). Verified via an
  order-independent diff (sorted, comments/blank-lines stripped) that the
  only difference between old and new `main.css` is the added explanatory
  comment — no rule was gained, lost, or altered.
- **Not changed:** the actual per-breakpoint values (which breakpoint sets
  what pixel size) — those were already correctly tuned across many past
  sessions; they just weren't reachable at all until this fix. If mobile
  HUD sizing still needs adjustment after this, that's a separate,
  now-actually-live set of rules to tune (see the `@media` blocks at the
  end of `main.css`).
- **Files:** `css/main.css`.

## W10 boss `bossSpiral()` bursts replaced with a new `bossNova()` pattern (user-requested: W10 shouldn't reuse W5's signature gimmick)
- **W10 reused W5's `bossSpiral()` verbatim** as its sustained-pressure filler
  (added in the density pass documented in the entry directly below). That
  meant the two bosses shared their signature attack, which cuts against
  this project's own design intent ("Bosses carry the distinctive
  gimmicks" — `WAVE_DESIGN_NOTES.md`).
- **Added `PatternLibrary.bossNova(start, duration, pulses, count, speed,
  color)`** (`js/patterns/patterns.js`): fires `pulses` telegraphed,
  instantaneous full-ring shockwaves evenly spaced across `duration`
  (`count` bullets per ring), each pulse a little faster than the last and
  alternating pulses rotated by half a slice so consecutive rings don't
  share a lane. This is a different shape from `bossSpiral()` (one
  continuous stream of rotating arms) — same "fills the gaps between
  phases" role, distinct silhouette.
- **Swapped all 4 `bossSpiral()` calls in `buildBoss(10)` for `bossNova()`**,
  keeping the same start times/windows (so the "never overlaps a Perimeter
  telegraph-to-fire window" invariant from the density pass still holds):
  Phase 1 (1.0s, 5.0s dur, 10 pulses × 22), Phase 2 (13.5s, 2.0s dur, 4 × 18),
  Phase 4 (39.0s, 6.0s dur, 12 × 30 — the wave's busiest stretch), Phase 5
  (55.0s, 3.0s dur, 6 × 22).
- **`simulateWave(10)` before → after this swap:** peak active 372→357
  (88.6%→85.0% of the 420 cap, close to the prior bossSpiral-based figure),
  average active 112.0→96.6, spawned 1554→1478. Burst-style patterns
  inherently read as periodic spikes rather than a sustained stream, so
  average active is a bit lower for a similar total spawn count and a
  comparable peak — an accepted trade-off for giving W10 its own identity
  rather than nerfing it back toward W5-lite. `bossSpiral()` itself is
  untouched and still used by W5/W15/the default boss case.
- **Also added a `bossNova` entry to `tests/helpers/simulation.mjs`'s
  `capturePatternPlan()` `durationFor` map** (same shape as `bossSpiral`'s)
  so pattern-overlap tooling accounts for it, and to the `PATTERN GUIDE`
  header comment in `js/systems/waveSystem.js`.
- **Files:** `js/patterns/patterns.js`, `js/systems/waveSystem.js`,
  `tests/helpers/simulation.mjs`.

## W10 boss density pass — added `bossSpiral()` layering (user-requested: playtester said W10 felt easier than W5)
- **`simulateWave(10)` showed W10 was the least dense wave of W1-10**: peak
  155/420 (37%), average active 53.4, 694 total bullets spawned over the
  60s wave — versus W5's peak 340/340 (100%, hitting the cap and dropping
  511 spawn attempts), average active 262.0, 3838 spawned. A boss wave
  reading as less demanding than the earlier waves around it (let alone the
  earlier boss) matches a real playtester report of W10 feeling easier
  than W5.
- **Root cause: W10 never called `bossSpiral()`**, the pattern W5 leans on
  most for sustained pressure — it fires a fixed 20 steps/sec regardless of
  its `duration` argument, so `arms` bullets every 0.05s (3 arms = 60
  bullets/sec). W10's pattern set (`bossAimed`, `bossRing`,
  `bossPerimeterCrossfire`, `edgeSplitter`, `reverseRain`, `bossHoming`,
  `machineGunTop`, `movingSweep`, `sineRain`) has nothing else with that
  continuous a spawn rate.
- **Fix:** added 4 `bossSpiral()` bursts into `buildBoss(10)`'s
  "connective tissue" between phases — timed to never overlap a Perimeter
  Formation's telegraph-to-fire window, since those are deliberately kept
  SOLO (see the existing in-code comment). Phase 1 (1.0s, 5.0s dur, 3 arms),
  Phase 2 (13.5s, 2.0s dur, 2 arms — short gap before its telegraph),
  Phase 4 (39.0s, 6.0s dur, 3 arms — layered into the wave's busiest
  stretch alongside machine gun/moving sweep, matching W5's "no dead air"
  philosophy), Phase 5 (55.0s, 3.0s dur, 2 arms — after the final
  Perimeter fires, through the closing `bossHoming`).
- **Result:** peak 155→372 (89% density), average active 53.4→112.0,
  spawned 694→1554, pattern count 8→9. Peak density is now close to W5's
  (89% vs 100%) though average sustained pressure is still lower — W10
  leans more on its telegraphed formation "set pieces" than W5's
  continuous barrage, which is an intentional difference in feel, not a
  gap to fully close.
- **Files:** `js/systems/waveSystem.js`.

## W10 boss `reverseRain` traveled too shallow before reversing (same bug as the W8/W9 fix, user-requested)
- **Both `reverseRain()` calls in W10's boss pattern set (Phase 3) still had
  the pre-fix short `reverseAfter` values** (1.45 and 1.35) that Sessions
  12/13 already identified and fixed for W8/W9 — left un-applied to the
  boss wave and flagged in `HANDOFF_LOG.md` as "may be intentional." Not
  intentional: same shallow-penetration bug (bullets only reached ~33-34%
  of the 720px arena before reversing back the way they came).
  - `reverseAfter=1.45` (speed 2.8, from top) → `4.2`: travel
    243.6px (~34%) → 705.6px (~95%).
  - `reverseAfter=1.35` (speed 2.9, from bottom) → `3.95`: travel
    234.9px (~33%) → 687.3px (~95%).
  Both now match the ~95% penetration ratio used by the W8/W9 fix.
- **Files:** `js/systems/waveSystem.js`.

## Score no longer accrues during the wave-announcement banner (user-reported)
- **`Game.updateScore()` ran unconditionally every frame, including while
  `state.waveTime` is still negative** (the window `startWave()` uses to
  hold spawning back until the "WAVE N" banner finishes — see
  `bannerDisplayMs`, 3000ms). Spawning was correctly held off during that
  window, but the passive `+100 * dt` score-per-second tick and combo-timer
  decay were not, so every wave handed out ~300 risk-free points before a
  single bullet existed.
- Fix: `updateScore()` now returns immediately while `state.waveTime < 0`,
  so score and combo stay flat for the banner's duration and resume the
  instant spawning does. Player movement is untouched — you can still
  reposition freely while the banner is up.
- **Files:** `js/systems/game.js`.

## Shield item reworked to charge-based block (not timed invuln); heart item no longer gives score at max life (user-requested)
- **Shield item was the same time-based full-invuln as the Shield skill**
  (`player.shieldTimer`, `canBeHit()` returns false for the whole window) —
  for a few seconds every bullet simply passed through the player untouched,
  which read as "immortal" rather than "shielded." Gave the item its own
  mechanic, separate from the skill:
  - New `player.shieldCharges` (int, default 0, persists across waves until
    used — not reset per-wave like `tookHitThisWave`).
  - `CONFIG.items.shieldHits` (1) / `shieldMaxCharges` (1) replace the old
    `CONFIG.items.shieldDuration`. `CONFIG.skills.shield` (the skill) is
    untouched — still a deliberate timed invuln burst on a 6s cooldown.
  - `canBeHit()` was **not** changed to check `shieldCharges` — collision
    still needs to register so the shield has something to block. Instead
    `LifeSystem.hit()` checks `shieldCharges` first: if > 0, consumes one
    charge, grants the normal brief grace invuln (`CONFIG.lives.hitInvulnerability`)
    so a cluster of overlapping bullets can't burn more than one charge in
    the same frame, does a lighter shake + green particle burst (no red
    damage flash), and returns `'blocked'` instead of `true`.
  - `Game.hitPlayer()` now only sets `tookHitThisWave = true` on a real
    (`true`) hit — a `'blocked'` shield-absorb still returns truthy (so the
    bullet gets consumed/removed like normal) but doesn't break a "No Hit"
    wave streak.
  - `Renderer`'s shield ring (drawn around the player each frame) now shows
    on `shieldTimer > 0 || shieldCharges > 0` so the charge-based version
    still gets a visual "I'm shielded" indicator, just without the ring
    fading over a multi-second timer.
- **Heart item at max life no longer awards bonus score** — previously fell
  back to `player.score += cfg.scoreValue` (same as the dedicated score
  item). Now shows a neutral "เต็มแล้ว!" popup and does nothing else; score
  only comes from the `score` item type going forward.
- **Files:** `js/entities/player.js`, `js/core/config.js`,
  `js/systems/itemSystem.js`, `js/systems/lifeSystem.js`,
  `js/systems/game.js`, `js/rendering/renderer.js`,
  `tests/unit/item.test.mjs`.

## Item drops: reduced heart spawn frequency (user-requested — "felt too frequent")
- **`CONFIG.items.weights.heart`**: 35 → 20. **`CONFIG.items.heartWeightBoost`**: 40 → 25.
  `energy`/`shield`/`score` weights and `spawnMin`/`spawnMax` (9-15s, ~12s avg roll between
  item-spawn attempts) all unchanged — only heart's odds moved.
- **The math:** expected time between hearts = (avg seconds per spawn-attempt roll) ÷
  P(heart). At full life: `12 / (20/85) ≈ 51.0s` (was `12 / (35/100) ≈ 34.3s`). Once any
  active player is below max life (`heartWeightBoost` applies): `12 / (45/110) ≈ 29.3s`
  (was `12 / (75/140) ≈ 22.4s`). The old boost effectively doubled heart odds (35%→53.6%)
  the instant anyone took damage — in a bullet-hell run that's most of the playtime, which is
  why hearts read as near-constant. New values keep the same "heals show up faster when
  actually needed" behavior, just less aggressively.
- **Files:** `js/core/config.js`.

## W10 boss: perimeter-formation ("square") bullet count +20 per occurrence (user-requested)
- **`WaveSystem.buildBoss(10)`** — all four `bossPerimeterCrossfire()` calls
  (the rectangle-outline formation attack, one per boss phase) had their
  `count` raised by 20: Phase 1 10→30, Phase 2 12→32, Phase 3 14→34,
  Phase 5 16→36. `start`/`interval`/`speed` untouched, so the telegraph
  timing and per-bullet speed are the same — only the number of bullets
  making up each rectangle increased.
- **Timing note (Phase 5 only):** `bossPerimeterCrossfire`'s fire moment is
  `start + (count-1)*0.045 + 0.8 + holdTime` seconds into the wave. With
  the new count, Phase 5's formation now fires at ~59.4s into a 60s boss
  wave (was ~58.5s) — margin before `Game.beginWaveTransition()` wipes
  `actionQueue` on the `active`→`draining` cutover shrank from ~1.5s to
  ~0.6s. Still fires in time in testing, but if W10's boss duration or
  Phase 5's start time ever moves earlier, this is the thing that breaks
  first (formation bullets spawn but never get their release signal, then
  sit idle until `maxAge` expires and stalls wave-clear).
- **Files:** `js/systems/waveSystem.js`.

## W1-4 wave duration tuning: 20/23/26/29s progression (user-requested)
- **`WaveSystem.duration(n)`** — W1-4 changed from a flat 30s each to a
  ramp: W1=20s, W2=23s, W3=26s, W4=29s. W5+ unaffected (boss 60s,
  W6-14 40s, W16-19 45s, W20+ 60s).
- Regenerated `tests/fixtures/balance-baseline.json` for W1-4 (shorter
  waves spawn fewer bullets in the same window — W3's `peakActive` no
  longer pins the 420 cap since it now runs out of time first).
- `tests/integration/graze-score-flow.test.mjs`'s 8-bullet graze-combo
  test now pins `game.state.waveDuration = 999` so the shortened W1
  duration can't cut the multi-bullet sequence off mid-test.
- **Files:** `js/systems/waveSystem.js`, `tests/fixtures/balance-baseline.json`,
  `tests/integration/graze-score-flow.test.mjs`, `WAVE_DESIGN_NOTES.md`.

## Chapter-transition cue: accent-colored flash + shake burst on every boss wave (user-requested follow-up)
- **Added `CONFIG.actThemes[i].accent`** — one bright color per act, used
  only for this cue (not part of the bullet-color cycle).
- **`Game.startWave(n)`** — when `isBossWave(n)` is true (every chapter
  banner moment: W5/10/15/20/25/...), now also sets
  `state.actFlashColor` to that act's accent (via a new `hexToRgb()`
  helper) and `state.actFlashAlpha = 1`, plus bumps `state.shakeMag` to at
  least 14. Both decay the same way the existing damage flash/shake do.
  Goal: a new chapter reads as "the world just changed" the instant the
  boss wave starts, not just via new banner text.
- **`Renderer.flash(alpha, rgb)`** now takes an optional `"r,g,b"` color
  (defaults to `'255,0,0'`, so the existing damage-flash call site is
  unchanged); `Game.draw()` calls it a second time with
  `state.actFlashAlpha` / `state.actFlashColor` for the new cue.
- **`GameState`** gained `actFlashAlpha` (0) and `actFlashColor` (default
  red) fields, reset with everything else on a new run.
- **Files:** `js/core/config.js`, `js/systems/game.js`,
  `js/core/gameState.js`, `js/rendering/renderer.js`.

## Per-act atmosphere: distinct background motifs + edge vignette (user-requested — "scarier and distinct, but stay off the bullets' focus")
- **Added `Renderer.drawGrid(wave)` per-act branching + 7 new private
  draw methods** (`_drawGridLines`, `_drawCracks`, `_drawStars`,
  `_drawScorchedGrid`, `_drawEmbers`, `_drawVoidStatic`,
  `_drawActVignette`) so each story act (see the palette work above) gets
  its own background motif instead of only a recolored grid: Act 0
  unchanged plain grid; Act 1 faint pulsing violet crack lines over a
  dimmed grid; Act 2 grid removed entirely, replaced by a dim starfield
  where individual stars slowly wink out (devoured); Act 3 wider scorched
  grid + the crack paths in ember-red, plus embers drifting upward; Act 4
  no grid, near-black, with rare brief white static bursts (~150ms every
  ~4s). An edge-only radial vignette (`_drawActVignette`, alpha capped
  0.10→0.30 across acts 1-4) darkens the corners a bit more each act.
- **Kept everything strictly in the background layer, by construction:**
  all of this draws inside `drawGrid()`, which `drawWorld()` still calls
  *first*, before warnings/lasers/boss/items/bullets/particles/players.
  Alpha values are deliberately low (max ~0.35 for the brightest star,
  ~0.18 for embers, ~0.30 for the vignette) so nothing here can visually
  compete with or obscure a bullet — it's asset + z-order, not just a
  tuning number, so it can't regress by someone bumping an alpha later
  without also moving the draw call.
- **`_actAssets()`** lazily builds and caches (on the renderer instance)
  the crack paths / starfield / ember spawn points once via a tiny seeded
  PRNG, so positions stay fixed frame to frame — only opacity/position
  *animate* via `performance.now()`. Respawning them randomly every frame
  would read as noise and compete with bullets for attention, which is
  exactly what this was asked to avoid.
- **`Renderer.drawWorld(game)`** now passes `game.state.wave` into
  `drawGrid()`.
- **Files:** `js/rendering/renderer.js`.

## Narrative "act" theming: background + bullet palette shift per boss chapter (user-requested)
- **Added `CONFIG.actThemes` and `actForWave(n)` to `js/core/config.js`.**
  The story was already implicit in `CONFIG.bossNames` and the chapter
  subtitles `WaveSystem.buildBoss()` returns (seal awakens W5 → heaven/stars
  devoured W10 → world ritually unmade W15 → only the formless void remains
  W20+) but had no visual to match it. `actThemes` is a 5-entry array (one
  per act, index = `actForWave(n)`) giving each chapter its own `bg` (canvas
  background) and `colors` (5-color bullet palette, same cycle length as
  the old fixed `WAVE_COLORS`). Act boundaries land exactly on boss waves
  (5/10/15/20) so the palette shift lands on the same wave the chapter
  banner does. `actForWave` caps at act 4 so every endless wave past 20
  stays in the final void palette.
- **`WaveSystem.color(n, offset)`** now reads `CONFIG.actThemes[actForWave(n)].colors`
  instead of the old module-level `WAVE_COLORS` constant (removed). Every
  existing call site (`aimed`/`ring`/`wall`/etc. closures in `build()`, and
  the `c1`/`c2`/`c3` boss colors in `buildBoss()`) is unchanged — they just
  now resolve to a different palette depending on the wave's act.
- **`Renderer.begin(shake, wave)`** takes a new `wave` param, resolves
  `CONFIG.actThemes[actForWave(wave)].bg`, and stores it on `this.bg` so
  `drawGrid()` (called later the same frame via `drawWorld()`) repaints the
  world-space background with the same color instead of the old hardcoded
  `#07070c`. `Game.draw()` now calls `this.renderer.begin(shake, this.state.wave)`.
- **Palettes:** Act 0 W1-4 "โลกยามค่ำ" (unchanged, original colors/bg) → Act 1
  W5-9 "รอยร้าวแรกของผนึก" (violet/indigo) → Act 2 W10-14 "ท้องฟ้าที่ไร้ดวงดาว"
  (cold blue/cyan) → Act 3 W15-19 "พิธีกรรมแห่งการล้าง" (blood red/ash) →
  Act 4 W20+ "ความว่างเปล่าไร้จุดจบ" (monochrome + one red accent).
- **Files:** `js/core/config.js`, `js/systems/waveSystem.js`,
  `js/rendering/renderer.js`, `js/systems/game.js`.

## Pause screen: separate "Resume" from Restart/Menu, plus an always-visible Space-bar hint
- **Added a dedicated "เล่นต่อ" (Resume) button to the Pause screen.**
  Previously Pause only offered "เล่นใหม่" (Restart) and "กลับเมนู" (Menu) —
  no button actually resumed the run, so players who paused by reflex (or
  wanted to resume with the mouse instead of Space) had no safe way back in
  and would sometimes hit Restart/Menu by mistake instead. Resume is now the
  primary, most prominent action (`#pauseResumeBtn`, `.start.resume-btn`
  styling) and is visually separated from Restart/Menu by a "หรือ" divider
  (`.pause-actions-divider`) so a misclick can't restart or quit a run the
  player only meant to resume. Wired via a new `UI.setResumeHandler()` →
  `Game.togglePause()`, matching the existing Space-bar behavior.
- **Added a persistent "Space bar เพื่อหยุดเกม" hint, top-right of the HUD**
  (`.space-hint`, `position: fixed` so it isn't affected by the HUD's own
  grid/layout changes across breakpoints), so the pause control is
  discoverable without opening How-to-Play. Bordered pill with the accent
  gradient on `<kbd>Space bar</kbd>` to read as a keycap. Hidden at
  `max-width: 700px` (mobile has no keyboard).
- **Fixed: `showResultScreen()` never hid the Pause overlay.** Every other
  screen-transition method (`returnToMenu()`, `showModeScreen()`, etc.)
  explicitly hides `#pauseOverlay`; `showResultScreen()` — the one Game Over
  actually calls — did not. Normally harmless since Pause can only reach
  Game Over indirectly, but it left the Pause overlay (`z-index: 30`, opaque
  backdrop) able to visually bury the entire result screen — including its
  "Reset Best" button — behind Pause's own smaller button set in any path
  that reached Game Over without Pause explicitly closing first. Added the
  missing `this.pause?.classList.add("hidden")` call.
- **Files:** `index.html`, `js/ui/ui.js`, `js/systems/game.js`,
  `css/main.css`.

## Test fixture gap: `makeFakeUI()` missing `setResumeHandler`, broke every `createGame()`-based test
- **Fixed: the whole suite's `createGame()` helper threw on construction**
  (`this.ui.setResumeHandler is not a function`) after the Pause/Resume
  change above added a `this.ui.setResumeHandler(...)` call to `Game`'s
  constructor. `tests/helpers/gameFactory.mjs`'s `makeFakeUI()` stub records
  every other `UI.set*Handler` method the constructor calls
  (`setMenuHandler`, `setResetBestHandler`, `setMouseSensitivityHandler`)
  but was never updated for the new one — since almost every unit,
  integration, and simulation test goes through `createGame()`, this took
  the suite from 179 PASS to a wall of `TypeError`s across unit, simulation,
  and integration files. A reminder that a new `Game` constructor call
  wired through `this.ui.*` needs a matching stub in `makeFakeUI()` in the
  same change, not as a follow-up.
- Added `setResumeHandler: record('setResumeHandler')` alongside the other
  handler stubs. `npm test` → **179 PASS / 0 FAIL / 0 WARN** (back to
  baseline). `npm run check-versions` → PASS, single consistent tag
  `20260814w10final` across 49 occurrences / 27 files.
- **File:** `tests/helpers/gameFactory.mjs`.

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

## W3-4 AIM balance tuning (follow-up to the W1-4 pass below)
- **Extra 20% AIM count cut, scoped to W3-4 only.** Per user feedback that
  AIM still felt too dense specifically on W3-4 (W1-2 were fine as-is),
  `aimCountMult` in `WaveSystem.build(n)` (`js/systems/waveSystem.js`)
  is now `0.64` for `n <= 2` (unchanged) and `0.64 * 0.8 = 0.512` for
  `n <= 4` (i.e. W3-4), a further ~20% cut on top of the existing W1-4
  reduction — ~49% fewer AIM projectiles than the original count on W3-4
  specifically. `aimSpeedMult` (1.08) is untouched and still applies to
  all of W1-4.
  - `tests/fixtures/balance-baseline.json` regenerated: wave3
    `spawned` 1515 → 1481, `averageActive` 204.72 → 196.93; wave4
    `spawned` 1809 → 1776, `peakActive` 396 → 385, `averageActive`
    241.35 → 235.69. Wave1/wave2 numbers unchanged (they still use 0.64).

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
  the session that found it).
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

### 2026-08-20 — W5 boss visual alignment
- Kept the W5 boss core radius exactly tied to `Boss.r` so the visible core matches the existing collision and bullet spawn origin.
- Reduced/anchored the surrounding seal and rune geometry to visual-only offsets around that core.
- Added code comments documenting that the visual pulse must not change the gameplay-facing core size.

## 2026-08-20 — W5 boss firing origin alignment
- Added a shared `spawnBossBullet()` helper in `js/patterns/patterns.js`.
- W5 boss ring/spiral/aimed/homing projectiles now begin just outside the boss core along their firing direction.
- Kept `Boss.x`, `Boss.y`, `Boss.r`, hitbox behavior, and attack angles unchanged.
- Documented the change in `HANDOFF_LOG.md` for the next AI/editor handoff.
- Verification: `npm test` => 179 PASS, 0 FAIL, 0 WARN.


### 2026-08-21 — Skill-ready persistent color reverted to green
- The persistent "ready" state on the skill card (READY status text +
  progress bar fill) is back to green (`var(--graze)` / `#7bed9f` gradient)
  instead of cyan.
- Left the *notification* pop/flash effects as cyan (unchanged, per request):
  the `skillReadyPop` scale/glow animation on the card, and the
  `drawSkillReadyPulse()` screen-edge flash in `renderer.js`. Those are the
  one-shot "hey, it's ready now" cues fired on the cooldown→ready edge, kept
  distinct from Heal's green so the flash itself still reads clearly.
- Verification: `npm test` => 180 PASS, 0 FAIL, 0 WARN.

### 2026-08-21 — Graze/hit particle colors
- Graze spark burst now uses the grazing player's own color (`p.color`) instead
  of a fixed green (`#7bed9f`), so it visually matches whichever player earned it.
- Player-hit and bullet-hit-player particle bursts now use a new
  `ParticleSystem.spawnBlood()` effect: a mix of dark/bright red shades,
  varied droplet sizes, a slight upward pop that arcs downward under gravity,
  and a slower fade — reads as a blood splatter instead of a generic red spark
  burst. Bullet destruction/cleanup particles (non-hit) are unchanged.
- Verification: `npm test` => 180 PASS, 0 FAIL, 0 WARN.

## 2026-08-20 — Boss Story / W10 Visual
- W10 boss visual added as a gravitational/dark-core design with orbital rings and star fragments.
- Boss names updated for W10/W15/W20 story progression.
- W20 name added to `CONFIG.bossNames`.
