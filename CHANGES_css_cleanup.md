# CSS cleanup + bug fixes — 2026-08-15

## What changed in `css/main.css`

The file had accumulated years of "patch on top of patch": HUD/score rules had
been redesigned at least 4 separate times, each round adding a new override
block with `!important` instead of editing the old one. Result: the same
selector (e.g. `#hud`, `.hud-zone`, `.hud-center`) was declared dozens of times
across the file, fighting itself with specificity/`!important` wars.

**What I did, mechanically:**
1. Parsed the whole stylesheet with a proper CSS AST (postcss), and for every
   selector, computed the *true final winning value* of every property exactly
   the way a browser's cascade would (source order + specificity + `!important`
   tier), per breakpoint (`@media` context).
2. Rebuilt the file with exactly **one rule per selector per breakpoint**,
   containing only the properties that actually take effect.
3. Verified this programmatically: recomputed the "effective style" for all
   754 original selector/context pairs from both the old and new file and
   diffed them property-by-property. **Zero mismatches** — the new file
   renders identically to the old one for anything still in use.
4. Removed CSS that doesn't match anything in the current HTML/JS at all
   (43 classes, 3 ids) — leftovers from earlier menu/HUD designs
   (`.hero-menu`, `.hud-center`, `.wave-core`, `.skill-select-wrap`,
   the entire old `#devPanel` skin using `.dev-collapse`/`.dev-group`, etc.).
   Verified "unused" by grepping all of `js/` and both HTML files, including
   for dynamic `template-literal` construction, not just static text.

**Results:**
- **2,884 → 762 lines**
- **526 → 302 `!important` uses** (~43%). The remainder are mostly legitimate:
  this codebase intentionally uses `!important` to make *narrower* breakpoints
  (e.g. `max-width:380px`) win over *wider* ones (e.g. `max-width:700px`) that
  can be simultaneously active, since plain source order alone wouldn't
  guarantee that. Fully removing these would need a real specificity/order
  redesign of the responsive HUD rules, which needs visual QA in a browser —
  flagging as a possible follow-up rather than guessing blind.
- No visual/behavioral change for anything currently used by the game.

## Bugs fixed

1. **`#devPanel` had two competing sources of truth.** `index-test.html` had
   static HTML for the dev panel (old button layout: `NEXT WAVE`, `PAUSE`,
   using classes like `.dev-collapse`/`.dev-group`) that doesn't match what
   `js/systems/devMode.js` actually builds. `DevMode.renderPanel()` overwrites
   that markup via `innerHTML` on every load, so the static HTML was always
   dead — but anyone (human or AI) editing it would have their changes
   silently discarded. Fixed: `index-test.html` now has an empty `<section
   id="devPanel">` with a comment pointing to `renderPanel()` as the real
   source of truth.

2. **Dev Mode fails silently if `#devPanel` is ever missing.**
   `DevMode`'s constructor returned early with no warning if
   `document.getElementById('devPanel')` came back null — meaning F2 and all
   dev tools would just do nothing, forever, with zero indication why. Added
   a `console.warn` so this is diagnosable instead of a silent mystery.

3. **Missing `.rank-c` color rule.** `getScoreRank()` can return `"C"`
   (score 35,000–44,999) but the CSS only styled `.rank-s/.rank-a/.rank-b/
   .rank-d` letter colors — a `C` result rendered with no themed color. Added
   `.rank-c .rank-letter { color: #a7ac86 }` (between B's accent and D's grey).

## Conventions going forward (see also the header comment in `main.css`)

- One rule per selector per breakpoint. If you need to change `#hud`, search
  for it — there should be exactly one matching block per breakpoint. Don't
  add a new override block "on top"; edit the existing one.
- Avoid `!important` for new rules. It should only appear to beat an inline
  style or a deliberately higher-priority rule — never just to "win" against
  another CSS rule you could otherwise fix by editing that rule directly.
- `#devPanel`'s content lives in `devMode.js`, not in HTML.
