# Wave Gameplay v2 — V1.7-inspired

- 20 waves, bosses at 5/10/15/20.
- Normal durations: W1-4 20-30s (20/23/26/29s), W6-14 40s, W16-19 45s; boss 60s; 1s transition.
- Normal waves use timed layering/events inspired by V1.7 rather than a single static pattern.
- Difficulty rises through speed, density, event frequency, and overlap.
- Pattern identity is not required for normal waves.
- Bosses carry the distinctive gimmicks.
- Safe corridors remain intentionally narrow; avoid relying on BLINK.

## W11-15 — New Act Pattern Set (2026-08-22)

W11-15 now use a fresh gameplay vocabulary instead of reusing the W1-10 signatures.

- W11 — VOID: `voidWell`, `voidPulse` — attraction wells and inward/outward pressure.
- W12 — GRAVITY: `gravityFlip`, `gravityRain`, `gravityCross` — mid-flight rule changes and gravity wells.
- W13 — SHADOW: `shadowEcho`, `shadowTrail`, `shadowCross` — attacks originate from recent player movement positions.
- W14 — COLLAPSE: `closingLanes`, `movingSafeGap`, `collapseCross` — structural edge pressure and shrinking safe routes.
- W15 — RITUAL BOSS: `ritualRing`, `ritualSeal` — rotating safe gaps and sequential seal volleys; intentionally avoids W5/W10 signatures.

The new bullet trajectory types `gravityWell` and `gravityFlip` are implemented in the core bullet update path. W13 shadow patterns fall back to the current player position when no movement trail exists, so the pattern remains functional in deterministic/no-input tests.
