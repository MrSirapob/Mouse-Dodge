import { CONFIG } from '../core/config.js';

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
    this.shieldTimer = 0;
    this.down = false;
    this.reviveProgress = 0;
    this.score = 0;
    this.grazeCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.trail = [];
  }
  updateMouse(targetX, targetY, dt) {
    const k = 1 - Math.pow(1 - CONFIG.player.followLerp, dt * 60);
    this.x += (targetX - this.x) * k;
    this.y += (targetY - this.y) * k;
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
  clamp(world) {
    this.x = Math.max(this.r, Math.min(world.width - this.r, this.x));
    this.y = Math.max(this.r, Math.min(world.height - this.r, this.y));
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
