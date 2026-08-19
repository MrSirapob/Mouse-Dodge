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
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 1.5;
      if (p.life <= 0) this.items.splice(i, 1);
    }
  }
}
