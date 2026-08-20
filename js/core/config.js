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
  lives: { max: 3, hitInvulnerability: 3.0, respawnInvulnerability: 1.0 },
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
    weights: { heart: 35, energy: 25, shield: 15, score: 25 },
    heartWeightBoost: 40,
    scoreValue: 400,
    shieldDuration: 3.0,
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
    10: "ผู้ที่กลืนกินจักรวาลจนหมดสิ้น",
    15: "วงกลมสุดท้ายก่อนความว่างเปล่า",
  },
};
