import { CONFIG } from '../core/config.js?v=20260821-si7f';

export class Player {
  constructor(id, color) {
    this.id = id;
    this.baseR = CONFIG.player.radius;
    this.r = this.baseR;
    this.color = color;
    this.trail = [];
    this.reset(640, 360);
  }
  reset(x, y) {
    this.x = x; this.y = y;
    this.r = this.baseR;
    this.lives = CONFIG.lives.max;
    this.invulnerable = 0;
    this.hitFlash = 0;
    this.skillCooldown = 0;
    this.skillBaseCooldown = 0;
    // Tracks whether the skill read "ready" last frame, so UI.updateSkillDisplay()
    // can fire the ready pulse only on the cooldown->ready edge, not every
    // frame it happens to already be ready. Starts true since skillCooldown
    // starts at 0 (already ready) and that isn't a "just became ready" event.
    this._skillWasReady = true;
    this.grazeCooldownReduced = 0;
    this.shieldTimer = 0;
    // Charge-based shield from the Shield *item* pickup (distinct from the
    // Shield *skill*, which still uses shieldTimer/canBeHit() for a timed
    // full-invuln window). Each charge blocks exactly one incoming hit —
    // see LifeSystem.hit() — then is consumed, so it reads as "a shield"
    // rather than a few seconds of walking through bullets untouched.
    this.shieldCharges = 0;
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
    // Mystery Box bad-outcome timers (see ItemSystem.collect() case
    // 'mystery'): hitboxTimer temporarily grows `r` past `baseR`;
    // controlDebuffTimer/controlDebuffMult temporarily slows mouse/keyboard
    // response. Both are no-ops (1/0) outside an active Mystery Box effect.
    this.hitboxTimer = 0;
    this.controlDebuffTimer = 0;
    this.controlDebuffMult = 1;
  }
  updateMouse(targetX, targetY, dt, direct = false, sensitivity = 1) {
    // Touch input is positioned above the finger, so do not add mouse-style
    // follow lag that would let the finger catch up and cover the player.
    if (direct) {
      this.x = targetX;
      this.y = targetY;
    } else {
      const response = Math.min(0.99, Math.max(0.01, CONFIG.player.followLerp * sensitivity * this.controlDebuffMult));
      const k = 1 - Math.pow(1 - response, dt * 60);
      this.x += (targetX - this.x) * k;
      this.y += (targetY - this.y) * k;
    }
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 14) this.trail.shift();
  }
  updateKeyboard(dir, dt) {
    const len = Math.hypot(dir.x, dir.y) || 1;
    const speed = 360 * this.controlDebuffMult;
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
    if (this.hitboxTimer > 0) {
      this.hitboxTimer = Math.max(0, this.hitboxTimer - rawDt);
      if (this.hitboxTimer === 0) this.r = this.baseR;
    }
    if (this.controlDebuffTimer > 0) {
      this.controlDebuffTimer = Math.max(0, this.controlDebuffTimer - rawDt);
      if (this.controlDebuffTimer === 0) this.controlDebuffMult = 1;
    }
  }
  canBeHit() { return !this.down && this.invulnerable <= 0 && this.shieldTimer <= 0; }
  isAlive() { return !this.down && this.lives > 0; }
}
