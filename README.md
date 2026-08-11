# Wave Dodge — Refactored V3 (Maintainability Pass)

Refactored Wave Survival prototype based on the supplied reference game.

## Project hygiene pass (this update)
This pass didn't touch gameplay code — it cleaned up things that make the
project harder to pick back up as it grows:

- **Removed `js/systems/autoPlayer.js` (dead code).** It was never imported
  by `game.js`, `main.js`, or `ui.js`, and `devMode.js` never calls it despite
  the file checking `game.devMode.enabled`. It looks like a half-wired
  "AI plays for you" dev tool that got left behind. If you want that feature,
  it's easy to rebuild properly wired into `DevMode` — the old file is still
  in git history if you want the logic back.
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
edit. This pass keeps 100% of the original gameplay behavior/numbers, but:

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

## Current features
- Wave Survival with the original bullet pattern library and Boss Waves
- 3 lives per player with damage invulnerability and Co-op revive
- Solo and local 2-player Co-op
- Responsive Canvas world with desktop + touch input
- Skill selection via dropdown
- 9 selectable skills:
  - Pulse
  - Dash
  - Shield
  - Slow
  - Teleport
  - Time Stop
  - Heal
  - Repulse
  - Phase
- Graze remains as a score/combo mechanic, but grazing no longer triggers slowdown
- Replay button has dedicated styling and animation
- Canvas hides the system mouse cursor during gameplay; menus retain the normal cursor

## Controls
- P1: mouse/touch to move, left click/tap to use the selected skill
- P2: WASD / Arrow Keys to move, Left Shift to use the selected skill
- Space: pause

## Structure
- `index.html` — shell and menu
- `css/main.css` — layout, HUD, responsive UI, menu styling
- `js/core/` — game state, input, config, collision
- `js/entities/` — players, bullets, boss
- `js/systems/` — game, wave, life, skills
- `js/patterns/` — bullet pattern library
- `js/rendering/` — canvas renderer and particles
- `js/ui/` — menu/HUD/game-over UI


## HUD UI update
- Clear digital timer in MM:SS.t format.
- Skill HUD shows selected skill, READY/COOLDOWN state, remaining cooldown, and progress bar.
- Co-op shows a separate P2 skill cooldown card.


## V6 fixes
- Arena viewport uses cover scaling to remove letterbox bars and visually fill the screen.
- Wave 4 spiral density reduced: fewer arms/emission steps and shorter spiral phases.


## V7
- Replaced Teleport skill with NOVA.
- Added Developer Mode: press F2 during gameplay.
- Dev controls: +/− life, next wave, skill ready, clear bullets, boss, god mode, pause, restart.


## V8 bullet balance test
- Added an active-bullet cap so bullets cannot fill the entire arena.
- Caps: 95 (W1-5), 125 (W6-10), 160 (W11-15), 195 (W16-20), 220 (W21+), with +30 on Boss Waves.
- Dev Mode shows the current bullet count/cap for easy testing.


## V9 intense bullet balance
- Increased the active-bullet caps for a more intense Bullet Hell feel.
- Caps: 180 (W1-5), 260 (W6-10), 340 (W11-15), 420 (W16-20), 500 (W21+), +60 on Boss Waves.


## V11 fairness assist
- Normal spiral bursts wait while the shrinking arena zone is active, then resume after the zone disappears.
- From Wave 4 onward, or when the arena is crowded, a subtle near-miss assist can gently steer a bullet that is predicted to hit.
- Assistance is limited to small steering changes and is applied once per bullet, so it should feel like a close dodge rather than an obvious cheat.


## V12 player-friendly patterns
- Ring patterns leave a small opening aimed toward the nearest active player; telegraph shows the opening.
- Wall patterns choose the gap near the player's current route instead of placing it randomly.
- From Wave 4+, if the local danger field is crowded, aimed/homing/splitter spawns briefly wait for space to open.
- Existing 3-second post-hit invulnerability remains unchanged.


## V13 hit feedback
- Player hit no longer triggers camera shake.
- Hit feedback uses red impact particles + a short expanding hit ring.
- Player blinks while invulnerable after being hit.


## V14 hit no-recoil
- Removed hit repositioning, screen flash, and hit ring effect.
- On hit, player stays exactly at the collision position, loses one life, and blinks during the existing invulnerability window.
- Red hit particles remain as the only impact effect.


## V15 UI and hit feedback
- Hit feedback is a fixed-position red impact ring/spokes around the player; player position and scale do not move.
- Wave banner remains visible for 1.8 seconds with a readable panel background.
- Main menu received a cleaner card layout, mode cards, skill section, rule cards, and improved start button.


## V16 classic damage feedback
- Restored the original short damage shake (`shakeMag = 12`) when hit.
- Kept the player at the collision position; no spawn repositioning and no dash behavior are restored.
- Removed the newer fixed hit ring so the shake + particles communicate damage like the original.


## V17 damage effect
- Restored a clear damage visual on the player: brief red flash, white impact ring, red radial hit marks, and red glow.
- Damage shake remains (`shakeMag = 12`).
- No dash/reposition behavior is used.


## V18 subtle damage feedback
- Damage shake remains the main feedback.
- Removed the large red body flash/radial marks.
- Added only a thin, short red rim around the player for a clear but restrained hit indicator.
- Hit indicator lasts 0.30 seconds and fades quickly.


## V19 damage feedback fix
- Fixed the missing camera shake: `shakeMag` is now applied to the rendered arena and decays rapidly after a hit.
- Damage uses a short, punchy shake plus a thin red outline; the player body stays its normal color.


## V20 damage shake fix
- Added a dedicated 0.22-second damage-shake timer that triggers whenever one heart is lost.
- Damage shake is rendered independently from game-over shake, so losing one heart now visibly shakes the arena.
- Shake uses a short directional impact motion instead of random jitter.


## Graze Cooldown Recovery
- Every successful graze reduces the active skill cooldown.
- Base recovery: 0.15s per graze.
- At 5+ combo: 0.18s.
- At 10+ combo: 0.21s.
- At 20+ combo: 0.24s.
- Recovery is capped at 60% of the skill's original cooldown per activation.
- The existing 1-second combo window remains, so the player must keep taking calculated risks.
