import { CONFIG } from '../core/config.js?v=20260826-eyx3';

export class LifeSystem {
  constructor(game) { this.game = game; }
  hit(player) {
    if (!player.canBeHit()) return false;
    if (player.shieldCharges > 0) {
      // Shield *item* charge absorbs this hit instead of a life. Brief
      // grace invuln (same value as a normal hit) so a cluster of
      // overlapping bullets in one frame can't burn more than one charge
      // at once. Lighter shake/no red flash so it visually reads as
      // "blocked" rather than "damaged".
      player.shieldCharges -= 1;
      player.invulnerable = CONFIG.lives.hitInvulnerability;
      this.game.state.shakeMag = Math.max(this.game.state.shakeMag, 5);
      this.game.particles.spawn(player.x, player.y, '#7bed9f', 16);
      return 'blocked';
    }
    player.lives = Math.max(0, player.lives - 1);
    player.invulnerable = CONFIG.lives.hitInvulnerability;
    player.hitFlash = 0.30;
    this.game.state.shakeMag = 12; this.game.state.damageShake = 0.22;
    this.game.particles.spawnBlood(player.x, player.y, 28, player.skinVisual?.deathEffect);
    if (player.lives <= 0) {
      player.down = true;
      player.reviveProgress = 0;
      if (this.game.allPlayersDown()) this.game.gameOver();
    }
    return true;
  }
  updateRevive(dt) {
    if (this.game.state.mode !== 'coop') return;
    const players = this.game.players;
    for (const down of players) {
      if (!down.down) continue;
      const helper = players.find(p => p !== down && p.isAlive());
      if (!helper || Math.hypot(helper.x - down.x, helper.y - down.y) > CONFIG.revive.radius) {
        down.reviveProgress = Math.max(0, down.reviveProgress - dt * 0.8);
        continue;
      }
      down.reviveProgress += dt;
      if (down.reviveProgress >= CONFIG.revive.duration) {
        down.down = false;
        down.lives = 1;
        down.invulnerable = CONFIG.lives.respawnInvulnerability;
        down.reviveProgress = 0;
        this.game.particles.spawn(down.x, down.y, down.color, 24);
      }
    }
  }
}
