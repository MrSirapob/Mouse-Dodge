# Wave Dodge — Browser Bullet-Hell Survival

Wave Survival prototype: dodge bullet patterns across escalating waves,
survive as long as possible, and rack up score/graze/combo.

For version history and past refactor notes, see [CHANGELOG.md](./CHANGELOG.md).

## Current features
- Wave Survival with the original bullet pattern library and Boss Waves
- 3 lives per player with damage invulnerability and Co-op revive
- Solo and local 2-player Co-op
- Responsive Canvas world with desktop + touch input
- Skill selection via dropdown
- 9 selectable skills:
  - Pulse
  - Shield
  - Slow
  - Nova
  - Time Stop
  - Heal
  - Repulse
  - Phase
- Graze remains as a score/combo mechanic; grazing no longer triggers slowdown
- Every successful graze reduces the active skill's cooldown (more at higher
  combo tiers, capped at 60% of the skill's original cooldown per activation —
  see `GRAZE_REWARD` in `js/core/config.js`)
- Replay button has dedicated styling and animation
- Canvas hides the system mouse cursor during gameplay; menus retain the
  normal cursor

## Controls
- P1: mouse/touch to move, left click/tap to use the selected skill
- P2: WASD / Arrow Keys to move, Left Shift to use the selected skill
- Space: pause

## Running locally
Plain ES modules — `file://` won't work because of CORS on module imports.

```
npm install
npm run dev   # serves on :8080
```

No bundler/build step. The game ships as-is.

## Structure

```
index.html      shell and menu
css/main.css    layout, HUD, responsive UI, menu styling
js/core/        game state, input, config, collision
js/entities/    players, bullets, boss
js/systems/     game orchestrator, wave, life, skills, dev mode
js/patterns/    bullet pattern library
js/rendering/   canvas renderer and particles
js/ui/          menu/HUD/game-over UI
```

`js/core/config.js` is the single source of truth for tunable numbers
(cooldowns, radii, bullet caps, wave durations, etc.) via the `CONFIG` and
`GRAZE_REWARD` objects. Prefer adding new numbers there over hardcoding them
in gameplay logic.

### How to extend common things

- **New wave-tier mechanic**: add another `if (n >= N) { ... }` block in
  `js/systems/waveSystem.js`'s `build()` — each block queues patterns via
  `this.p.<pattern>(...)` and appends a Thai label.
- **New bullet pattern**: add a method to `js/patterns/patterns.js`
  (`PatternLibrary`), following the existing multi-line + doc-comment style.
- **New skill**: add its config to `CONFIG.skills` in `config.js`, its
  behavior in `js/systems/skillSystem.js`, its HUD name/description/icon in
  the `SKILL_*` maps at the top of `js/ui/ui.js`, and its visual effect in
  the `SKILL_EFFECT_DRAWERS` lookup table in `js/rendering/renderer.js`.
- **New per-frame game step**: `Game.update()` in `js/systems/game.js` is
  split into small, ordered `updateX()` methods (`updateTimers`,
  `updatePlayers`, `updateBoss`, `updateZoneHazard`, `updateLasers`,
  `updateBullets`, ...) — read them top-to-bottom to follow one frame, and
  add new steps in the same style.
- **New HUD readout**: add the element lookup to `UI.cacheElements()`, then
  set it from `update()` or a dedicated setter (following the existing
  `setWave` / `setBossVisible` pattern) — DOM elements are cached once, not
  re-queried every frame.
- **Dev Mode tooling**: `js/systems/devMode.js`, toggled with F2 during
  gameplay.
