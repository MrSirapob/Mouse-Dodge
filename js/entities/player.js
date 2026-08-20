import { CONFIG } from '../core/config.js?v=20260820-5vbq';

export class Player {
  constructor(id, color) {
    this.id = id;
    this.r = CONFIG.player.radius;
    this.color = color;
    this.trail = [];
    this.reset(640, 360);
  }
  reset(x, y) {
    this.x = x; this.y = y;
    this.lives = CONFIG.lives.max;
    this.invulnerable = 0;
    this.hitFlash = 0;
    this.skillCooldown = 0;
    this.skillBaseCooldown = 0;
    this.grazeCooldownReduced = 0;
    this.shieldTimer = 0;
    this.down = false;
    this.reviveProgress = 0;
    this.score = 0;
    // Cleared at the start of every wave (see Game.startWave); set true the
    // moment this player takes a hit, so wave-clear can check it for the
    // "No Hit" bonus. Independent per player — coop tracks each separately.
    this.tookHitThisWave = false;
    this.grazeCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.trail = [];
  }
  updateMouse(targetX, targetY, dt, direct = false, sensitivity = 1) {
    // Touch input is positioned above the finger, so do not add mouse-style
    // follow lag that would let the finger catch up and cover the player.
    if (direct) {
      this.x = targetX;
      this.y = targetY;
    } else {
      const response = Math.min(0.99, Math.max(0.01, CONFIG.player.followLerp * sensitivity));
      const k = 1 - Math.pow(1 - response, dt * 60);
      this.x += (targetX - this.x) * k;
      this.y += (targetY - this.y) * k;
    }
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 14) this.trail.shift();
  }
  updateKeyboard(dir, dt) {
    const len = Math.hypot(dir.x, dir.y) || 1;
    const speed = 360;
    this.x += dir.x / len * speed * dt;
    this.y += dir.y / len * speed * dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 14) this.trail.shift();
  }
  clamp(world, bounds = null) {
    const left = bounds ? Math.max(0, bounds.left) : 0;
    const right = bounds ? Math.min(world.width, bounds.right) : world.width;
    const top = bounds ? Math.max(0, bounds.top) : 0;
    const bottom = bounds ? Math.min(world.height, bounds.bottom) : world.height;

    this.x = Math.max(left + this.r, Math.min(right - this.r, this.x));
    this.y = Math.max(top + this.r, Math.min(bottom - this.r, this.y));
  }
  tick(rawDt) {
    this.invulnerable = Math.max(0, this.invulnerable - rawDt);
    this.hitFlash = Math.max(0, this.hitFlash - rawDt);
    this.skillCooldown = Math.max(0, this.skillCooldown - rawDt);
    this.shieldTimer = Math.max(0, this.shieldTimer - rawDt);
  }
  canBeHit() { return !this.down && this.invulnerable <= 0 && this.shieldTimer <= 0; }
  isAlive() { return !this.down && this.lives > 0; }
}
