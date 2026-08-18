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
