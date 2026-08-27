import { CONFIG } from '../core/config.js?v=20260827-zjts';

export class SkillSystem {
  constructor(game) { this.game = game; }
  use(player) {
    if (!this.game.state.isPlaying() || !player.isAlive() || player.skillCooldown > 0) return false;
    const skill = player.id === 2 ? this.game.state.skillP2 : this.game.state.skill;
    const fn = this[skill];
    if (typeof fn !== 'function') return false;
    const ok = fn.call(this, player);
    if (ok) this.game.ui?.flashSkill?.(skill);
    return ok;
  }
  finish(player, cooldown) {
    player.skillBaseCooldown = cooldown;
    player.skillCooldown = cooldown;
    // New activation cycle: reset how much of this cooldown has been
    // refunded by grazing so GRAZE_REWARD.maxReduction applies per-cycle.
    player.grazeCooldownReduced = 0;
    return true;
  }
  pulse(player) {
    const radius = CONFIG.skills.pulse.radius;
    this.game.removeBulletsInRadius(player.x, player.y, radius);
    player.invulnerable = 0.18;
    this.game.particles.spawn(player.x, player.y, player.color, 26);
    this.game.state.shakeMag = 6;
    this.game.addSkillEffect('pulse', player, 0.55, { maxRadius: radius });
    return this.finish(player, CONFIG.skills.pulse.cooldown);
  }
  shield(player) {
    player.shieldTimer = CONFIG.skills.shield.duration;
    this.game.particles.spawn(player.x, player.y, player.color, 20);
    this.game.addSkillEffect('shield', player, CONFIG.skills.shield.duration, { maxRadius: 32 });
    return this.finish(player, CONFIG.skills.shield.cooldown);
  }
  slow(player) {
    this.game.state.slowMoRemaining = CONFIG.skills.slow.duration;
    this.game.state.slowScale = CONFIG.skills.slow.scale;
    this.game.particles.spawn(player.x, player.y, player.color, 20);
    this.game.addSkillEffect('slow', player, CONFIG.skills.slow.duration, { maxRadius: 210 });
    return this.finish(player, CONFIG.skills.slow.cooldown);
  }
  nova(player) {
    const radius = CONFIG.skills.nova.radius;
    this.game.removeBulletsInRadius(player.x, player.y, radius);
    player.invulnerable = CONFIG.skills.nova.invulnerability;
    this.game.particles.spawn(player.x, player.y, player.color, 42);
    this.game.state.shakeMag = 8;
    this.game.addSkillEffect('nova', player, 0.75, { maxRadius: radius });
    return this.finish(player, CONFIG.skills.nova.cooldown);
  }
  timestop(player) {
    this.game.state.timeStopRemaining = CONFIG.skills.timestop.duration;
    this.game.particles.spawn(player.x, player.y, player.color, 24);
    this.game.state.shakeMag = 4;
    this.game.addSkillEffect('timestop', player, CONFIG.skills.timestop.duration, { maxRadius: 170 });
    return this.finish(player, CONFIG.skills.timestop.cooldown);
  }
  heal(player) {
    if (player.lives >= CONFIG.lives.max) return false;
    player.lives = Math.min(CONFIG.lives.max, player.lives + 1);
    player.invulnerable = Math.max(player.invulnerable, 0.35);
    this.game.particles.spawn(player.x, player.y, '#7bed9f', 28);
    this.game.addSkillEffect('heal', player, 0.9, { maxRadius: 58 });
    return this.finish(player, CONFIG.skills.heal.cooldown);
  }
  repulse(player) {
    const cfg = CONFIG.skills.repulse;
    const radius = cfg.radius;
    let affected = 0;

    for (const b of this.game.bullets.items) {
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d <= radius + b.r) {
        const safeD = d || 0.001;
        const nx = dx / safeD;
        const ny = dy / safeD;
        const falloff = Math.pow(1 - Math.min(d / radius, 1), 0.65);

        // Give the bullet an immediate outward kick AND a short-lived push.
        // This makes the skill visibly shove bullets away instead of merely
        // changing their trajectory by a small amount.
        const impulse = cfg.minPush + cfg.force * falloff;
        b.vx += nx * impulse;
        b.vy += ny * impulse;
        b.x += nx * (8 + 20 * falloff);
        b.y += ny * (8 + 20 * falloff);
        b.repulseT = 0.22;
        b.repulseStrength = 0.22 + 0.55 * falloff;
        affected++;
      }
    }

    player.invulnerable = 0.25;
    this.game.particles.spawn(player.x, player.y, '#ffd166', 42);
    this.game.state.shakeMag = affected ? 8 : 5;
    this.game.addSkillEffect('repulse', player, 0.65, { maxRadius: radius, affected });
    return this.finish(player, cfg.cooldown);
  }
  phase(player) {
    player.invulnerable = CONFIG.skills.phase.duration;
    this.game.particles.spawn(player.x, player.y, '#c56cf0', 26);
    this.game.addSkillEffect('phase', player, CONFIG.skills.phase.duration, { maxRadius: 42 });
    return this.finish(player, CONFIG.skills.phase.cooldown);
  }
}
