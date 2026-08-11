export const GRAZE_REWARD = Object.freeze({
  // Cooldown recovered from each successful graze.
  base: 0.15,
  combo5: 0.18,
  combo10: 0.21,
  combo20: 0.24,

  // Never let graze recovery refill more than this fraction
  // of the skill's original cooldown in a single activation cycle.
  maxReduction: 0.60,

  // Existing graze combo window.
  comboWindow: 1.0
});

export const CONFIG = {
  world: { width: 1280, height: 720 },
  player: { radius: 10, followLerp: 0.28, color: '#4ecdc4', p2Color: '#ffd166' },
  lives: { max: 3, hitInvulnerability: 1.0, respawnInvulnerability: 1.0 },
  dash: { cooldown: 2.2, invulnerability: 0.18, distance: 130 },
  skills: {
    pulse: { cooldown: 5, radius: 115 },
    shield: { cooldown: 7, duration: 2.2 },
    slow: { cooldown: 8, duration: 2.5, scale: 0.28 },
    nova: { cooldown: 8, radius: 185, invulnerability: 0.35 },
    timestop: { cooldown: 10, duration: 2.0 },
    heal: { cooldown: 12 },
    repulse: { cooldown: 8, radius: 190, force: 14.0, minPush: 8.0 },
    phase: { cooldown: 9, duration: 2.0 }
  },
  revive: { duration: 2.0, radius: 46 },
  wave: { baseDuration: 18, minDuration: 12, bossBase: 22, bossMax: 32 },
  bullets: {
    capEarly: 180,
    capMid: 260,
    capHigh: 340,
    capLate: 420,
    capEndless: 500,
    capBossBonus: 60
  },
  combo: { window: 1.1 },
  storage: { bestTime: 'waveDodgeBestTime', bestWave: 'waveDodgeBestWave', bestScore: 'waveDodgeBestScore' }
};
