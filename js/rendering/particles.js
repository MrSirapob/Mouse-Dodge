const BASE_REDS = ['#ff2e2e', '#e11d1d', '#c1121f', '#8b0000', '#ff5c5c'];

/**
 * Per-`deathEffect` particle recipes (see js/data/skins.js `deathEffect`
 * field / skinSystem.buildVisual()). Each recipe describes how a hit/death
 * burst should differ from the plain blood-red default so every skin's
 * `deathEffect` value actually changes what gets drawn:
 *  - `default`/`burst`: the original blood look (unchanged, since most
 *    skins — all Common/Uncommon — use `burst`).
 *  - `ring`: particles launched evenly around a circle instead of a random
 *    scatter, so the burst reads as an expanding ring rather than a splat.
 *  - `glitch`: red/accent/white flicker (color re-picked every frame) plus a
 *    small per-frame position jitter and square (not round) droplets.
 *  - `prism`: full rainbow palette instead of reds.
 *  - `nova`: bigger, faster, larger-radius burst with a warm red/gold blend.
 *  - `singularity`: particles fly out then get pulled back toward the
 *    origin, like being sucked into a black hole, tinted void purple.
 */
const DEATH_EFFECTS = {
  default: { colors: BASE_REDS },
  burst: { colors: BASE_REDS },
  ring: { colors: BASE_REDS, ringLaunch: true },
  glitch: { colors: BASE_REDS, flicker: ['#ff2e2e', '#f15cff', '#63f3ff', '#ffffff'], jitter: 2.4, square: true, fadeRate: 1.6 },
  prism: { colors: ['#ff2e2e', '#ff9f43', '#ffd166', '#69f0ae', '#38d9ff', '#9b7bff', '#ff8fbd'] },
  nova: { colors: ['#ff5c5c', '#ff9f43', '#ffd166', '#e11d1d'], speedMult: 1.6, countMult: 1.5, sizeMult: 1.3 },
  singularity: { colors: ['#d8c7ff', '#7c4dff', '#8b0000'], pull: 18, speedMult: 1.4 },
};

export class ParticleSystem {
  constructor() {
    this.items = [];
  }
  clear() {
    this.items.length = 0;
  }
  /** Spawns `count` particles at (x, y) with a random outward velocity. */
  spawn(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * 3.5;
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        color,
        r: 2 + Math.random(),
      });
    }
  }
  /**
   * Spawns a blood-style burst: darker/varied reds, heavier + more varied
   * droplet sizes, and gravity so the droplets arc downward instead of
   * drifting outward evenly like a generic spark burst.
   *
   * `deathEffect` is the skin's `deathEffect` id (see js/data/skins.js /
   * skinSystem.buildVisual()) — it picks one of the DEATH_EFFECTS recipes
   * above so equipped skins actually look different when a player is hit,
   * instead of every skin producing the same plain red splat.
   */
  spawnBlood(x, y, count = 10, deathEffect = 'default') {
    const recipe = DEATH_EFFECTS[deathEffect] || DEATH_EFFECTS.default;
    const total = Math.round(count * (recipe.countMult || 1));
    for (let i = 0; i < total; i++) {
      const a = recipe.ringLaunch
        ? (i / total) * Math.PI * 2
        : Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 4) * (recipe.speedMult || 1);
      const palette = recipe.colors || BASE_REDS;
      this.items.push({
        x,
        y,
        originX: x,
        originY: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1, // slight upward pop before gravity pulls down
        life: 1,
        color: palette[(Math.random() * palette.length) | 0],
        flickerColors: recipe.flicker || null,
        square: !!recipe.square,
        jitter: recipe.jitter || 0,
        pull: recipe.pull || 0,
        r: (1.5 + Math.random() * 3) * (recipe.sizeMult || 1),
        gravity: recipe.pull ? 0 : 7 + Math.random() * 5,
        fadeRate: recipe.fadeRate || 1.1,
      });
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.pull) {
        // Singularity-style pull back toward the point of origin.
        const dx = p.originX - p.x;
        const dy = p.originY - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        p.vx += (dx / dist) * p.pull * dt;
        p.vy += (dy / dist) * p.pull * dt;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.jitter) {
        p.x += (Math.random() - 0.5) * p.jitter;
        p.y += (Math.random() - 0.5) * p.jitter;
      }
      p.life -= dt * (p.fadeRate ?? 1.5);
      if (p.life <= 0) this.items.splice(i, 1);
    }
  }
}
