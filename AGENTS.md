# AGENTS.md — AI onboarding for Wave Dodge

Read this before making changes. It's the fast path to being useful in this
repo without re-deriving context that's scattered across `README.md`,
`CHANGELOG.md`, and `WAVE_DESIGN_NOTES.md`. Those three still exist for their
own purposes (user-facing docs, history, design rationale) — this file is
the map that ties them together for whoever (human or AI) is about to edit
code.

This is the **one canonical AI-context file** for the project — kept here
under the `AGENTS.md` name because that's the convention most agent tools
(Codex CLI, and others) look for automatically. This repo also gets worked
on from Claude Code, which looks for `CLAUDE.md` specifically — that file is
a one-line pointer back to this one, so there's a single doc to keep
up to date no matter which tool made the last change. If you're an AI
editing this project: update *this* file when something here goes stale,
not a duplicate in `CLAUDE.md`.

## First thing to do, every session

Read **[HANDOFF_LOG.md](./HANDOFF_LOG.md)** before touching anything —
it's a short, newest-first log of what the last AI session (Claude,
ChatGPT, or otherwise) did and what it flagged for next time. **Last thing
to do, every session: add a new entry there**, even for a small change or
an unfinished task — that's how the next AI (possibly a different tool)
knows where things stand instead of re-discovering it from scratch.

## What this project is

A single-page browser bullet-hell survival game. Plain ES modules, no
bundler, no framework, no build step. `npm install && npm run dev` serves it
on `:8080`. See `README.md` for controls and the full feature list.

## Read these next, in this order

1. `README.md` → `## Structure` and `## How to extend common things` —
   the per-folder responsibility map and the standard recipes for the most
   common changes (new wave tier, new bullet pattern, new skill, new HUD
   readout, new per-frame step). Don't duplicate that content here; read it
   there.
2. `js/core/config.js` — the single source of truth for every tunable
   number. If you're about to hardcode a magic number in gameplay logic,
   it almost certainly belongs here instead, next to a comment explaining
   what it controls.
3. `CHANGELOG.md` — not just history. Several entries explain *why* the
   code is shaped the way it is (e.g. why `W1-4` and `W5+` have separate
   bullet-cap/cleanup constants, why player movement always uses `rawDt`
   instead of the slow-mo-scaled `dt`). If a piece of logic looks
   oddly special-cased, check here before "simplifying" it.
4. `WAVE_DESIGN_NOTES.md` — gameplay/difficulty-curve intent for wave
   pacing, if you're touching `js/systems/waveSystem.js` balance.

## Architecture in one paragraph

`js/main.js` wires up four top-level objects — `Renderer`, `InputManager`,
`UI`, `Game` — and starts the resize/orientation listeners. `Game`
(`js/systems/game.js`) is the orchestrator: it owns all entities and
sub-systems and runs `update(dt)` → `draw()` every animation frame.
`update()` is deliberately split into small, ordered `updateX()` methods
(`updateTimers`, `updatePlayers`, `updateBoss`, `updateZoneHazard`,
`updateLasers`, `updateBullets`, ...) — read them top-to-bottom to follow
one frame. Gameplay rules without an obvious home elsewhere (bullet
movement/collision, lasers, scoring) live directly on `Game`; everything
else is delegated to a system (`WaveSystem`, `SkillSystem`, `LifeSystem`,
`ItemSystem`, `DevMode`) or an entity (`Player`, `BulletManager`, `Boss`).

## Conventions that aren't obvious from one file

- **Cache-busting query strings.** Every internal import — in `index.html`
  and every `js/**/*.js` file — carries a `?v=<tag>` suffix
  (e.g. `./core/config.js?v=20260814w10final`), and **all of them must be
  identical**. This is a hand-rolled cache-buster (there's no build step to
  do it automatically) for the GitHub Pages deploy (see `CNAME`). If you
  add a new file or a new import, give it the same `?v=` tag as everything
  else; if you're about to ship a change, bump every occurrence together.
  Don't do this by hand with find/replace — use the scripts below, which
  exist specifically so this can't drift out of sync:
  - `npm run check-versions` — verifies every `?v=` tag in the project
    matches and that every local import has one. Safe to run any time,
    including as a pre-commit sanity check.
  - `npm run bump-version -- <tag>` — rewrites every `?v=` tag to `<tag>`
    in one pass (or omit `<tag>` to auto-generate a dated one). Run this
    after any change that should invalidate the browser cache.
- **`CONFIG` is the tuning surface.** Gameplay constants (cooldowns, radii,
  bullet caps, wave durations, spawn weights, rank thresholds, ...) live in
  `CONFIG` / `GRAZE_REWARD` in `js/core/config.js`, each with a comment
  explaining what it does and, where the value is non-obvious, why it's
  set the way it is. Prefer extending that object over adding a new
  hardcoded literal in a system file.
- **DOM lookups are cached, not repeated per frame.** `js/ui/ui.js` looks
  up every element once in `cacheElements()`; per-frame updates go through
  small setters (`setWave`, `setBossVisible`, ...) rather than calling
  `document.getElementById` in the render loop. Follow that pattern for
  any new HUD element.
- **Skill visuals use a lookup table, not a branch chain.** New skill
  effects go in the `SKILL_EFFECT_DRAWERS` table in
  `js/rendering/renderer.js` (one function per skill) — see
  `README.md`'s "New skill" recipe for the full checklist (config entry,
  `skillSystem.js` behavior, `ui.js` HUD text, renderer visual).
- **Thai strings live inline.** Wave-tier banners and most player-facing UI
  text are Thai literals directly in the source (`waveSystem.js`,
  `index.html`, `ui.js`) — there's no i18n layer. Match the existing tone
  and keep new strings colocated with the code that uses them, the way the
  rest of the project already does.
- **LF line endings only.** Enforced by `.editorconfig` / `.gitattributes`
  (`eol=lf`) after a past CRLF/LF mix caused noisy diffs — see CHANGELOG
  "Project hygiene pass". Don't reintroduce CRLF.
- **No test framework.** There's no Jest/Vitest/etc. The one existing test,
  `scripts/verify-bullethell-fix.mjs`, is a plain Node script that imports
  the *real* game modules (not a reimplementation) and asserts against
  their actual behavior — see its header comment for the pattern (`node
  scripts/verify-bullethell-fix.mjs`). If you fix a subtle bug and want a
  regression check, a small standalone script in `scripts/` in that same
  style is the established way to do it; it's fine to delete it once
  you're confident the fix is trusted, the way that file's own header
  invites.

## Before you finish a change

- **Add an entry to [HANDOFF_LOG.md](./HANDOFF_LOG.md)** — this is the one
  step that's easy to skip and breaks the handoff for the next session.
  Do it even if the task isn't fully finished.
- If you touched any `import`/`<script src>` line or added a new module:
  run `npm run check-versions`, then `npm run bump-version` if the change
  should invalidate caches.
- If you touched a number that affects difficulty/balance: check whether
  it already exists in `CONFIG` first, and update `WAVE_DESIGN_NOTES.md`
  if the intent behind wave pacing changed.
- If the change is nontrivial, add a short entry to `CHANGELOG.md`
  following the existing style (what broke or was unclear, what changed,
  why) — future sessions (AI or human) lean on that file heavily.
