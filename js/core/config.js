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
    pulse: { cooldown: 5, radius: 115 },
    shield: { cooldown: 7, duration: 2.2 },
    slow: { cooldown: 8, duration: 2.5, scale: 0.28 },
    nova: { cooldown: 8, radius: 185, invulnerability: 0.35 },
    timestop: { cooldown: 10, duration: 2.0 },
    heal: { cooldown: 12 },
    repulse: { cooldown: 8, radius: 190, force: 14.0, minPush: 8.0 },
    phase: { cooldown: 9, duration: 2.0 },
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
    capEarly: 260,
    capMid: 340,
    capHigh: 420,
    capLate: 500,
    capEndless: 560,
    capBossBonus: 80,

    // Keep the arena dense, but prevent it from slowly becoming unwinnable.
    // Cleanup starts only when the arena is nearly full and removes a few
    // low-risk old bullets instead of randomly deleting threats.
    cleanupStart: 0.95,
    cleanupPerFrame: 4,
    cleanupCooldown: 0.12,
  },
  combo: { window: 1.1 },
  rank: {
    // Score thresholds for the end-of-run rank.
    thresholds: [
      { rank: "SSS", min: 100000 },
      { rank: "SS", min: 80000 },
      { rank: "S", min: 60000 },
      { rank: "A", min: 40000 },
      { rank: "B", min: 25000 },
      { rank: "C", min: 10000 },
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
    scoreValue: 220,
    shieldDuration: 3.0,
  },
  storage: {
    bestTime: "waveDodgeBestTime",
    bestWave: "waveDodgeBestWave",
    bestScore: "waveDodgeBestScore",
    bestGraze: "waveDodgeBestGraze",
  },
};
