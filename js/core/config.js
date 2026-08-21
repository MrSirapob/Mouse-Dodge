export const GRAZE_REWARD = Object.freeze({
  // Cooldown recovered from each successful graze.
  base: 0.15,
  combo5: 0.18,
  combo10: 0.21,
  combo20: 0.24,

  // Never let graze recovery refill more than this fraction
  // of the skill's original cooldown in a single activation cycle.
  maxReduction: 0.6,

  // Existing graze combo window.
  comboWindow: 1.0,
});

export const CONFIG = {
  world: { width: 1280, height: 720 },
  player: {
    radius: 10,
    followLerp: 0.28,
    color: "#4ecdc4",
    p2Color: "#ffd166",
  },
  lives: { max: 3, hitInvulnerability: 1.0, respawnInvulnerability: 1.0 },
  skills: {
    // Buff pass (2026-08-20): cooldowns lowered and radii/durations raised
    // across all 8 skills so they're useful against W1-4 Bullet Hell density
    // and remain relevant through W7-10+. W1 already fires 50+ bullets in the
    // first 2s, so skills need to feel impactful from the opening seconds.
    pulse: { cooldown: 4, radius: 140 },
    shield: { cooldown: 6, duration: 3.0 },
    slow: { cooldown: 7, duration: 2.5, scale: 0.28 },
    nova: { cooldown: 7, radius: 210, invulnerability: 0.55 },
    timestop: { cooldown: 8, duration: 2.8 },
    heal: { cooldown: 10 },
    repulse: { cooldown: 7, radius: 190, force: 14.0, minPush: 8.0 },
    phase: { cooldown: 7, duration: 2.5 },
  },
  revive: { duration: 2.0, radius: 46 },
  wave: {
    baseDuration: 30,
    minDuration: 30,
    bossBase: 60,
    bossMax: 60,
    transition: 1,
    bannerDisplayMs: 3000,
  },
  bullets: {
    // W1-4 ("Bullet Hell" tier) only. Raised from 260 -> 420 so the W1-4
    // patterns (retuned to fire far more projectiles than the old cap could
    // ever hold on screen at once) can actually reach their designed
    // density instead of being silently truncated by spawnBullet().
    // Verified via an offline simulation of the real W1-4 schedules
    // (js/patterns + js/systems/waveSystem) that 420 lets every queued
    // spawn actually land with zero drops, while 350/380/400 still dropped
    // a handful of bullets during W3's spiral+ring overlap.
    // Does NOT apply to W5 — see capW5 below and bulletCap() in game.js.
    capEarly: 420,
    // W5 (boss wave) only. This is W5's original cap from before the
    // Bullet Hell update raised capEarly 260 -> 420 (W5 used to share
    // capEarly with W1-4; it now has its own value so raising W1-4's
    // density never changes W5/boss balance or performance).
    capW5: 260,
    capMid: 340,
    capHigh: 420,
    capLate: 500,
    capEndless: 560,
    capBossBonus: 80,

    // Keep the arena dense, but prevent it from slowly becoming unwinnable.
    // Cleanup starts only when the arena is nearly full and removes a few
    // low-risk old bullets instead of randomly deleting threats.
    // These are the DEFAULT values, used by every wave except the W1-4
    // Bullet Hell tier below.
    cleanupStart: 0.95,
    cleanupPerFrame: 4,
    cleanupCooldown: 0.12,

    // W1-4 only (see Game.cleanupConfig()). Bullet Hell now runs much closer
    // to the raised capEarly ceiling than other waves ever did, so cleanup
    // needs to (a) hold off longer before touching anything, preserving the
    // designed overlap/pattern shape as long as possible, and (b) clear
    // more headroom per pass once it does kick in, so a single dense burst
    // (e.g. a 90-bullet ring on top of an active spiral) can't get throttled
    // by the hard cap before cleanup has room to work. This does NOT apply
    // to W5 (boss) or any later wave — those keep the defaults above
    // untouched.
    bulletHell: {
      cleanupStart: 0.97,
      cleanupPerFrame: 6,
      cleanupCooldown: 0.08,
    },
  },
  combo: { window: 1.1 },
  // "No Hit" wave-clear bonus: awarded per-player (coop counts each player
  // independently) when that player takes zero damage during a wave.
  // Scales up on later waves: bonus(n) = base + perWaveAfterFirst * (n - 1).
  noHit: {
    base: 500,
    perWaveAfterFirst: 40,
    // How long the big "NO HIT" banner stays on screen before the next
    // wave's #waveBanner is allowed to appear (see beginWaveTransition in
    // game.js — it adds this on top of the normal wave.transition gap so
    // the two banners show one after another, never overlapping).
    displayMs: 1600,
  },
  rank: {
    // Score thresholds for the end-of-run rank.
    thresholds: [
      { rank: "SSS", min: 150000 },
      { rank: "SS", min: 110000 },
      { rank: "S", min: 80000 },
      { rank: "A", min: 60000 },
      { rank: "B", min: 45000 },
      { rank: "C", min: 15000 },
      { rank: "D", min: 0 },
    ],
  },
  items: {
    // Seconds between spawn attempts (randomized between min/max).
    spawnMin: 9,
    spawnMax: 15,
    // Max pickups allowed on the field at once.
    maxActive: 3,
    radius: 15,
    // How long an uncollected pickup stays before disappearing.
    ttl: 12,
    // Extra forgiveness added to (player.r + item.r) when checking pickup range.
    pickupPadding: 6,
    // Relative spawn weights. `heart` gets `heartWeightBoost` added on top
    // whenever any active player is missing a life, making heals more
    // likely to appear when they're actually needed.
    // Tuned 2026-08-21 (user-requested, felt too frequent): with the
    // avg ~12s roll between item-spawn attempts, heart:35/boost:40 meant
    // hearts landed every ~34s at full life and ~22s once anyone was hurt
    // (which is most of a bullet-hell run). heart:20/boost:25 -> ~51s at
    // full life, ~29s once hurt — still noticeably faster when actually
    // needed, just not constant. See CHANGELOG.md for the full math.
    weights: { heart: 20, energy: 25, shield: 15, score: 25 },
    heartWeightBoost: 25,
    scoreValue: 400,
    // Shield *item* pickup (2026-08-21, user-requested rework — old
    // time-based version felt like temporary immortality, not a shield):
    // grants `shieldHits` charge(s), capped at `shieldMaxCharges`. Each
    // charge blocks exactly one incoming hit (bullet/laser) — consumed in
    // LifeSystem.hit() — then is gone, rather than a multi-second window
    // where every bullet simply passes through untouched. Separate from
    // the Shield *skill* (CONFIG.skills.shield), which is still an
    // intentional timed full-invuln burst and is unaffected by this.
    shieldHits: 1,
    shieldMaxCharges: 1,
  },
  storage: {
    bestTime: "waveDodgeBestTime",
    bestWave: "waveDodgeBestWave",
    bestScore: "waveDodgeBestScore",
    bestGraze: "waveDodgeBestGraze",
  },

  // Boss name shown in the small label above the boss HP bar (top of
  // screen) while a boss wave is active. Edit these strings any time —
  // no other code changes needed, and no restart/build step required
  // beyond a page refresh.
  // Key = wave number the boss appears on (5, 10, 15, ...). `default` is
  // used for any boss wave that doesn't have its own entry here (e.g.
  // W20+, or any future boss wave you add without naming it yet).
  bossNames: {
    default: "สิ่งมีชีวิตที่ไร้เหลี่ยมมุม",
    5: "ผู้ตื่นจากผนึก",
    10: "ผู้กลืนกินดวงดารา",
    15: "ผู้เฝ้ารอ ณ จุดจบ",
    20: "ผู้ที่อยู่เบื้องหลังเจ้า",
  },

  // Narrative "act" theming (user-requested, 2026-08-20). The story was
  // already implicit in bossNames above and the chapter subtitles returned
  // by WaveSystem.buildBoss(): a seal awakens (W5) -> heaven/stars are
  // devoured (W10) -> the world is ritually unmade (W15) -> only the
  // formless void remains (W20+). actThemes gives each chapter its own
  // background + bullet-color palette so the shift reads visually the
  // instant a boss wave's banner appears, not just in the text.
  // Index = act number from actForWave(n) below (0-4). `bg` recolors the
  // canvas background (Renderer.begin()/drawGrid()); `colors` replaces
  // WaveSystem's WAVE_COLORS for that stretch of waves (same 5-color
  // cycle length, so the existing `color(n, offset)` indexing keeps working
  // unchanged); `accent` is a single bright color used for the boss-wave
  // chapter-transition flash/shake (Game.startWave()) — not part of the
  // bullet cycle, just a one-off "the world just changed" cue.
  actThemes: [
    { // Act 0 — W1-4: "โลกยามค่ำ" (the mortal world, still whole)
      label: "โลกยามค่ำ",
      bg: "#07070c",
      colors: ["#ff5c5c", "#ff9f43", "#c56cf0", "#ff5cc0", "#54a0ff"],
      accent: "#ff5c5c",
    },
    { // Act 1 — W5-9: "รอยร้าวแรกของผนึก" (the seal breaks)
      label: "รอยร้าวแรกของผนึก",
      bg: "#000000",
      colors: ["#7c3aed", "#c56cf0", "#ff5cc0", "#a29bfe", "#6c5ce7"],
      accent: "#a29bfe",
    },
    { // Act 2 — W10-14: "ท้องฟ้าที่ไร้ดวงดาว" (the stars are devoured)
      label: "ท้องฟ้าที่ไร้ดวงดาว",
      bg: "#03040a",
      colors: ["#54a0ff", "#00d2d3", "#74b9ff", "#a4b0be", "#dfe6e9"],
      accent: "#54a0ff",
    },
    { // Act 3 — W15-19: "พิธีกรรมแห่งการล้าง" (the world is ritually unmade)
      label: "พิธีกรรมแห่งการล้าง",
      bg: "#180505",
      colors: ["#ff4757", "#e17055", "#d63031", "#ff7675", "#2d3436"],
      accent: "#ff4757",
    },
    { // Act 4 — W20+: "ความว่างเปล่าไร้จุดจบ" (only the formless void remains)
      label: "ความว่างเปล่าไร้จุดจบ",
      bg: "#000000",
      colors: ["#f5f6fa", "#dfe6e9", "#b2bec3", "#ff6b81", "#ff0037"],
      accent: "#ff0037",
    },
  ],
};

/**
 * Maps a wave number to its narrative act index (0-4) — see
 * `CONFIG.actThemes` above. The boss wave itself (5/10/15/20) still plays
 * out in the PREVIOUS act's theme; the palette/background only shifts once
 * that boss is cleared and the next wave (6/11/16/21) begins, so the world
 * visually changes right after the boss falls rather than the moment it
 * appears. Capped at 4 so every endless wave past 20 stays in the final
 * "void" act.
 */
export function actForWave(n) {
  return Math.min(4, Math.floor((n - 1) / 5));
}
