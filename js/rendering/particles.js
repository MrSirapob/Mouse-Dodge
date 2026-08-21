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
   */
  spawnBlood(x, y, count = 10) {
    const reds = ['#ff2e2e', '#e11d1d', '#c1121f', '#8b0000', '#ff5c5c'];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.6 + Math.random() * 4;
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1, // slight upward pop before gravity pulls down
        life: 1,
        color: reds[(Math.random() * reds.length) | 0],
        r: 1.5 + Math.random() * 3,
        gravity: 7 + Math.random() * 5,
        fadeRate: 1.1,
      });
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      if (p.gravity) p.vy += p.gravity * dt;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * (p.fadeRate ?? 1.5);
      if (p.life <= 0) this.items.splice(i, 1);
    }
  }
}
